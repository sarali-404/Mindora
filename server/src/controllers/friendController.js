const Friendship = require('../models/Friendship');
const User = require('../models/User');
const socketService = require('../services/socketService');
const notificationService = require('../services/notificationService');

// @desc    Send friend request
// @route   POST /api/friends/request/:userId
// @access  Private
exports.sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user._id;

    // Must be admin-verified to add friends
    if (!req.user.profile?.idPhoto?.verified) {
      return res.status(403).json({
        success: false,
        message: 'Verify your account to add friends.',
        requiresVerification: true
      });
    }
    if (userId === requesterId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a friend request to yourself'
      });
    }

    // Check if recipient exists
    const recipient = await User.findById(userId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.getFriendship(requesterId, userId);
    
    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return res.status(400).json({
          success: false,
          message: 'You are already friends with this user'
        });
      }
      if (existingFriendship.status === 'pending') {
        // Check if current user is the recipient (they should accept instead)
        if (existingFriendship.recipient.toString() === requesterId.toString()) {
          return res.status(400).json({
            success: false,
            message: 'This user has already sent you a friend request. Please accept or decline it.'
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Friend request already sent'
        });
      }
      if (existingFriendship.status === 'blocked') {
        return res.status(403).json({
          success: false,
          message: 'Cannot send friend request to this user'
        });
      }
      if (existingFriendship.status === 'declined') {
        // Update existing declined request to pending
        existingFriendship.requester = requesterId;
        existingFriendship.recipient = userId;
        existingFriendship.status = 'pending';
        await existingFriendship.save();
        
        return res.status(200).json({
          success: true,
          message: 'Friend request sent',
          data: existingFriendship
        });
      }
    }

    // Create new friend request
    const friendship = await Friendship.create({
      requester: requesterId,
      recipient: userId,
      status: 'pending'
    });

    await friendship.populate('recipient', 'username profile.firstName profile.lastName profile.avatar profile.idPhoto');

    // --- Notify recipient ---
    const requesterName = req.user.profile?.firstName
      ? `${req.user.profile.firstName} ${req.user.profile.lastName || ''}`.trim()
      : req.user.username;
    notificationService.notifyFriendRequest(recipient, requesterName)
      .catch(e => console.error('Friend request notification error:', e.message));

    res.status(201).json({
      success: true,
      message: 'Friend request sent',
      data: friendship
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Friend request already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to send friend request',
      error: error.message
    });
  }
};

// @desc    Accept friend request
// @route   PUT /api/friends/accept/:friendshipId
// @access  Private
exports.acceptFriendRequest = async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const userId = req.user._id;

    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    // Only recipient can accept
    if (friendship.recipient.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only accept requests sent to you'
      });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept a ${friendship.status} request`
      });
    }

    friendship.status = 'accepted';
    await friendship.save();

    await friendship.populate('requester', 'username profile.firstName profile.lastName profile.avatar profile.idPhoto isOnline lastSeen');
    await friendship.populate('recipient', 'username profile.firstName profile.lastName profile.avatar profile.idPhoto isOnline lastSeen');

    // --- Notify the original requester that their request was accepted ---
    const accepterName = req.user.profile?.firstName
      ? `${req.user.profile.firstName} ${req.user.profile.lastName || ''}`.trim()
      : req.user.username;
    notificationService.notifyIfPreferred(
      friendship.requester._id,
      'social',
      'inApp.social',
      'Friend Request Accepted',
      `${accepterName} accepted your friend request`,
      { accepterName }
    ).catch(e => console.error('Accept notification error:', e.message));

    res.json({
      success: true,
      message: 'Friend request accepted',
      data: friendship
    });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept friend request',
      error: error.message
    });
  }
};

// @desc    Decline friend request
// @route   PUT /api/friends/decline/:friendshipId
// @access  Private
exports.declineFriendRequest = async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const userId = req.user._id;

    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    // Only recipient can decline
    if (friendship.recipient.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only decline requests sent to you'
      });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot decline a ${friendship.status} request`
      });
    }

    friendship.status = 'declined';
    await friendship.save();

    res.json({
      success: true,
      message: 'Friend request declined'
    });
  } catch (error) {
    console.error('Decline friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline friend request',
      error: error.message
    });
  }
};

// @desc    Cancel sent friend request
// @route   DELETE /api/friends/cancel/:friendshipId
// @access  Private
exports.cancelFriendRequest = async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const userId = req.user._id;

    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    // Only requester can cancel
    if (friendship.requester.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel requests you sent'
      });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ${friendship.status} request`
      });
    }

    await friendship.deleteOne();

    res.json({
      success: true,
      message: 'Friend request cancelled'
    });
  } catch (error) {
    console.error('Cancel friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel friend request',
      error: error.message
    });
  }
};

// @desc    Unfriend a user
// @route   DELETE /api/friends/unfriend/:userId
// @access  Private
exports.unfriend = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const friendship = await Friendship.getFriendship(currentUserId, userId);

    if (!friendship || friendship.status !== 'accepted') {
      return res.status(404).json({
        success: false,
        message: 'Friendship not found'
      });
    }

    await friendship.deleteOne();

    // Notify the unfriended user
    const currentUser = await User.findById(currentUserId).select('username profile.firstName profile.lastName');
    const displayName = currentUser.profile?.firstName 
      ? `${currentUser.profile.firstName} ${currentUser.profile.lastName || ''}`.trim()
      : currentUser.username;

    socketService.sendToUser(userId, 'friend_removed', {
      userId: currentUserId.toString(),
      username: currentUser.username,
      displayName
    });

    res.json({
      success: true,
      message: 'Successfully unfriended'
    });
  } catch (error) {
    console.error('Unfriend error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unfriend',
      error: error.message
    });
  }
};

// @desc    Block a user
// @route   POST /api/friends/block/:userId
// @access  Private
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself'
      });
    }

    let friendship = await Friendship.getFriendship(currentUserId, userId);

    if (friendship) {
      friendship.status = 'blocked';
      friendship.blockedBy = currentUserId;
      await friendship.save();
    } else {
      friendship = await Friendship.create({
        requester: currentUserId,
        recipient: userId,
        status: 'blocked',
        blockedBy: currentUserId
      });
    }

    res.json({
      success: true,
      message: 'User blocked'
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block user',
      error: error.message
    });
  }
};

// @desc    Unblock a user
// @route   DELETE /api/friends/unblock/:userId
// @access  Private
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const friendship = await Friendship.getFriendship(currentUserId, userId);

    if (!friendship || friendship.status !== 'blocked') {
      return res.status(404).json({
        success: false,
        message: 'User is not blocked'
      });
    }

    // Only the blocker can unblock
    if (friendship.blockedBy.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You cannot unblock this user'
      });
    }

    await friendship.deleteOne();

    res.json({
      success: true,
      message: 'User unblocked'
    });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unblock user',
      error: error.message
    });
  }
};

// @desc    Get all friends
// @route   GET /api/friends
// @access  Private
exports.getFriends = async (req, res) => {
  try {
    const userId = req.user._id;
    const friends = await Friendship.getFriends(userId);

    res.json({
      success: true,
      data: friends
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get friends',
      error: error.message
    });
  }
};

// @desc    Get pending friend requests (received)
// @route   GET /api/friends/requests/pending
// @access  Private
exports.getPendingRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const requests = await Friendship.getPendingRequests(userId);

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending requests',
      error: error.message
    });
  }
};

// @desc    Get sent friend requests
// @route   GET /api/friends/requests/sent
// @access  Private
exports.getSentRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const requests = await Friendship.getSentRequests(userId);

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get sent requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sent requests',
      error: error.message
    });
  }
};

// @desc    Get friendship status with a user
// @route   GET /api/friends/status/:userId
// @access  Private
exports.getFriendshipStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const friendship = await Friendship.getFriendship(currentUserId, userId);

    if (!friendship) {
      return res.json({
        success: true,
        data: { status: 'none' }
      });
    }

    let status = friendship.status;
    let isRequester = friendship.requester.toString() === currentUserId.toString();

    res.json({
      success: true,
      data: {
        status,
        friendshipId: friendship._id,
        isRequester,
        blockedBy: friendship.blockedBy
      }
    });
  } catch (error) {
    console.error('Get friendship status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get friendship status',
      error: error.message
    });
  }
};

// @desc    Discover users (for making friends)
// @route   GET /api/friends/discover
// @access  Private
exports.discoverUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const currentUserId = req.user._id;

    // Build query - exclude current user
    const query = { _id: { $ne: currentUserId }, isActive: true };

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { 'profile.university': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .select('username profile.firstName profile.lastName profile.avatar profile.university profile.bio profile.idPhoto isOnline lastSeen verificationStatus')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ lastSeen: -1 });

    // Get friendship status for each user
    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        const friendship = await Friendship.getFriendship(currentUserId, user._id);
        
        let friendshipStatus = 'none';
        let friendshipId = null;
        let isRequester = false;

        if (friendship) {
          friendshipStatus = friendship.status;
          friendshipId = friendship._id;
          isRequester = friendship.requester.toString() === currentUserId.toString();
        }

        return {
          ...user.toObject(),
          friendshipStatus,
          friendshipId,
          isRequester
        };
      })
    );

    res.json({
      success: true,
      data: usersWithStatus,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Discover users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to discover users',
      error: error.message
    });
  }
};

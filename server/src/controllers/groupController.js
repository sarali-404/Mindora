const GroupConversation = require('../models/GroupConversation');
const GroupMessage = require('../models/GroupMessage');
const Friendship = require('../models/Friendship');
const socketService = require('../services/socketService');
const fs = require('fs');
const path = require('path');

// @desc    Create a new group conversation
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    const creatorId = req.user._id;

    // Must be admin-verified to create group chats
    if (!req.user.profile?.idPhoto?.verified) {
      return res.status(403).json({
        success: false,
        message: 'Verify your account to create group chats.',
        requiresVerification: true
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one member is required' });
    }

    // Deduplicate and exclude the creator (they are added automatically)
    const uniqueMembers = [...new Set(memberIds.map(String))].filter(
      id => id !== creatorId.toString()
    );

    if (uniqueMembers.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one other member is required' });
    }

    // Validate all members are friends of the creator
    const friendChecks = await Promise.all(
      uniqueMembers.map(memberId => Friendship.areFriends(creatorId, memberId))
    );
    const invalidIndex = friendChecks.findIndex(isFriend => !isFriend);
    if (invalidIndex !== -1) {
      return res.status(403).json({
        success: false,
        message: 'You can only add friends to a group'
      });
    }

    const allMembers = [creatorId, ...uniqueMembers];

    const group = await GroupConversation.create({
      name: name.trim(),
      creator: creatorId,
      members: allMembers
    });

    const populated = await group.populate('members', 'username profile.firstName profile.lastName profile.avatar isOnline');
    const populatedGroup = await populated.populate('creator', 'username profile.firstName profile.lastName profile.avatar');

    // Add all members (except creator) to socket room and notify them
    for (const memberId of uniqueMembers) {
      socketService.addUserToGroupRoom(memberId, group._id.toString());
      socketService.sendToUser(memberId, 'group_joined', {
        group: populatedGroup
      });
    }
    // Add creator to socket room too
    socketService.addUserToGroupRoom(creatorId.toString(), group._id.toString());

    res.status(201).json({ success: true, data: populatedGroup });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ success: false, message: 'Failed to create group', error: error.message });
  }
};

// @desc    Get all groups the current user belongs to
// @route   GET /api/groups
// @access  Private
exports.getMyGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await GroupConversation.find({ members: userId })
      .sort({ lastMessageAt: -1 })
      .populate('members', 'username profile.firstName profile.lastName profile.avatar isOnline')
      .populate('creator', 'username profile.firstName profile.lastName profile.avatar');

    res.json({ success: true, data: groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ success: false, message: 'Failed to get groups', error: error.message });
  }
};

// @desc    Get messages for a group (paginated)
// @route   GET /api/groups/:groupId/messages
// @access  Private
exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    const group = await GroupConversation.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isMember = group.members.some(m => m.toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await GroupMessage.find({
      groupId,
      deletedForEveryone: false
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', 'username profile.firstName profile.lastName profile.avatar')
      .populate('replyTo', 'content sender attachment deletedForEveryone');

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to get messages', error: error.message });
  }
};

// @desc    Send a message to a group
// @route   POST /api/groups/:groupId/messages
// @access  Private
exports.sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const senderId = req.user._id;
    const { content } = req.body;

    if (!content && !req.file) {
      return res.status(400).json({ success: false, message: 'Message content or attachment is required' });
    }

    if (content && content.length > 2000) {
      return res.status(400).json({ success: false, message: 'Message cannot exceed 2000 characters' });
    }

    const group = await GroupConversation.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isMember = group.members.some(m => m.toString() === senderId.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    const messageData = {
      groupId,
      sender: senderId,
      content: content || ''
    };

    // Handle reply-to reference
    if (req.body.replyTo) {
      messageData.replyTo = req.body.replyTo;
    }

    if (req.file) {
      const fileType = req.file.mimetype.startsWith('image/') ? 'image'
        : req.file.mimetype.includes('pdf') || req.file.mimetype.includes('document') ? 'document'
        : 'other';

      messageData.attachment = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        type: fileType
      };
    }

    const message = await GroupMessage.create(messageData);
    await message.populate('sender', 'username profile.firstName profile.lastName profile.avatar');
    await message.populate('replyTo', 'content sender attachment deletedForEveryone');

    // Update group's last message preview
    const preview = content
      ? content.substring(0, 100)
      : `${req.user.username} sent an attachment`;
    await GroupConversation.findByIdAndUpdate(groupId, {
      lastMessageAt: new Date(),
      lastMessagePreview: preview
    });

    // Broadcast to all group members via socket room
    socketService.sendToGroup(groupId, 'new_group_message', {
      groupId,
      message
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, err => { if (err) console.error('Error deleting file:', err); });
    }
    console.error('Send group message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message', error: error.message });
  }
};

// @desc    Add a member to a group (creator only)
// @route   POST /api/groups/:groupId/members
// @access  Private
exports.addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user._id;

    const group = await GroupConversation.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (group.creator.toString() !== requesterId.toString()) {
      return res.status(403).json({ success: false, message: 'Only the group creator can add members' });
    }

    if (group.members.some(m => m.toString() === userId)) {
      return res.status(400).json({ success: false, message: 'User is already a member' });
    }

    const areFriends = await Friendship.areFriends(requesterId, userId);
    if (!areFriends) {
      return res.status(403).json({ success: false, message: 'You can only add friends to a group' });
    }

    group.members.push(userId);
    await group.save();

    const populated = await GroupConversation.findById(groupId)
      .populate('members', 'username profile.firstName profile.lastName profile.avatar isOnline')
      .populate('creator', 'username profile.firstName profile.lastName profile.avatar');

    // Add user to socket room and notify them
    socketService.addUserToGroupRoom(userId, groupId);
    socketService.sendToUser(userId, 'group_joined', { group: populated });

    res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ success: false, message: 'Failed to add member', error: error.message });
  }
};

// @desc    Leave a group
// @route   DELETE /api/groups/:groupId/leave
// @access  Private
exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await GroupConversation.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.members.some(m => m.toString() === userId.toString())) {
      return res.status(400).json({ success: false, message: 'You are not a member of this group' });
    }

    // Remove the user from members
    group.members = group.members.filter(m => m.toString() !== userId.toString());

    if (group.members.length === 0) {
      // Delete group and all messages when last member leaves
      await GroupMessage.deleteMany({ groupId });
      await group.deleteOne();
      return res.json({ success: true, message: 'Group deleted (no members remaining)' });
    }

    // Transfer ownership if creator is leaving
    if (group.creator.toString() === userId.toString()) {
      group.creator = group.members[0];
    }

    await group.save();

    // Remove user from socket room
    socketService.removeUserFromGroupRoom(userId.toString(), groupId);
    // Notify user they left
    socketService.sendToUser(userId.toString(), 'group_left', { groupId });

    res.json({ success: true, message: 'Left group successfully' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ success: false, message: 'Failed to leave group', error: error.message });
  }
};

// @desc    Update group name and/or icon (creator only)
// @route   PATCH /api/groups/:groupId
// @access  Private
exports.updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name } = req.body;
    const requesterId = req.user._id;

    const group = await GroupConversation.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (group.creator.toString() !== requesterId.toString()) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(403).json({ success: false, message: 'Only the group creator can update the group' });
    }

    if (name && name.trim()) {
      group.name = name.trim();
    }

    if (req.file) {
      // Delete old icon file if it was a local upload
      if (group.icon) {
        const oldIconPath = path.join(__dirname, '../../uploads/groups', path.basename(group.icon));
        if (fs.existsSync(oldIconPath)) {
          fs.unlink(oldIconPath, err => { if (err) console.error('Error deleting old icon:', err); });
        }
      }
      group.icon = `/uploads/groups/${req.file.filename}`;
    }

    await group.save();

    const populated = await GroupConversation.findById(groupId)
      .populate('members', 'username profile.firstName profile.lastName profile.avatar isOnline')
      .populate('creator', 'username profile.firstName profile.lastName profile.avatar');

    // Notify all members of the change
    socketService.sendToGroup(groupId, 'group_updated', { group: populated });

    res.json({ success: true, data: populated });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    console.error('Update group error:', error);
    res.status(500).json({ success: false, message: 'Failed to update group', error: error.message });
  }
};

// @desc    Remove a member from a group (creator only)
// @route   DELETE /api/groups/:groupId/members/:userId
// @access  Private
exports.removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const requesterId = req.user._id;

    const group = await GroupConversation.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (group.creator.toString() !== requesterId.toString()) {
      return res.status(403).json({ success: false, message: 'Only the group creator can remove members' });
    }

    if (userId === requesterId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot remove yourself — use leave group instead' });
    }

    if (!group.members.some(m => m.toString() === userId)) {
      return res.status(400).json({ success: false, message: 'User is not a member of this group' });
    }

    group.members = group.members.filter(m => m.toString() !== userId);
    await group.save();

    // Remove user from socket room and notify them
    socketService.removeUserFromGroupRoom(userId, groupId);
    socketService.sendToUser(userId, 'group_left', { groupId });

    const populated = await GroupConversation.findById(groupId)
      .populate('members', 'username profile.firstName profile.lastName profile.avatar isOnline')
      .populate('creator', 'username profile.firstName profile.lastName profile.avatar');

    socketService.sendToGroup(groupId, 'group_updated', { group: populated });

    res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove member', error: error.message });
  }
};

// @desc    Get a group message attachment file
// @route   GET /api/groups/attachment/:filename
// @access  Private
exports.getGroupAttachment = async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user._id;

    // Find the group message with this attachment
    const message = await GroupMessage.findOne({
      'attachment.filename': filename,
      deletedForEveryone: false,
    });

    if (!message) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    // Verify the requesting user is a member of the group
    const group = await GroupConversation.findById(message.groupId);
    if (!group || !group.members.some(m => m.toString() === userId.toString())) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const filePath = path.join(__dirname, '../../uploads/chat', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Get group attachment error:', error);
    res.status(500).json({ success: false, message: 'Failed to get attachment', error: error.message });
  }
};

// @desc    Toggle emoji reaction on a group message
// @route   POST /api/groups/message/:messageId/reaction
// @access  Private
exports.toggleGroupReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required' });
    }

    const message = await GroupMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Check the user is a member of the group
    const group = await GroupConversation.findById(message.groupId);
    if (!group || !group.members.some(m => m.toString() === userId.toString())) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Toggle the reaction
    let reaction = message.reactions.find(r => r.emoji === emoji);
    if (!reaction) {
      message.reactions.push({ emoji, users: [userId] });
    } else {
      const idx = reaction.users.findIndex(u => u.toString() === userId.toString());
      if (idx === -1) {
        reaction.users.push(userId);
      } else {
        reaction.users.splice(idx, 1);
        if (reaction.users.length === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      }
    }

    await message.save();

    // Serialize reactions to plain objects so Socket.IO sends clean JSON
    const plainReactions = message.reactions.map(r => ({
      _id: r._id.toString(),
      emoji: r.emoji,
      users: r.users.map(u => u.toString())
    }));

    // Broadcast updated reactions to all group members
    socketService.sendToGroup(message.groupId.toString(), 'group_message_reaction', {
      messageId,
      reactions: plainReactions
    });

    res.json({ success: true, data: plainReactions });
  } catch (error) {
    console.error('Toggle group reaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle reaction', error: error.message });
  }
};

const User = require('../models/User');
const Goal = require('../models/Goal');
const Material = require('../models/Material');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get user profile
// @route   GET /api/users/:id
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user profile.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      bio,
      dateOfBirth,
      phone,
      gender,
      university,
      city,
      degreeProgram,
      studyYear,
      avatar
    } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    // Update profile fields
    if (firstName !== undefined) user.profile.firstName = firstName;
    if (lastName !== undefined) user.profile.lastName = lastName;
    if (bio !== undefined) user.profile.bio = bio;
    if (dateOfBirth !== undefined) user.profile.dateOfBirth = dateOfBirth;
    if (phone !== undefined) user.profile.phone = phone;
    if (gender !== undefined) user.profile.gender = gender;
    if (university !== undefined) user.profile.university = university;
    if (city !== undefined) user.profile.city = city;
    if (degreeProgram !== undefined) user.profile.degreeProgram = degreeProgram;
    if (studyYear !== undefined) user.profile.studyYear = studyYear;
    if (avatar !== undefined) user.profile.avatar = avatar;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Upload ID photo
// @route   POST /api/users/id-photo
// @access  Private
const uploadIDPhoto = async (req, res) => {
  try {
    const { idPhotoUrl } = req.body;
    
    if (!idPhotoUrl) {
      return res.status(400).json({
        success: false,
        message: 'ID photo URL is required.'
      });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    user.profile.idPhoto = {
      url: idPhotoUrl,
      uploadedAt: new Date(),
      verified: false
    };
    
    await user.save();
    
    res.json({
      success: true,
      message: 'ID photo uploaded successfully.',
      data: { idPhoto: user.profile.idPhoto }
    });
  } catch (error) {
    console.error('Upload ID photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading ID photo.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    
    const filters = {};
    if (search) {
      filters.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const [users, total] = await User.getPaginated(page, limit, filters);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving users.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    await user.deleteOne();
    
    res.json({
      success: true,
      message: 'User deleted successfully.'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Upload profile picture
// @route   POST /api/users/profile-picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded.'
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Store the path to the uploaded file
    const avatarPath = `/uploads/profile-pictures/${req.file.filename}`;
    user.profile.avatar = avatarPath;
    await user.save();

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully.',
      data: {
        avatar: avatarPath
      }
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading profile picture.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user stats (goals achieved, hours studied, etc.)
// @route   GET /api/users/stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [goalsAchieved, activeGoals, materialsUploaded, durationAgg] = await Promise.all([
      Goal.countDocuments({ user: userId, status: 'completed' }),
      Goal.countDocuments({ user: userId, status: 'active' }),
      Material.countDocuments({ author: userId, status: 'active' }),
      ActivityLog.aggregate([
        { $match: { user: userId, 'data.duration': { $exists: true } } },
        { $group: { _id: null, totalSeconds: { $sum: '$data.duration' } } }
      ])
    ]);

    const totalSeconds = durationAgg[0]?.totalSeconds || 0;
    const hoursStudied = Math.round(totalSeconds / 3600);

    res.json({
      success: true,
      data: { goalsAchieved, hoursStudied, materialsUploaded, activeGoals }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get stats' });
  }
};

/**
 * Get user storage usage — sum of all uploaded material file sizes
 * @route GET /api/users/storage
 * @access Private
 */
const getUserStorage = async (req, res) => {
  try {
    const userId = req.user._id;

    // Sum sizes of all material files uploaded by this user via goals
    const result = await Goal.aggregate([
      { $match: { user: userId } },
      { $unwind: '$materials' },
      { $group: { _id: null, totalBytes: { $sum: '$materials.size' } } }
    ]);

    const totalBytes = result[0]?.totalBytes || 0;
    const limitBytes = 500 * 1024 * 1024; // 500 MB per-user cap
    const usedMB = +(totalBytes / (1024 * 1024)).toFixed(1);
    const limitMB = limitBytes / (1024 * 1024);
    const pct = Math.min(Math.round((totalBytes / limitBytes) * 100), 100);

    res.json({ success: true, data: { totalBytes, usedMB, limitMB, pct } });
  } catch (error) {
    console.error('Get user storage error:', error);
    res.status(500).json({ success: false, message: 'Failed to get storage info' });
  }
};

// @desc    Upload ID photo as a file (for profile verification)
// @route   POST /api/users/upload-id-photo
// @access  Private
const uploadIDPhotoFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Block re-upload if already admin-approved
    if (user.profile?.idPhoto?.verified === true) {
      return res.status(400).json({ success: false, message: 'Your ID has already been verified.' });
    }

    const idPhotoPath = `/uploads/id-photos/${req.file.filename}`;

    user.profile.idPhoto = { url: idPhotoPath, uploadedAt: new Date(), verified: false };
    user.verificationStatus = 'verified'; // queue for admin review
    user.verificationMessage = undefined;

    await user.save();

    res.json({
      success: true,
      message: 'ID photo submitted for review.',
      data: { idPhoto: user.profile.idPhoto, verificationStatus: user.verificationStatus }
    });
  } catch (error) {
    console.error('Upload ID photo file error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading ID photo.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  uploadIDPhoto,
  uploadIDPhotoFile,
  getAllUsers,
  deleteUser,
  uploadProfilePicture,
  getUserStats,
  getUserStorage
};
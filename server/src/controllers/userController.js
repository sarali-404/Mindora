const User = require('../models/User');

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

module.exports = {
  getUserProfile,
  updateUserProfile,
  uploadIDPhoto,
  getAllUsers,
  deleteUser
};
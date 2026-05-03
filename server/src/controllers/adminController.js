const User = require('../models/User');
const Admin = require('../models/Admin');
const Session = require('../models/Session');
const Material = require('../models/Material');
const { sendVerificationStatusEmail } = require('../services/emailService');
const { generateAdminToken } = require('../middleware/adminAuth');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      awaitingReview,
      totalSessions,
      totalMaterials,
      rejectedUsers,
      verifiedUsers,
    ] = await Promise.all([
      User.countDocuments(),  // all users (User collection only)
      User.countDocuments({ verificationStatus: 'verified', 'profile.idPhoto.verified': false }),
      Session.countDocuments(),
      Material.countDocuments(),
      User.countDocuments({ verificationStatus: 'rejected' }),
      User.countDocuments({ verificationStatus: 'verified', 'profile.idPhoto.verified': true }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        awaitingReview,
        totalSessions,
        totalMaterials,
        rejectedUsers,
        verifiedUsers,
      },
    });
  } catch (error) {
    console.error('Admin getDashboardStats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching stats.' });
  }
};

// @desc    Get users awaiting ID verification
// @route   GET /api/admin/pending-verifications
// @access  Admin
const getPendingVerifications = async (req, res) => {
  try {
    const users = await User.find({
      verificationStatus: 'verified',
      'profile.idPhoto.verified': false,
      'profile.idPhoto.url': { $exists: true, $ne: null },
    })
      .select('username email profile.firstName profile.lastName profile.idPhoto profile.verificationDocs profile.university createdAt')
      .sort({ 'profile.idPhoto.uploadedAt': 1 }) // oldest first
      .lean();

    res.json({ success: true, data: { users } });
  } catch (error) {
    console.error('Admin getPendingVerifications error:', error);
    res.status(500).json({ success: false, message: 'Error fetching pending verifications.' });
  }
};

// @desc    Approve a user's ID verification
// @route   POST /api/admin/verify/:userId/approve
// @access  Admin
const approveVerification = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.profile.idPhoto.verified = true;
    user.verifiedAt = new Date();
    user.verifiedBy = req.admin._id;
    await user.save();

    // Fire-and-forget email
    sendVerificationStatusEmail(
      user.email,
      user.profile.firstName || user.username,
      'verified',
      ''
    ).catch((e) => console.error('Approval email error:', e.message));

    res.json({ success: true, message: `${user.username} approved successfully.` });
  } catch (error) {
    console.error('Admin approveVerification error:', error);
    res.status(500).json({ success: false, message: 'Error approving verification.' });
  }
};

// @desc    Reject a user's ID verification
// @route   POST /api/admin/verify/:userId/reject
// @access  Admin
const rejectVerification = async (req, res) => {
  try {
    const { message } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.verificationStatus = 'rejected';
    user.verificationMessage = message || 'Your ID could not be verified.';
    user.profile.idPhoto.verified = false;
    await user.save();

    // Fire-and-forget email
    sendVerificationStatusEmail(
      user.email,
      user.profile.firstName || user.username,
      'rejected',
      message || ''
    ).catch((e) => console.error('Rejection email error:', e.message));

    res.json({ success: true, message: `${user.username} rejected.` });
  } catch (error) {
    console.error('Admin rejectVerification error:', error);
    res.status(500).json({ success: false, message: 'Error rejecting verification.' });
  }
};

// @desc    Get all users (paginated, searchable, filterable)
// @route   GET /api/admin/users
// @access  Admin
const getAllUsersAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const statusFilter = req.query.status || '';

    const filters = {};

    if (search) {
      filters.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
      ];
    }

    if (statusFilter) {
      filters.verificationStatus = statusFilter;
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filters)
        .select('username email role verificationStatus isActive profile.firstName profile.lastName profile.avatar profile.university profile.idPhoto profile.verificationDocs createdAt lastLogin')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filters),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin getAllUsersAdmin error:', error);
    res.status(500).json({ success: false, message: 'Error fetching users.' });
  }
};

// @desc    Toggle a user's active status
// @route   PATCH /api/admin/users/:userId/toggle-active
// @access  Admin
const toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot deactivate admin accounts.' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `${user.username} ${user.isActive ? 'activated' : 'deactivated'}.`,
      data: { isActive: user.isActive },
    });
  } catch (error) {
    console.error('Admin toggleUserActive error:', error);
    res.status(500).json({ success: false, message: 'Error toggling user status.' });
  }
};

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const admin = await Admin.findOne({ username: username.toLowerCase().trim() }).select('+password');
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const valid = await admin.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateAdminToken(admin._id);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        admin: { id: admin._id, username: admin.username },
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
};

// @desc    Create a new admin account
// @route   POST /api/admin/create
// @access  Admin
const createAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const exists = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Username already taken.' });
    }

    const admin = await Admin.create({ username: username.toLowerCase().trim(), password });

    res.status(201).json({
      success: true,
      message: 'Admin account created.',
      data: { id: admin._id, username: admin.username },
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to create admin.' });
  }
};

module.exports = {
  adminLogin,
  createAdmin,
  getDashboardStats,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  getAllUsersAdmin,
  toggleUserActive,
};

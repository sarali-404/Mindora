const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/adminAuth');
const {
  adminLogin,
  createAdmin,
  getDashboardStats,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  getAllUsersAdmin,
  toggleUserActive,
} = require('../controllers/adminController');

// Public: admin login
router.post('/login', adminLogin);

// All routes below require a valid admin JWT
router.use(authenticateAdmin);

router.post('/create', createAdmin);
router.get('/stats', getDashboardStats);
router.get('/pending-verifications', getPendingVerifications);
router.post('/verify/:userId/approve', approveVerification);
router.post('/verify/:userId/reject', rejectVerification);
router.get('/users', getAllUsersAdmin);
router.patch('/users/:userId/toggle-active', toggleUserActive);

module.exports = router;

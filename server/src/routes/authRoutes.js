const express = require('express');
const {
  createAccount,
  register,
  login,
  logout,
  getCurrentUser,
  refreshToken,
  changePassword,
  googleAuth,
  updateProfile,
  checkVerificationStatus
} = require('../controllers/authController');

const { authenticate, authorize } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validatePasswordChange,
  handleValidationErrors
} = require('../middleware/validation');

const router = express.Router();

// Public routes - Account Creation (Step 1)
router.post('/create-account', createAccount);

// Legacy register endpoint
router.post('/register', [
  validateRegister,
  handleValidationErrors
], register);

router.post('/login', [
  validateLogin,
  handleValidationErrors
], login);

// Google OAuth routes
router.post('/google', googleAuth);

// Profile update (Steps 2-4)
router.put('/update-profile', updateProfile);

// Check verification status
router.get('/verification-status/:userId', checkVerificationStatus);

router.post('/refresh', refreshToken);

// Protected routes
router.use(authenticate); // All routes below this middleware require authentication

router.post('/logout', logout);
router.get('/me', getCurrentUser);
router.put('/change-password', [
  validatePasswordChange,
  handleValidationErrors
], changePassword);

// Admin only routes
router.post('/register/admin', [
  authorize('admin'),
  validateRegister,
  handleValidationErrors
], register);

module.exports = router;
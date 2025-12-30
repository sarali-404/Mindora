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
  checkVerificationStatus,
  verifyOTP,
  resendOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword
} = require('../controllers/authController');

const { authenticate, authorize } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validatePasswordChange,
  handleValidationErrors
} = require('../middleware/validation');

// Import email service for testing
const { sendOTPEmail, generateOTP } = require('../services/emailService');

const router = express.Router();

// Test email endpoint (REMOVE IN PRODUCTION)
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    console.log('📧 Testing email to:', email);
    const otp = generateOTP();
    console.log('📧 Generated OTP:', otp);
    
    const result = await sendOTPEmail(email, otp, 'Test User');
    console.log('📧 Email result:', result);
    
    res.json({ 
      success: true, 
      message: 'Test email sent!',
      data: result
    });
  } catch (error) {
    console.error('📧 Test email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

// Public routes - Account Creation (Step 1)
router.post('/create-account', createAccount);

// OTP Verification
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Forgot Password Routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);

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
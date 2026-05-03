const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const { 
  generateToken, 
  generateRefreshToken, 
  setTokenCookie, 
  clearTokenCookie,
  verifyToken 
} = require('../utils/tokenUtils');
const { generateOTP, sendOTPEmail, sendWelcomeEmail, sendPasswordResetOTP } = require('../services/emailService');
const gamificationService = require('../services/gamificationService');

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Create account (Step 1) - Email/Password
// @route   POST /api/auth/create-account
// @access  Public
const createAccount = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }
    
    // Validate password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      // If user exists but email not verified, resend OTP
      if (existingUser.verificationStatus === 'unverified' && !existingUser.isEmailVerified) {
        const otp = generateOTP();
        existingUser.emailOTP = {
          code: otp,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        };
        await existingUser.save();
        
        // Send OTP email
        await sendOTPEmail(existingUser.email, otp);
        
        return res.status(200).json({
          success: true,
          message: 'OTP sent to your email. Please verify.',
          data: {
            userId: existingUser._id,
            email: existingUser.email,
            requiresOTP: true
          }
        });
      }
      
      // If email verified but profile incomplete
      if (existingUser.verificationStatus === 'email_verified' && existingUser.registrationStep < 4) {
        return res.status(200).json({
          success: true,
          message: 'Account exists. Please continue with profile setup.',
          data: {
            userId: existingUser._id,
            email: existingUser.email,
            registrationStep: existingUser.registrationStep,
            continueRegistration: true
          }
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please login instead.'
      });
    }
    
    // Generate username from email
    const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = baseUsername;
    let counter = 1;
    
    // Ensure unique username
    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Create user with unverified status
    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      authProvider: 'local',
      verificationStatus: 'unverified',
      isEmailVerified: false,
      registrationStep: 1,
      emailOTP: {
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });
    
    await user.save();
    
    // Send OTP email
    let emailSent = false;
    try {
      console.log('📧 Attempting to send OTP email to:', email);
      const result = await sendOTPEmail(email, otp);
      console.log('📧 OTP email sent successfully:', result);
      emailSent = true;
    } catch (emailError) {
      console.error('📧 Failed to send OTP email:', emailError.message);
      console.error('📧 Full error:', emailError);
      // Don't fail registration, but let frontend know
    }
    
    res.status(201).json({
      success: true,
      message: emailSent 
        ? 'Account created! Please check your email for the verification code.'
        : 'Account created! We had trouble sending the verification email. Please try resending.',
      data: {
        userId: user._id,
        email: user.email,
        username: user.username,
        requiresOTP: true
      }
    });
    
  } catch (error) {
    console.error('Create account error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `An account with this ${field} already exists.`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating account.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Google OAuth - Create account or login
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required.'
      });
    }
    
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture, email_verified } = payload;
    
    // Check if user exists
    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }]
    });
    
    if (user) {
      // User exists - check their status
      
      // If unverified (email not verified), mark as email_verified since Google verified it
      if (user.verificationStatus === 'unverified') {
        user.googleId = googleId;
        user.authProvider = 'google';
        user.isEmailVerified = true;
        user.verificationStatus = 'email_verified';
        user.emailOTP = undefined; // Clear any pending OTP
        await user.save();
        
        return res.status(200).json({
          success: true,
          message: 'Please complete your profile.',
          data: {
            userId: user._id,
            email: user.email,
            username: user.username,
            profile: user.profile,
            registrationStep: user.registrationStep || 2,
            continueRegistration: true
          }
        });
      }
      
      // If email_verified but profile incomplete, let them continue
      if (user.verificationStatus === 'email_verified' && user.registrationStep < 4) {
        // Update Google ID if not set
        if (!user.googleId) {
          user.googleId = googleId;
          user.authProvider = 'google';
          await user.save();
        }
        
        return res.status(200).json({
          success: true,
          message: 'Please complete your profile.',
          data: {
            userId: user._id,
            email: user.email,
            username: user.username,
            profile: user.profile,
            registrationStep: user.registrationStep || 2,
            continueRegistration: true
          }
        });
      }
      
      // If pending verification
      if (user.verificationStatus === 'pending') {
        return res.status(200).json({
          success: true,
          message: 'Your account is pending verification.',
          data: {
            userId: user._id,
            email: user.email,
            verificationStatus: 'pending',
            pendingVerification: true
          }
        });
      }
      
      // Rejected users may still log in — they land on the app with limited access

      // If verified - log them in
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
      
      const token = generateToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id);
      setTokenCookie(res, token);
      
      await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

      // Fire-and-forget: ensure game profile exists and evaluate for welcome_aboard
      gamificationService.initializeGameProfile(user._id)
        .then(() => gamificationService.evaluateAchievements(user._id))
        .catch(e => console.error('Gamification login check error:', e.message));

      return res.json({
        success: true,
        message: 'Login successful.',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            verificationStatus: user.verificationStatus,
            profile: user.profile,
            lastLogin: new Date()
          },
          token,
          refreshToken,
          isLoggedIn: true
        }
      });
    }
    
    // New user - create account with email_verified status (Google verifies email)
    const nameParts = name ? name.split(' ') : [''];
    const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = baseUsername;
    let counter = 1;
    
    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }
    
    user = new User({
      username,
      email: email.toLowerCase(),
      googleId,
      authProvider: 'google',
      verificationStatus: 'email_verified', // Google users have verified email
      registrationStep: 2,
      isEmailVerified: true, // Google verifies email
      profile: {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        avatar: picture || null
      }
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'Account created. Please complete your profile.',
      data: {
        userId: user._id,
        email: user.email,
        username: user.username,
        profile: user.profile,
        registrationStep: 2, // Move to step 2
        continueRegistration: true
      }
    });
    
  } catch (error) {
    console.error('Google auth error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error with Google authentication.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update profile (Steps 2-4)
// @route   PUT /api/auth/update-profile
// @access  Public (requires userId)
const updateProfile = async (req, res) => {
  try {
    const { userId, step, profileData, idPhoto, verificationDocuments } = req.body;
    
    console.log('Update profile request:', { userId, step, profileData });
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.'
      });
    }
    
    const user = await User.findById(userId);
    console.log('Found user:', user ? user._id : 'NOT FOUND');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    if (user.verificationStatus === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Profile is already verified.'
      });
    }
    
    // Update profile based on step - use direct assignment instead of spread
    switch (step) {
      case 2:
        // Academic Details
        user.profile.university = profileData.university;
        user.profile.city = profileData.city;
        user.profile.degreeProgram = profileData.degreeProgram;
        user.profile.studyYear = profileData.studyYear;
        user.registrationStep = 3;
        break;
        
      case 3:
        // Additional Info
        user.profile.firstName = profileData.firstName || user.profile.firstName;
        user.profile.lastName = profileData.lastName || user.profile.lastName;
        user.profile.dateOfBirth = profileData.birthday;
        user.profile.gender = profileData.gender;
        user.profile.howDidYouKnow = profileData.howDidYouKnow;
        user.registrationStep = 4;
        break;
        
      case 4:
        // ID Verification - Final Step (multi-document)
        if (!verificationDocuments || !Array.isArray(verificationDocuments) || verificationDocuments.length < 2) {
          return res.status(400).json({
            success: false,
            message: 'Please upload your Student ID and at least one university document.'
          });
        }
        if (verificationDocuments[0].docType !== 'student_id' || !verificationDocuments[0].data) {
          return res.status(400).json({
            success: false,
            message: 'A Student ID photo is required as the first document.'
          });
        }
        // Primary doc → profile.idPhoto (keeps all existing .verified checks working)
        user.profile.idPhoto = {
          url: verificationDocuments[0].data,
          uploadedAt: new Date(),
          verified: false
        };
        // Additional docs → profile.verificationDocs
        user.profile.verificationDocs = verificationDocuments.slice(1).map(d => ({
          docType: d.docType,
          url: d.data,
          uploadedAt: new Date()
        }));
        user.registrationStep = 4;
        user.verificationStatus = 'verified'; // ID submitted, waiting for admin approval
        break;
      
      case 'skip':
        // User skipped ID verification - they can still use basic features
        // Status remains email_verified, they can verify ID later
        user.registrationStep = 4;
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid step.'
        });
    }
    
    console.log('Saving user with profile:', user.profile);
    await user.save();
    console.log('User saved successfully');
    
    // If step 4 completed (either verified or skipped)
    if (step === 4 || step === 'skip') {
      const isSkipped = step === 'skip';

      // Fire-and-forget: initialize game profile and award welcome_aboard
      gamificationService.initializeGameProfile(user._id)
        .then(() => gamificationService.evaluateAchievements(user._id))
        .catch(e => console.error('Gamification init error:', e.message));

      return res.json({
        success: true,
        message: isSkipped 
          ? 'Registration completed! You can verify your ID later to unlock all features.'
          : 'Registration completed! Your ID is being reviewed.',
        data: {
          userId: user._id,
          email: user.email,
          verificationStatus: user.verificationStatus,
          registrationComplete: true,
          idSkipped: isSkipped
        }
      });
    }
    
    res.json({
      success: true,
      message: `Step ${step} completed.`,
      data: {
        userId: user._id,
        registrationStep: user.registrationStep,
        profile: user.profile
      }
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

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() }
      ]
    }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }
    
    // Check if user registered with Google
    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google sign-in. Please use the Google login option.'
      });
    }
    
    // Check if email not verified
    if (user.verificationStatus === 'unverified' || !user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: 'Please verify your email first.',
        data: {
          userId: user._id,
          email: user.email,
          requiresOTP: true
        }
      });
    }
    
    // Check if profile incomplete (email verified but registration not done)
    if (user.verificationStatus === 'email_verified' && user.registrationStep < 4) {
      return res.status(200).json({
        success: true,
        message: 'Please complete your profile.',
        data: {
          userId: user._id,
          email: user.email,
          registrationStep: user.registrationStep || 2,
          continueRegistration: true
        }
      });
    }
    
    // Rejected users may still log in — they land on the app with limited access

    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.'
      });
    }
    
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact support.'
      });
    }
    
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }
    
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }
    
    const token = generateToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    setTokenCookie(res, token);
    
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    // Fire-and-forget: ensure game profile exists and evaluate for welcome_aboard
    gamificationService.initializeGameProfile(user._id)
      .then(() => gamificationService.evaluateAchievements(user._id))
      .catch(e => console.error('Gamification login check error:', e.message));

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          verificationStatus: user.verificationStatus,
          profile: user.profile,
          lastLogin: new Date()
        },
        token,
        refreshToken
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error logging in.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Check verification status
// @route   GET /api/auth/verification-status/:userId
// @access  Public
const checkVerificationStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('verificationStatus verificationMessage registrationStep email username');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    res.json({
      success: true,
      data: {
        verificationStatus: user.verificationStatus,
        verificationMessage: user.verificationMessage,
        registrationStep: user.registrationStep,
        email: user.email,
        username: user.username
      }
    });
    
  } catch (error) {
    console.error('Check verification status error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error checking verification status.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    clearTokenCookie(res);
    
    res.json({
      success: true,
      message: 'Logged out successfully.'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error logging out.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          verificationStatus: user.verificationStatus,
          profile: user.profile,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
    
  } catch (error) {
    console.error('Get current user error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error retrieving user information.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: clientRefreshToken } = req.body;
    
    if (!clientRefreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required.'
      });
    }
    
    const decoded = verifyToken(clientRefreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token.'
      });
    }
    
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive || user.verificationStatus !== 'verified') {
      return res.status(401).json({
        success: false,
        message: 'User not found or not verified.'
      });
    }
    
    const newToken = generateToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);
    
    setTokenCookie(res, newToken);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully.',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
    
  } catch (error) {
    console.error('Refresh token error:', error);
    
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change password for Google-authenticated accounts.'
      });
    }
    
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully.'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error changing password.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Legacy register endpoint (redirects to new flow)
const register = async (req, res) => {
  return createAccount(req, res);
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    
    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'User ID and OTP are required.'
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified.'
      });
    }
    
    // Check OTP exists
    if (!user.emailOTP || !user.emailOTP.code) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new one.'
      });
    }
    
    // Check OTP expiry
    if (new Date() > new Date(user.emailOTP.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
        expired: true
      });
    }
    
    // Verify OTP
    if (user.emailOTP.code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }
    
    // OTP is valid - update user
    user.isEmailVerified = true;
    user.verificationStatus = 'email_verified';
    user.registrationStep = 2;
    user.emailOTP = undefined; // Clear OTP
    await user.save();
    
    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.profile?.firstName || user.username).catch(console.error);
    
    res.json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        userId: user._id,
        email: user.email,
        registrationStep: 2,
        isEmailVerified: true
      }
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res) => {
  try {
    const { userId, email } = req.body;
    
    // Find user by ID or email
    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    
    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified.'
      });
    }
    
    // Rate limiting - check last OTP sent time
    if (user.emailOTP && user.emailOTP.expiresAt) {
      const otpCreatedAt = new Date(user.emailOTP.expiresAt).getTime() - (10 * 60 * 1000);
      const timeSinceLastOTP = Date.now() - otpCreatedAt;
      
      // Allow resend only after 1 minute
      if (timeSinceLastOTP < 60 * 1000) {
        const waitTime = Math.ceil((60 * 1000 - timeSinceLastOTP) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitTime} seconds before requesting a new OTP.`,
          waitTime
        });
      }
    }
    
    // Generate new OTP
    const otp = generateOTP();
    user.emailOTP = {
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
    await user.save();
    
    // Send OTP email
    console.log('📧 Resending OTP to:', user.email);
    try {
      const result = await sendOTPEmail(user.email, otp, user.profile?.firstName);
      console.log('📧 Resend OTP email result:', result);
    } catch (emailError) {
      console.error('📧 Resend OTP email failed:', emailError.message);
      throw emailError; // Re-throw to be caught by outer try-catch
    }
    
    res.json({
      success: true,
      message: 'A new OTP has been sent to your email.',
      data: {
        userId: user._id,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resending OTP.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Forgot Password - Send Reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email (don't reveal if user exists)
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success message (security - don't reveal if email exists)
    const successMessage = 'If an account with that email exists, a password reset code has been sent.';

    if (!user) {
      // Wait a bit to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 500));
      return res.status(200).json({
        success: true,
        message: successMessage
      });
    }

    // Check rate limit - 1 OTP per minute
    if (user.passwordResetOTP && user.passwordResetOTP.code) {
      const timeSinceLastOTP = Date.now() - new Date(user.passwordResetOTP.expiresAt).getTime() + (10 * 60 * 1000);
      if (timeSinceLastOTP < 60 * 1000) {
        const waitTime = Math.ceil((60 * 1000 - timeSinceLastOTP) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitTime} seconds before requesting another code.`
        });
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to user
    user.passwordResetOTP = {
      code: otp,
      expiresAt: otpExpiry,
      verified: false
    };
    await user.save();

    // Send reset OTP email
    try {
      await sendPasswordResetOTP(user.email, otp, user.username || 'User');
      console.log(`📧 Password reset OTP sent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Clear the OTP since email failed
      user.passwordResetOTP = undefined;
      await user.save();
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again.'
      });
    }

    res.status(200).json({
      success: true,
      message: successMessage,
      data: {
        email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Mask email
      }
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing request.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify Reset OTP
// @route   POST /api/auth/verify-reset-otp
// @access  Public
const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or OTP'
      });
    }

    // Check if OTP exists
    if (!user.passwordResetOTP || !user.passwordResetOTP.code) {
      return res.status(400).json({
        success: false,
        message: 'No password reset request found. Please request a new code.'
      });
    }

    // Check if OTP is expired
    if (new Date() > new Date(user.passwordResetOTP.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Code has expired. Please request a new one.'
      });
    }

    // Check if OTP matches
    if (user.passwordResetOTP.code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid code. Please try again.'
      });
    }

    // Mark OTP as verified
    user.passwordResetOTP.verified = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Code verified successfully',
      data: {
        verified: true
      }
    });

  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying code.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email and new password are required'
      });
    }

    // Password validation
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }

    // Check if OTP was verified
    if (!user.passwordResetOTP || !user.passwordResetOTP.verified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your code first'
      });
    }

    // Check if OTP is still valid (not expired during password entry)
    if (new Date() > new Date(user.passwordResetOTP.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Session expired. Please request a new code.'
      });
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save middleware
    user.passwordResetOTP = undefined; // Clear reset OTP
    await user.save();

    console.log(`🔐 Password reset successful for ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createAccount,
  googleAuth,
  updateProfile,
  login,
  checkVerificationStatus,
  logout,
  getCurrentUser,
  refreshToken,
  changePassword,
  register,
  verifyOTP,
  resendOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword
};
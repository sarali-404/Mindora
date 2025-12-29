const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const { 
  generateToken, 
  generateRefreshToken, 
  setTokenCookie, 
  clearTokenCookie,
  verifyToken 
} = require('../utils/tokenUtils');

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
      // If user exists but registration is incomplete, let them continue
      if (existingUser.verificationStatus === 'incomplete') {
        return res.status(200).json({
          success: true,
          message: 'Account exists. Please continue with registration.',
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
    
    // Create user with incomplete status
    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      authProvider: 'local',
      verificationStatus: 'incomplete',
      registrationStep: 1
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please complete your profile.',
      data: {
        userId: user._id,
        email: user.email,
        username: user.username,
        registrationStep: 2 // Move to step 2
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
      
      // If incomplete, let them continue registration
      if (user.verificationStatus === 'incomplete') {
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
      
      // If rejected
      if (user.verificationStatus === 'rejected') {
        return res.status(403).json({
          success: false,
          message: user.verificationMessage || 'Your account verification was rejected. Please contact support.',
          verificationStatus: 'rejected'
        });
      }
      
      // If verified - log them in
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
      
      const token = generateToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id);
      setTokenCookie(res, token);
      
      await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
      
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
    
    // New user - create account with incomplete status
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
      verificationStatus: 'incomplete',
      registrationStep: 2,
      isEmailVerified: email_verified,
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
    const { userId, step, profileData, idPhoto } = req.body;
    
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
        // ID Verification - Final Step
        user.profile.idPhoto = {
          url: idPhoto,
          uploadedAt: new Date(),
          verified: false
        };
        user.registrationStep = 4;
        user.verificationStatus = 'pending'; // Now waiting for admin approval
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
    
    // If step 4 completed, registration is done
    if (step === 4) {
      return res.json({
        success: true,
        message: 'Registration completed! Your account is pending verification.',
        data: {
          userId: user._id,
          email: user.email,
          verificationStatus: 'pending',
          registrationComplete: true
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
    
    // Check if registration is incomplete
    if (user.verificationStatus === 'incomplete') {
      return res.status(200).json({
        success: true,
        message: 'Please complete your registration.',
        data: {
          userId: user._id,
          email: user.email,
          registrationStep: user.registrationStep || 2,
          continueRegistration: true
        }
      });
    }
    
    // Check verification status
    if (user.verificationStatus === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending verification. Please wait for admin approval.',
        verificationStatus: 'pending'
      });
    }
    
    if (user.verificationStatus === 'rejected') {
      return res.status(403).json({
        success: false,
        message: user.verificationMessage || 'Your account verification was rejected. Please contact support.',
        verificationStatus: 'rejected'
      });
    }
    
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
  register
};

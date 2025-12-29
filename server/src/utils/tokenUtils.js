const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { 
      userId, 
      role,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'mindora-api',
      audience: 'mindora-users'
    }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      issuer: 'mindora-api',
      audience: 'mindora-users'
    }
  );
};

// Verify JWT token
const verifyToken = (token, secret = process.env.JWT_SECRET) => {
  try {
    return jwt.verify(token, secret, {
      issuer: 'mindora-api',
      audience: 'mindora-users'
    });
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

// Extract token from request
const extractTokenFromRequest = (req) => {
  let token = null;
  
  // Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Check cookies (for web applications)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  
  // Check query parameter (less secure, for development only)
  else if (req.query.token) {
    token = req.query.token;
  }
  
  return token;
};

// Set token cookie
const setTokenCookie = (res, token, name = 'token') => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie(name, token, {
    httpOnly: true,
    secure: isProduction, // Only send over HTTPS in production
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
};

// Clear token cookie
const clearTokenCookie = (res, name = 'token') => {
  res.cookie(name, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
    path: '/'
  });
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  extractTokenFromRequest,
  setTokenCookie,
  clearTokenCookie
};
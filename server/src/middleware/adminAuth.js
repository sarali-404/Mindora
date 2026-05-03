const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { extractTokenFromRequest } = require('../utils/tokenUtils');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

// Generate admin JWT (separate payload so it never matches user tokens)
const generateAdminToken = (adminId) => {
  return jwt.sign(
    { adminId, role: 'admin' },
    ADMIN_JWT_SECRET,
    {
      expiresIn: '12h',
      issuer: 'mindora-api',
      audience: 'mindora-admin',
    }
  );
};

// Middleware: verify admin JWT and attach admin doc to req
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = extractTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, ADMIN_JWT_SECRET, {
        issuer: 'mindora-api',
        audience: 'mindora-admin',
      });
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired admin token.' });
    }

    if (!decoded.adminId || decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not an admin token.' });
    }

    const admin = await Admin.findById(decoded.adminId);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin account not found.' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Authentication failed.' });
  }
};

module.exports = { authenticateAdmin, generateAdminToken };

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getUserProfile,
  updateUserProfile,
  uploadIDPhoto,
  getAllUsers,
  deleteUser,
  uploadProfilePicture
} = require('../controllers/userController');

const { authenticate, authorize, authorizeOwnerOrAdmin } = require('../middleware/auth');
const { validateProfileUpdate, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/profile-pictures');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// All routes require authentication
router.use(authenticate);

// User routes
router.get('/profile', getUserProfile);
router.put('/profile', [
  validateProfileUpdate,
  handleValidationErrors
], updateUserProfile);
router.post('/id-photo', uploadIDPhoto);
router.post('/profile-picture', upload.single('profilePicture'), uploadProfilePicture);

// Admin routes
router.get('/', authorize('admin'), getAllUsers);
router.get('/:id', authorizeOwnerOrAdmin, getUserProfile);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
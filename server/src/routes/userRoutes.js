const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getUserProfile,
  updateUserProfile,
  uploadIDPhoto,
  uploadIDPhotoFile,
  getAllUsers,
  deleteUser,
  uploadProfilePicture,
  getUserStats,
  getUserStorage
} = require('../controllers/userController');

const { authenticate, authorize, authorizeOwnerOrAdmin } = require('../middleware/auth');
const { validateProfileUpdate, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads/profile-pictures');
const idPhotoDir = path.join(__dirname, '../../uploads/id-photos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(idPhotoDir)) {
  fs.mkdirSync(idPhotoDir, { recursive: true });
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

// Multer for ID photo uploads (images only, 10 MB)
const idPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, idPhotoDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `id-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const idPhotoFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

const uploadIdPhoto = multer({
  storage: idPhotoStorage,
  fileFilter: idPhotoFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// All routes require authentication
router.use(authenticate);

// User routes
router.get('/profile', getUserProfile);
router.get('/stats', getUserStats);
router.get('/storage', getUserStorage);
router.put('/profile', [
  validateProfileUpdate,
  handleValidationErrors
], updateUserProfile);
router.post('/id-photo', uploadIDPhoto);
router.post('/upload-id-photo', uploadIdPhoto.single('idPhoto'), uploadIDPhotoFile);
router.post('/profile-picture', upload.single('profilePicture'), uploadProfilePicture);

// Admin routes
router.get('/', authorize('admin'), getAllUsers);
router.get('/:id', authorizeOwnerOrAdmin, getUserProfile);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
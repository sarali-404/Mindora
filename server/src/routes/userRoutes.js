const express = require('express');
const {
  getUserProfile,
  updateUserProfile,
  uploadIDPhoto,
  getAllUsers,
  deleteUser
} = require('../controllers/userController');

const { authenticate, authorize, authorizeOwnerOrAdmin } = require('../middleware/auth');
const { validateProfileUpdate, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// User routes
router.get('/profile', getUserProfile);
router.put('/profile', [
  validateProfileUpdate,
  handleValidationErrors
], updateUserProfile);
router.post('/id-photo', uploadIDPhoto);

// Admin routes
router.get('/', authorize('admin'), getAllUsers);
router.get('/:id', authorizeOwnerOrAdmin, getUserProfile);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
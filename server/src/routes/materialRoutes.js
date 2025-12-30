const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, optionalAuth } = require('../middleware/auth');
const materialController = require('../controllers/materialController');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/materials');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename: userId-timestamp-originalname
    const uniqueSuffix = `${req.user._id}-${Date.now()}`;
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    cb(null, `${uniqueSuffix}-${baseName}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Videos
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Supported: PDF, DOC, DOCX, PPT, PPTX, TXT, images, and videos.'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Wrapper to handle multer errors properly
const uploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds 50MB limit'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};

// ==================== MATERIAL ROUTES ====================

// User-specific materials (must be before /:id routes)
router.get('/user/my-materials', authenticate, materialController.getMyMaterials);
router.get('/user/saved', authenticate, materialController.getSavedMaterials);

// Public routes (with optional auth for personalized data)
router.get('/', optionalAuth, materialController.getMaterials);
router.get('/:id', optionalAuth, materialController.getMaterial);
router.get('/:id/download', materialController.downloadMaterial);

// Protected routes (require authentication)
router.post('/', authenticate, uploadMiddleware, materialController.uploadMaterial);
router.put('/:id', authenticate, materialController.updateMaterial);
router.delete('/:id', authenticate, materialController.deleteMaterial);

// Like/Save toggles
router.post('/:id/like', authenticate, materialController.toggleLike);
router.post('/:id/save', authenticate, materialController.toggleSave);

// ==================== COMMENT ROUTES ====================

router.get('/:id/comments', optionalAuth, materialController.getComments);
router.post('/:id/comments', authenticate, materialController.addComment);
router.put('/:id/comments/:commentId', authenticate, materialController.updateComment);
router.delete('/:id/comments/:commentId', authenticate, materialController.deleteComment);
router.post('/:id/comments/:commentId/like', authenticate, materialController.toggleCommentLike);

module.exports = router;

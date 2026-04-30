const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  sendMessage,
  getConversation,
  getConversations,
  deleteMessageForSelf,
  deleteMessageForEveryone,
  markAsRead,
  getUnreadCount,
  getAttachment,
  toggleReaction
} = require('../controllers/chatController');

const { authenticate } = require('../middleware/auth');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads/chat');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for chat attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `chat-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allowed file types for education platform
  const allowedTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain',
    // Archives
    'application/zip',
    'application/x-rar-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Allowed: images, PDF, Word, Excel, PowerPoint, text files, and archives.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// All routes require authentication
router.use(authenticate);

// Get all conversations
router.get('/conversations', getConversations);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Get attachment
router.get('/attachment/:filename', getAttachment);

// Get conversation with specific user
router.get('/conversation/:userId', getConversation);

// Send message (with optional file attachment)
router.post('/send/:userId', upload.single('attachment'), sendMessage);

// Mark messages as read
router.put('/read/:userId', markAsRead);

// Delete message
router.delete('/message/:messageId/self', deleteMessageForSelf);
router.delete('/message/:messageId/everyone', deleteMessageForEveryone);

// Reactions
router.post('/message/:messageId/reaction', toggleReaction);

module.exports = router;

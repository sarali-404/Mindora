const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  createGroup,
  getMyGroups,
  getGroupMessages,
  sendGroupMessage,
  addMember,
  removeMember,
  leaveGroup,
  updateGroup,
  getGroupAttachment,
  toggleGroupReaction
} = require('../controllers/groupController');

const { authenticate } = require('../middleware/auth');

// Ensure uploads directories exist
const uploadDir = path.join(__dirname, '../../uploads/chat');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const groupIconDir = path.join(__dirname, '../../uploads/groups');
if (!fs.existsSync(groupIconDir)) {
  fs.mkdirSync(groupIconDir, { recursive: true });
}

// Multer for chat attachments (messages)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `group-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// Separate multer for group icon uploads
const iconStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, groupIconDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `icon-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const iconFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for group icons.'), false);
  }
};

const iconUpload = multer({
  storage: iconStorage,
  fileFilter: iconFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// All routes require authentication
router.use(authenticate);

// Group CRUD
router.post('/', createGroup);
router.get('/', getMyGroups);
router.patch('/:groupId', iconUpload.single('icon'), updateGroup);
router.delete('/:groupId/leave', leaveGroup);

// Attachment download
router.get('/attachment/:filename', getGroupAttachment);

// Group messages
router.get('/:groupId/messages', getGroupMessages);
router.post('/:groupId/messages', upload.single('attachment'), sendGroupMessage);

// Members
router.post('/:groupId/members', addMember);
router.delete('/:groupId/members/:userId', removeMember);

// Reactions
router.post('/message/:messageId/reaction', toggleGroupReaction);

module.exports = router;

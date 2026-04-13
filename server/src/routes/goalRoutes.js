const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const goalController = require('../controllers/goalController');

// Configure multer for goal material uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/goals');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename: userId_timestamp_originalname
    const uniqueSuffix = `${req.user._id}_${Date.now()}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File filter to accept only supported types
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only PDF, DOCX, and TXT files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  }
});

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 5 files allowed.'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// ==================== AI SUGGESTION ROUTE ====================

// Get real-time AI suggestions for goal title (no auth required for faster response)
router.get('/suggestions', protect, goalController.getGoalSuggestions);

// Get public AI-generated notes (for Library page)
router.get('/public-notes', protect, goalController.getPublicNotes);

// Get a single public AI note by ID
router.get('/public-notes/:noteId', protect, goalController.getPublicNote);

// Comments on AI notes
router.get('/public-notes/:noteId/comments', protect, goalController.getAiNoteComments);
router.post('/public-notes/:noteId/comments', protect, goalController.addAiNoteComment);
router.delete('/public-notes/:noteId/comments/:commentId', protect, goalController.deleteAiNoteComment);

// Like/unlike an AI note
router.post('/public-notes/:noteId/like', protect, goalController.toggleAiNoteLike);

// ==================== GOAL CRUD ROUTES ====================

// Create goal without materials
router.post('/', protect, goalController.createGoal);

// Create goal with materials (multipart form)
router.post(
  '/with-materials',
  protect,
  upload.array('materials', 5),
  handleMulterError,
  goalController.createGoalWithMaterials
);

// Get all goals for current user
router.get('/my-goals', protect, goalController.getMyGoals);

// Get single goal by ID (with generated content)
router.get('/:goalId', protect, goalController.getGoal);

// Update goal
router.patch('/:goalId', protect, goalController.updateGoal);

// Delete goal
router.delete('/:goalId', protect, goalController.deleteGoal);

// ==================== CONTENT GENERATION ROUTES ====================

// Generate ALL content for a topic (notes + quiz + optional essay)
router.post('/:goalId/generate/topic', protect, goalController.generateTopicContent);

// Generate notes for a topic
router.post('/:goalId/generate/notes', protect, goalController.generateTopicNotes);

// Generate quiz for a topic
router.post('/:goalId/generate/quiz', protect, goalController.generateTopicQuiz);

// Generate essay questions for a topic
router.post('/:goalId/generate/essay', protect, goalController.generateTopicEssay);

// Generate summary for a topic
router.post('/:goalId/generate/summary', protect, goalController.generateTopicSummary);

// ==================== CONTENT RETRIEVAL ROUTES ====================

// Get notes for a goal
router.get('/:goalId/notes', protect, goalController.getGoalNotes);

// Get quizzes for a goal
router.get('/:goalId/quizzes', protect, goalController.getGoalQuizzes);

// Get summaries for a goal
router.get('/:goalId/summaries', protect, goalController.getGoalSummaries);

// Get essay questions for a goal
router.get('/:goalId/essays', protect, goalController.getGoalEssays);

// ==================== PROGRESS & QUIZ ROUTES ====================

// Submit quiz attempt
router.post('/content/:contentId/quiz-submit', protect, goalController.submitQuizAttempt);

// Submit essay answer
router.post('/content/:contentId/essay-submit', protect, goalController.submitEssayAnswer);

// Update topic progress
router.patch('/:goalId/topics/:topicId/progress', protect, goalController.updateTopicProgress);

// Get study recommendation
router.get('/:goalId/recommendation', protect, goalController.getStudyRecommendation);

// ==================== ACTIVITY TRACKING (ML) ====================

// Track learning activity (note view, time spent, flashcard review)
router.post('/:goalId/track-activity', protect, goalController.trackActivity);

// Get knowledge state (ML-calculated knowledge scores)
router.get('/:goalId/knowledge-state', protect, goalController.getKnowledgeState);

// Regenerate content at user's current knowledge level
router.post('/:goalId/regenerate', protect, goalController.regenerateContent);

// Get ML predictions (quiz pass probability, exam readiness)
router.get('/:goalId/predictions', protect, goalController.getPredictions);

// Get difficulty adjustment suggestions (ML)
router.get('/:goalId/difficulty-suggestions', protect, goalController.getDifficultySuggestions);

// Get per-topic analytics (reading status, quiz stats, engagement)
router.get('/:goalId/topic-analytics', protect, goalController.getTopicAnalytics);

// Toggle content visibility (public/private)
router.patch('/:goalId/content/:contentId/visibility', protect, goalController.toggleContentVisibility);

module.exports = router;

const express = require('express');
const router = express.Router();

const {
  createSession,
  getSessions,
  getSession,
  updateSession,
  cancelSession,
  joinSession,
  leaveSession,
  getMySessions,
  startSession,
  endSession,
  getDiscordInvite
} = require('../controllers/sessionController');

const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Discord info
router.get('/discord-invite', getDiscordInvite);

// User's sessions
router.get('/my-sessions', getMySessions);

// Session CRUD
router.post('/', createSession);
router.get('/', getSessions);
router.get('/:id', getSession);
router.put('/:id', updateSession);
router.delete('/:id', cancelSession);

// Session participation
router.post('/:id/join', joinSession);
router.post('/:id/leave', leaveSession);

// Session lifecycle
router.post('/:id/start', startSession);
router.post('/:id/end', endSession);

module.exports = router;

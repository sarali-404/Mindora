const express = require('express');
const router = express.Router();

const {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  unfriend,
  blockUser,
  unblockUser,
  getFriends,
  getPendingRequests,
  getSentRequests,
  getFriendshipStatus,
  discoverUsers
} = require('../controllers/friendController');

const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Discovery & search
router.get('/discover', discoverUsers);

// Get friends list
router.get('/', getFriends);

// Friend requests
router.get('/requests/pending', getPendingRequests);
router.get('/requests/sent', getSentRequests);
router.post('/request/:userId', sendFriendRequest);
router.put('/accept/:friendshipId', acceptFriendRequest);
router.put('/decline/:friendshipId', declineFriendRequest);
router.delete('/cancel/:friendshipId', cancelFriendRequest);

// Friendship status
router.get('/status/:userId', getFriendshipStatus);

// Unfriend
router.delete('/unfriend/:userId', unfriend);

// Block/Unblock
router.post('/block/:userId', blockUser);
router.delete('/unblock/:userId', unblockUser);

module.exports = router;

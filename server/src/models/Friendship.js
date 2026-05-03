const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'blocked'],
    default: 'pending'
  },
  // Who blocked (if status is 'blocked')
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index to ensure unique friendships and fast queries
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });
friendshipSchema.index({ recipient: 1, status: 1 });
friendshipSchema.index({ requester: 1, status: 1 });

// Static method to get friendship between two users
friendshipSchema.statics.getFriendship = async function(userId1, userId2) {
  return this.findOne({
    $or: [
      { requester: userId1, recipient: userId2 },
      { requester: userId2, recipient: userId1 }
    ]
  });
};

// Static method to check if two users are friends
friendshipSchema.statics.areFriends = async function(userId1, userId2) {
  const friendship = await this.getFriendship(userId1, userId2);
  return friendship?.status === 'accepted';
};

// Static method to check if a user is blocked
friendshipSchema.statics.isBlocked = async function(userId1, userId2) {
  const friendship = await this.getFriendship(userId1, userId2);
  return friendship?.status === 'blocked';
};

// Static method to get all friends of a user
friendshipSchema.statics.getFriends = async function(userId) {
  const friendships = await this.find({
    $or: [
      { requester: userId, status: 'accepted' },
      { recipient: userId, status: 'accepted' }
    ]
  })
  .populate('requester', 'username profile.firstName profile.lastName profile.avatar profile.university profile.bio profile.idPhoto verificationStatus isOnline lastSeen')
  .populate('recipient', 'username profile.firstName profile.lastName profile.avatar profile.university profile.bio profile.idPhoto verificationStatus isOnline lastSeen');

  // Return the friend user (not the current user)
  return friendships.map(f => {
    const friend = f.requester._id.toString() === userId.toString() 
      ? f.recipient 
      : f.requester;
    return {
      friendship: f,
      user: friend
    };
  });
};

// Static method to get pending requests received
friendshipSchema.statics.getPendingRequests = async function(userId) {
  return this.find({
    recipient: userId,
    status: 'pending'
  })
  .populate('requester', 'username profile.firstName profile.lastName profile.avatar profile.university profile.idPhoto verificationStatus')
  .sort({ createdAt: -1 });
};

// Static method to get sent requests
friendshipSchema.statics.getSentRequests = async function(userId) {
  return this.find({
    requester: userId,
    status: 'pending'
  })
  .populate('recipient', 'username profile.firstName profile.lastName profile.avatar profile.university profile.idPhoto verificationStatus')
  .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Friendship', friendshipSchema);

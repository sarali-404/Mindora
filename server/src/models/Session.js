const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['registered', 'joined', 'left'],
    default: 'registered'
  },
  joinedAt: Date,
  leftAt: Date
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Session title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Scheduling
  scheduledAt: {
    type: Date,
    required: [true, 'Scheduled time is required']
  },
  duration: {
    type: Number,
    required: true,
    min: [15, 'Session must be at least 15 minutes'],
    max: [480, 'Session cannot exceed 8 hours'],
    default: 60 // minutes
  },
  endedAt: Date,
  
  // Discord Integration
  discord: {
    channelId: String,
    channelName: String,
    inviteLink: String,
    inviteCode: String,
    guildId: String,
    messageId: String // Announcement message ID
  },
  
  // Participants
  maxParticipants: {
    type: Number,
    min: [2, 'Session must allow at least 2 participants'],
    max: [50, 'Session cannot exceed 50 participants'],
    default: 10
  },
  participants: [participantSchema],
  currentParticipantCount: {
    type: Number,
    default: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  
  // Session type
  isImmediate: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
sessionSchema.index({ host: 1 });
sessionSchema.index({ status: 1, scheduledAt: 1 });
sessionSchema.index({ subject: 1 });
sessionSchema.index({ 'participants.user': 1 });
sessionSchema.index({ scheduledAt: 1 });

// Virtual for checking if session is full
sessionSchema.virtual('isFull').get(function() {
  return this.participants.length >= this.maxParticipants;
});

// Virtual for time until session starts
sessionSchema.virtual('startsIn').get(function() {
  if (this.status !== 'scheduled') return null;
  return this.scheduledAt - new Date();
});

// Method to check if user is participant
sessionSchema.methods.isParticipant = function(userId) {
  return this.participants.some(p => p.user.toString() === userId.toString());
};

// Method to check if user is host
sessionSchema.methods.isHost = function(userId) {
  return this.host.toString() === userId.toString();
};

// Method to add participant
sessionSchema.methods.addParticipant = function(userId) {
  if (this.isParticipant(userId)) {
    throw new Error('User is already a participant');
  }
  if (this.isFull) {
    throw new Error('Session is full');
  }
  this.participants.push({ user: userId, status: 'registered' });
  return this.save();
};

// Method to remove participant
sessionSchema.methods.removeParticipant = function(userId) {
  const index = this.participants.findIndex(p => p.user.toString() === userId.toString());
  if (index === -1) {
    throw new Error('User is not a participant');
  }
  this.participants.splice(index, 1);
  return this.save();
};

// Method to update participant status (when they join/leave Discord)
sessionSchema.methods.updateParticipantStatus = function(userId, status) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.status = status;
    if (status === 'joined') {
      participant.joinedAt = new Date();
      this.currentParticipantCount = this.participants.filter(p => p.status === 'joined').length;
    } else if (status === 'left') {
      participant.leftAt = new Date();
      this.currentParticipantCount = this.participants.filter(p => p.status === 'joined').length;
    }
  }
  return this.save();
};

// Static method to get upcoming sessions
sessionSchema.statics.getUpcoming = function(limit = 10) {
  return this.find({
    status: 'scheduled',
    scheduledAt: { $gte: new Date() }
  })
    .sort({ scheduledAt: 1 })
    .limit(limit)
    .populate('host', 'username profile.firstName profile.lastName profile.avatar')
    .populate('participants.user', 'username profile.firstName profile.lastName profile.avatar');
};

// Static method to get live sessions
sessionSchema.statics.getLive = function() {
  return this.find({ status: 'live' })
    .sort({ currentParticipantCount: -1 })
    .populate('host', 'username profile.firstName profile.lastName profile.avatar')
    .populate('participants.user', 'username profile.firstName profile.lastName profile.avatar');
};

// Pre-save middleware to auto-start immediate sessions
sessionSchema.pre('save', async function() {
  if (this.isNew && this.isImmediate) {
    this.status = 'live';
  }
});

module.exports = mongoose.model('Session', sessionSchema);

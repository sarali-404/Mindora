const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // Map<userId, socketId>
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: [
          process.env.CLIENT_URL || 'http://localhost:5173',
          'http://localhost:5174'
        ],
        credentials: true,
        methods: ['GET', 'POST']
      }
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Token uses 'userId' field (from tokenUtils.js)
        const user = await User.findById(decoded.userId).select('username profile isOnline');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.user = user;
        next();
      } catch (error) {
        console.error('Socket auth error:', error.message);
        next(new Error('Invalid token'));
      }
    });

    // Connection handling
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('✅ Socket.io initialized');
    return this.io;
  }

  async handleConnection(socket) {
    const userId = socket.user._id.toString();
    const username = socket.user.username;

    console.log(`🔌 User connected: ${username} (${socket.id})`);

    // Store user's socket ID
    this.connectedUsers.set(userId, socket.id);

    // Update user's online status in DB
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      socketId: socket.id,
      lastSeen: new Date()
    });

    // Notify friends that user is online
    this.broadcastPresence(userId, true);

    // Join user to their own room (for direct messages)
    socket.join(userId);

    // Join all group rooms this user belongs to
    this.joinUserGroupRooms(socket, userId);

    // Handle events
    socket.on('typing', (data) => this.handleTyping(socket, data));
    socket.on('stop_typing', (data) => this.handleStopTyping(socket, data));
    socket.on('message_read', (data) => this.handleMessageRead(socket, data));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  async handleDisconnect(socket) {
    const userId = socket.user._id.toString();
    const username = socket.user.username;

    console.log(`🔌 User disconnected: ${username}`);

    // Remove from connected users
    this.connectedUsers.delete(userId);

    // Update user's offline status in DB
    await User.findByIdAndUpdate(userId, {
      isOnline: false,
      socketId: null,
      lastSeen: new Date()
    });

    // Notify friends that user is offline
    this.broadcastPresence(userId, false);
  }

  handleTyping(socket, data) {
    const { receiverId } = data;
    const senderId = socket.user._id.toString();
    const senderName = socket.user.profile?.firstName || socket.user.username;

    const receiverSocketId = this.connectedUsers.get(receiverId);
    if (receiverSocketId) {
      this.io.to(receiverSocketId).emit('user_typing', {
        senderId,
        senderName
      });
    }
  }

  handleStopTyping(socket, data) {
    const { receiverId } = data;
    const senderId = socket.user._id.toString();

    const receiverSocketId = this.connectedUsers.get(receiverId);
    if (receiverSocketId) {
      this.io.to(receiverSocketId).emit('user_stop_typing', {
        senderId
      });
    }
  }

  async handleMessageRead(socket, data) {
    const { conversationId, senderId } = data;
    
    const senderSocketId = this.connectedUsers.get(senderId);
    if (senderSocketId) {
      this.io.to(senderSocketId).emit('messages_read', {
        conversationId,
        readBy: socket.user._id
      });
    }
  }

  async broadcastPresence(userId, isOnline) {
    const Friendship = require('../models/Friendship');
    
    try {
      // Get user's friends
      const friends = await Friendship.getFriends(userId);
      
      // Notify each online friend
      friends.forEach(({ user: friend }) => {
        const friendSocketId = this.connectedUsers.get(friend._id.toString());
        if (friendSocketId) {
          this.io.to(friendSocketId).emit('presence_update', {
            userId,
            isOnline,
            lastSeen: new Date()
          });
        }
      });
    } catch (error) {
      console.error('Broadcast presence error:', error);
    }
  }

  // Send message to specific user
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Send event to all members of a group via Socket.IO room
  sendToGroup(groupId, event, data) {
    this.io.to(`group:${groupId}`).emit(event, data);
  }

  // Add a user's current socket(s) to a group room
  addUserToGroupRoom(userId, groupId) {
    const socketId = this.connectedUsers.get(userId.toString());
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) socket.join(`group:${groupId}`);
    }
  }

  // Remove a user's current socket(s) from a group room
  removeUserFromGroupRoom(userId, groupId) {
    const socketId = this.connectedUsers.get(userId.toString());
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) socket.leave(`group:${groupId}`);
    }
  }

  // On connect: join all group rooms the user belongs to
  async joinUserGroupRooms(socket, userId) {
    try {
      const GroupConversation = require('../models/GroupConversation');
      const groups = await GroupConversation.find({ members: userId }).select('_id');
      groups.forEach(g => socket.join(`group:${g._id.toString()}`));
    } catch (error) {
      console.error('joinUserGroupRooms error:', error);
    }
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  // Get socket.io instance
  getIO() {
    return this.io;
  }
}

// Export singleton
const socketService = new SocketService();
module.exports = socketService;

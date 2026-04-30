import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnecting = false;
    this.eventHandlers = {};
    this.extraListeners = {}; // supports multiple callbacks per event
  }

  // Connect to socket server (singleton pattern)
  connect() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    if (!token) {
      console.warn('No auth token, cannot connect to socket');
      return null;
    }

    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      return this.socket;
    }

    // Return existing connected socket
    if (this.socket?.connected) {
      return this.socket;
    }

    // Disconnect any stale socket first
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnecting = true;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket.id);
      this.isConnecting = false;
      // Re-attach event handlers after reconnection
      this.reattachHandlers();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error.message);
      this.isConnecting = false;
    });

    return this.socket;
  }

  // Disconnect from socket server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      this.eventHandlers = {};
    }
  }

  // Get socket instance (don't create if not exists)
  getSocket() {
    return this.socket;
  }

  // Re-attach handlers after reconnection
  reattachHandlers() {
    if (!this.socket) return;
    
    // Re-attach primary handlers (remove only their own previous binding)
    Object.entries(this.eventHandlers).forEach(([event, callback]) => {
      this.socket.off(event, callback);
      this.socket.on(event, callback);
    });

    // Re-attach extra (multi) listeners
    Object.entries(this.extraListeners).forEach(([event, listeners]) => {
      listeners.forEach(({ callback }) => {
        this.socket.off(event, callback); // avoid duplicates
        this.socket.on(event, callback);
      });
    });
  }

  /**
   * Add an additional listener for an event (supports multiple per event).
   * Returns an unsubscribe function.
   */
  addListener(event, callback) {
    if (!this.socket) this.connect();

    if (!this.extraListeners[event]) this.extraListeners[event] = [];
    this.extraListeners[event].push({ callback });
    if (this.socket) this.socket.on(event, callback);

    return () => this.removeListener(event, callback);
  }

  removeListener(event, callback) {
    if (this.extraListeners[event]) {
      this.extraListeners[event] = this.extraListeners[event].filter(l => l.callback !== callback);
    }
    if (this.socket) this.socket.off(event, callback);
  }

  // Register an event handler (stores for re-attachment)
  on(event, callback) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      // Remove only the previous primary handler for this event,
      // NOT all listeners (extraListeners like toast must be preserved)
      if (this.eventHandlers[event]) {
        this.socket.off(event, this.eventHandlers[event]);
      }
    }

    this.eventHandlers[event] = callback;

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // ==================== EVENT LISTENERS ====================

  onNewMessage(callback) {
    this.on('new_message', callback);
  }

  onMessageDeleted(callback) {
    this.on('message_deleted', callback);
  }

  onMessagesRead(callback) {
    this.on('messages_read', callback);
  }

  onUserTyping(callback) {
    this.on('user_typing', callback);
  }

  onUserStopTyping(callback) {
    this.on('user_stop_typing', callback);
  }

  onPresenceUpdate(callback) {
    this.on('presence_update', callback);
  }

  onFriendRemoved(callback) {
    this.on('friend_removed', callback);
  }

  // ==================== GROUP EVENT LISTENERS ====================

  onNewGroupMessage(callback) {
    this.on('new_group_message', callback);
  }

  onGroupJoined(callback) {
    this.on('group_joined', callback);
  }

  onGroupLeft(callback) {
    this.on('group_left', callback);
  }

  onGroupUpdated(callback) {
    this.on('group_updated', callback);
  }

  // ==================== EMIT EVENTS ====================

  emitTyping(receiverId) {
    if (this.socket?.connected) {
      this.socket.emit('typing', { receiverId });
    }
  }

  emitStopTyping(receiverId) {
    if (this.socket?.connected) {
      this.socket.emit('stop_typing', { receiverId });
    }
  }

  emitMessageRead(conversationId, senderId) {
    if (this.socket?.connected) {
      this.socket.emit('message_read', { conversationId, senderId });
    }
  }

  // ==================== CLEANUP ====================

  removeAllListeners() {
    if (this.socket) {
      // Only remove the specific primary handlers — leave extraListeners (e.g. toast) intact
      Object.entries(this.eventHandlers).forEach(([event, callback]) => {
        this.socket.off(event, callback);
      });
    }
    this.eventHandlers = {};
  }

  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
    delete this.eventHandlers[event];
  }

  // Check if connected
  isConnected() {
    return this.socket?.connected || false;
  }
}

const socketService = new SocketService();
export default socketService;

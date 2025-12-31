const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class SessionService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/sessions`;
  }

  // Get auth token
  getToken() {
    return localStorage.getItem('authToken');
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Add auth token if available
    const token = this.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('Session API error:', error);
      throw error;
    }
  }

  // ==================== SESSION OPERATIONS ====================

  // Create a new session
  async createSession(sessionData) {
    return this.request('', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  // Get all sessions with filters
  async getSessions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`?${queryString}`);
  }

  // Get upcoming sessions
  async getUpcomingSessions(limit = 10) {
    return this.request(`?upcoming=true&limit=${limit}`);
  }

  // Get live sessions
  async getLiveSessions() {
    return this.request('?live=true');
  }

  // Get single session by ID
  async getSession(id) {
    return this.request(`/${id}`);
  }

  // Update session
  async updateSession(id, data) {
    return this.request(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Cancel session
  async cancelSession(id) {
    return this.request(`/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== PARTICIPATION ====================

  // Join a session
  async joinSession(id) {
    return this.request(`/${id}/join`, {
      method: 'POST',
    });
  }

  // Leave a session
  async leaveSession(id) {
    return this.request(`/${id}/leave`, {
      method: 'POST',
    });
  }

  // Get user's sessions (hosted and joined)
  async getMySessions(type = 'all') {
    return this.request(`/my-sessions?type=${type}`);
  }

  // ==================== SESSION LIFECYCLE ====================

  // Start a scheduled session
  async startSession(id) {
    return this.request(`/${id}/start`, {
      method: 'POST',
    });
  }

  // End a session
  async endSession(id) {
    return this.request(`/${id}/end`, {
      method: 'POST',
    });
  }

  // ==================== DISCORD ====================

  // Get Discord server invite
  async getDiscordInvite() {
    return this.request('/discord-invite');
  }

  // ==================== HELPERS ====================

  // Format session time
  formatSessionTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date - now;

    // If in the past
    if (diff < 0) {
      return 'Started';
    }

    // If less than 1 hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `Starts in ${minutes} min`;
    }

    // If today
    if (date.toDateString() === now.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }

    // If tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }

    // Otherwise show full date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  // Get status badge color
  getStatusColor(status) {
    const colors = {
      scheduled: '#3b82f6', // blue
      live: '#22c55e', // green
      ended: '#6b7280', // gray
      cancelled: '#ef4444' // red
    };
    return colors[status] || colors.scheduled;
  }

  // Check if session can be joined
  canJoinSession(session, userId) {
    if (!session || !userId) return false;
    if (session.status === 'cancelled' || session.status === 'ended') return false;
    if (session.participants?.some(p => p.user?._id === userId || p.user === userId)) return false;
    if (session.participants?.length >= session.maxParticipants) return false;
    return true;
  }

  // Check if user is the host
  isHost(session, userId) {
    if (!session || !userId) return false;
    return session.host?._id === userId || session.host === userId;
  }

  // Check if user is a participant
  isParticipant(session, userId) {
    if (!session || !userId) return false;
    return session.participants?.some(p => p.user?._id === userId || p.user === userId);
  }
}

// Create and export singleton instance
const sessionService = new SessionService();
export default sessionService;

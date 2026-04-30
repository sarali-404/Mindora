const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class FriendService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/friends`;
  }

  getToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

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

    const token = this.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          sessionStorage.removeItem('authToken');
          sessionStorage.removeItem('refreshToken');
          window.location.href = '/';
        }
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      if (error.message !== 'Invalid token.') console.error('Friend API error:', error);
      throw error;
    }
  }

  // ==================== DISCOVERY ====================

  // Discover users to add as friends
  async discoverUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/discover?${queryString}`);
  }

  // ==================== FRIEND REQUESTS ====================

  // Send friend request
  async sendFriendRequest(userId) {
    return this.request(`/request/${userId}`, {
      method: 'POST'
    });
  }

  // Accept friend request
  async acceptFriendRequest(friendshipId) {
    return this.request(`/accept/${friendshipId}`, {
      method: 'PUT'
    });
  }

  // Decline friend request
  async declineFriendRequest(friendshipId) {
    return this.request(`/decline/${friendshipId}`, {
      method: 'PUT'
    });
  }

  // Cancel sent friend request
  async cancelFriendRequest(friendshipId) {
    return this.request(`/cancel/${friendshipId}`, {
      method: 'DELETE'
    });
  }

  // Get pending requests (received)
  async getPendingRequests() {
    return this.request('/requests/pending');
  }

  // Get sent requests
  async getSentRequests() {
    return this.request('/requests/sent');
  }

  // ==================== FRIENDS ====================

  // Get all friends
  async getFriends() {
    return this.request('');
  }

  // Get friendship status with a user
  async getFriendshipStatus(userId) {
    return this.request(`/status/${userId}`);
  }

  // Unfriend a user
  async unfriend(userId) {
    return this.request(`/unfriend/${userId}`, {
      method: 'DELETE'
    });
  }

  // ==================== BLOCK ====================

  // Block a user
  async blockUser(userId) {
    return this.request(`/block/${userId}`, {
      method: 'POST'
    });
  }

  // Unblock a user
  async unblockUser(userId) {
    return this.request(`/unblock/${userId}`, {
      method: 'DELETE'
    });
  }
}

// Helper functions
export const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'Unknown';
  
  const now = new Date();
  const seen = new Date(lastSeen);
  const diffMs = now - seen;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return seen.toLocaleDateString();
};

export const getDisplayName = (user) => {
  if (!user) return 'Unknown';
  if (user.profile?.firstName) {
    return `${user.profile.firstName}${user.profile.lastName ? ' ' + user.profile.lastName : ''}`;
  }
  return user.username;
};

export const getInitials = (user) => {
  if (!user) return '?';
  if (user.profile?.firstName) {
    const first = user.profile.firstName.charAt(0);
    const last = user.profile.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  }
  return user.username?.charAt(0).toUpperCase() || '?';
};

const friendService = new FriendService();
export default friendService;

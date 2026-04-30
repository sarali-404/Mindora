const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ChatService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/chat`;
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
        ...options.headers,
      },
    };

    // Don't set Content-Type for FormData (let browser set it with boundary)
    if (!(options.body instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }

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
      if (!(error.message === 'Invalid token.' || error.message?.includes('Session expired'))) {
        console.error('Chat API error:', error);
      }
      throw error;
    }
  }

  // ==================== CONVERSATIONS ====================

  // Get all conversations
  async getConversations() {
    return this.request('/conversations');
  }

  // Get total unread message count
  async getUnreadCount() {
    return this.request('/unread-count');
  }

  // Get conversations that have unread messages (with sender names)
  async getUnreadConversations() {
    const data = await this.getConversations();
    const list = data.data || data.conversations || data || [];
    return list.filter(c => c.unreadCount > 0);
  }

  // Get conversation with specific user
  async getConversation(userId, page = 1, limit = 50) {
    return this.request(`/conversation/${userId}?page=${page}&limit=${limit}`);
  }

  // ==================== MESSAGES ====================

  // Send text message
  async sendMessage(userId, content, replyTo = null) {
    return this.request(`/send/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ content, ...(replyTo && { replyTo }) })
    });
  }

  // Send message with attachment
  async sendMessageWithAttachment(userId, content, file, replyTo = null) {
    const formData = new FormData();
    if (content) formData.append('content', content);
    if (file) formData.append('attachment', file);
    if (replyTo) formData.append('replyTo', replyTo);

    return this.request(`/send/${userId}`, {
      method: 'POST',
      body: formData
    });
  }

  // Delete message for self
  async deleteMessageForSelf(messageId) {
    return this.request(`/message/${messageId}/self`, {
      method: 'DELETE'
    });
  }

  // Delete message for everyone
  async deleteMessageForEveryone(messageId) {
    return this.request(`/message/${messageId}/everyone`, {
      method: 'DELETE'
    });
  }

  // Toggle emoji reaction on a DM message
  async toggleReaction(messageId, emoji) {
    return this.request(`/message/${messageId}/reaction`, {
      method: 'POST',
      body: JSON.stringify({ emoji })
    });
  }

  // ==================== READ STATUS ====================

  // Mark messages as read
  async markAsRead(userId) {
    return this.request(`/read/${userId}`, {
      method: 'PUT'
    });
  }

  // Get unread message count
  async getUnreadCount() {
    return this.request('/unread-count');
  }

  // ==================== ATTACHMENTS ====================

  // Get attachment URL
  getAttachmentUrl(filename) {
    return `${this.baseURL}/attachment/${filename}`;
  }
}

// Helper functions
export const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  if (isToday) return timeStr;
  if (isYesterday) return `Yesterday ${timeStr}`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export const formatConversationTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const isImageFile = (mimeType) => {
  return mimeType?.startsWith('image/');
};

export const getFileIcon = (mimeType) => {
  if (mimeType?.includes('pdf')) return '📄';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
  if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return '📊';
  if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return '📽️';
  if (mimeType?.includes('zip') || mimeType?.includes('rar')) return '📦';
  if (mimeType?.includes('text')) return '📃';
  return '📎';
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const chatService = new ChatService();
export default chatService;

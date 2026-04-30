const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class GroupService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/groups`;
  }

  getToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      ...options,
      credentials: 'include',
      headers: { ...options.headers }
    };

    if (!(options.body instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;

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
  }

  // Create a new group
  createGroup(name, memberIds) {
    return this.request('/', {
      method: 'POST',
      body: JSON.stringify({ name, memberIds })
    });
  }

  // Get all groups the current user belongs to
  getMyGroups() {
    return this.request('/');
  }

  // Get paginated messages for a group
  getGroupMessages(groupId, page = 1, limit = 50) {
    return this.request(`/${groupId}/messages?page=${page}&limit=${limit}`);
  }

  // Send a plain text message
  sendGroupMessage(groupId, content, replyTo = null) {
    return this.request(`/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, ...(replyTo && { replyTo }) })
    });
  }

  // Send a message with a file attachment
  sendGroupMessageWithAttachment(groupId, content, file, replyTo = null) {
    const formData = new FormData();
    if (content) formData.append('content', content);
    if (file) formData.append('attachment', file);
    if (replyTo) formData.append('replyTo', replyTo);

    return this.request(`/${groupId}/messages`, {
      method: 'POST',
      body: formData
    });
  }

  // Toggle emoji reaction on a group message
  toggleGroupReaction(messageId, emoji) {
    return this.request(`/message/${messageId}/reaction`, {
      method: 'POST',
      body: JSON.stringify({ emoji })
    });
  }

  // Update group name and/or icon (creator only)
  updateGroupWithIcon(groupId, name, iconFile) {
    const formData = new FormData();
    if (name) formData.append('name', name);
    if (iconFile) formData.append('icon', iconFile);
    return this.request(`/${groupId}`, {
      method: 'PATCH',
      body: formData
    });
  }

  // Update group name (creator only)
  updateGroup(groupId, name) {
    return this.request(`/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name })
    });
  }

  // Remove a member from a group (creator only)
  removeMember(groupId, userId) {
    return this.request(`/${groupId}/members/${userId}`, { method: 'DELETE' });
  }

  // Add a member to a group (creator only)
  addMember(groupId, userId) {
    return this.request(`/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  // Leave a group
  leaveGroup(groupId) {
    return this.request(`/${groupId}/leave`, { method: 'DELETE' });
  }

  // Get URL for a group message attachment (for display and download)
  getGroupAttachmentUrl(filename) {
    return `${this.baseURL}/attachment/${filename}`;
  }
}

const groupService = new GroupService();
export default groupService;

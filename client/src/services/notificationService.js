const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class NotificationService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/notifications`;
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

  async getNotifications(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`?${queryString}`);
  }

  async getCount() {
    return this.request('/count');
  }

  async markAsRead(notificationId) {
    return this.request(`/${notificationId}/read`, { method: 'PUT' });
  }

  async markAllAsRead() {
    return this.request('/mark-all-read', { method: 'PUT' });
  }

  async deleteNotification(notificationId) {
    return this.request(`/${notificationId}`, { method: 'DELETE' });
  }

  async deleteAll() {
    return this.request('/all', { method: 'DELETE' });
  }

  async getByType(type, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/type/${type}?${queryString}`);
  }

  async getPreferences() {
    return this.request('/preferences');
  }

  async updatePreferences(preferences) {
    return this.request('/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }
}

const notificationService = new NotificationService();
export default notificationService;

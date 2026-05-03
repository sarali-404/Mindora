import api from './api.js';

const BASE = '/admin';
const ADMIN_TOKEN_KEY = 'adminToken';
const ADMIN_USER_KEY = 'adminUser';

// Token helpers — stored separately from the regular user token
const adminTokenStore = {
  get: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  set: (token) => localStorage.setItem(ADMIN_TOKEN_KEY, token),
  clear: () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  },
  isLoggedIn: () => !!localStorage.getItem(ADMIN_TOKEN_KEY),
  getAdmin: () => {
    const d = localStorage.getItem(ADMIN_USER_KEY);
    return d ? JSON.parse(d) : null;
  },
  setAdmin: (admin) => localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(admin)),
};

// Helper: build a request using the admin token (not the regular authToken)
function adminRequest(endpoint, options = {}) {
  const token = adminTokenStore.get();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return api.request(endpoint, { ...options, headers });
}

const adminService = {
  // Auth
  async login(username, password) {
    const res = await api.post(`${BASE}/login`, { username, password });
    if (res.success) {
      adminTokenStore.set(res.data.token);
      adminTokenStore.setAdmin(res.data.admin);
    }
    return res;
  },

  logout() {
    adminTokenStore.clear();
  },

  isLoggedIn: () => adminTokenStore.isLoggedIn(),
  getAdmin: () => adminTokenStore.getAdmin(),

  // Admin management
  createAdmin(username, password) {
    return adminRequest(`${BASE}/create`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  // Dashboard
  getStats() {
    return adminRequest(`${BASE}/stats`);
  },

  getPendingVerifications() {
    return adminRequest(`${BASE}/pending-verifications`);
  },

  approveVerification(userId) {
    return adminRequest(`${BASE}/verify/${userId}/approve`, { method: 'POST' });
  },

  rejectVerification(userId, message) {
    return adminRequest(`${BASE}/verify/${userId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  getUsers({ page = 1, limit = 20, search = '', status = '' } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return adminRequest(`${BASE}/users?${params.toString()}`);
  },

  toggleUserActive(userId) {
    return adminRequest(`${BASE}/users/${userId}/toggle-active`, { method: 'PATCH' });
  },
};

export default adminService;


import apiClient from './api.js';

class AuthService {
  // Create account (Step 1) - Email/Password
  async createAccount(userData) {
    try {
      const response = await apiClient.post('/auth/create-account', userData);
      
      if (response.success && response.data) {
        // Store user ID for continuing registration
        this.setRegistrationData({
          userId: response.data.userId,
          email: response.data.email,
          registrationStep: response.data.registrationStep
        });
        
        return response;
      }
      
      throw new Error(response.message || 'Account creation failed');
    } catch (error) {
      console.error('Create account error:', error);
      throw error;
    }
  }

  // Update profile (Steps 2-4)
  async updateProfile(profileData) {
    try {
      const response = await apiClient.put('/auth/update-profile', profileData);
      
      if (response.success && response.data) {
        // Update registration step
        const regData = this.getRegistrationData();
        if (regData) {
          regData.registrationStep = response.data.registrationStep;
          this.setRegistrationData(regData);
        }
        
        return response;
      }
      
      throw new Error(response.message || 'Profile update failed');
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Google OAuth authentication
  async googleAuth(credential) {
    try {
      const response = await apiClient.post('/auth/google', { credential });
      
      if (response.success && response.data) {
        // If needs to continue registration
        if (response.data.continueRegistration) {
          this.setRegistrationData({
            userId: response.data.userId,
            email: response.data.email,
            username: response.data.username,
            profile: response.data.profile,
            registrationStep: response.data.registrationStep
          });
          return response;
        }
        
        // If pending verification
        if (response.data.pendingVerification) {
          this.setPendingUserId(response.data.userId);
          return response;
        }
        
        // If logged in (verified user)
        if (response.data.isLoggedIn && response.data.token) {
          apiClient.setToken(response.data.token);
          apiClient.setRefreshToken(response.data.refreshToken);
          this.setUser(response.data.user);
        }
        
        return response;
      }
      
      throw new Error(response.message || 'Google authentication failed');
    } catch (error) {
      console.error('Google auth error:', error);
      throw error;
    }
  }

  // Legacy register (redirects to createAccount)
  async register(userData) {
    return this.createAccount(userData);
  }

  // Login user
  async login(credentials) {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      
      if (response.success && response.data) {
        // If needs to continue registration
        if (response.data.continueRegistration) {
          this.setRegistrationData({
            userId: response.data.userId,
            email: response.data.email,
            registrationStep: response.data.registrationStep
          });
          return response;
        }
        
        // Store tokens and user data
        if (response.data.token) {
          apiClient.setToken(response.data.token);
          apiClient.setRefreshToken(response.data.refreshToken);
          this.setUser(response.data.user);
        }
        
        return response;
      }
      
      throw new Error(response.message || 'Login failed');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout user
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with cleanup even if server request fails
    } finally {
      // Clear local storage
      apiClient.clearToken();
      this.clearUser();
      this.clearRegistrationData();
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me');
      
      if (response.success && response.data) {
        this.setUser(response.data.user);
        return response.data.user;
      }
      
      throw new Error(response.message || 'Failed to get user data');
    } catch (error) {
      console.error('Get current user error:', error);
      // If token is invalid, clear auth data
      if (error.status === 401) {
        this.clearAuth();
      }
      throw error;
    }
  }

  // Refresh access token
  async refreshToken() {
    try {
      const refreshToken = apiClient.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post('/auth/refresh', { refreshToken });
      
      if (response.success && response.data) {
        apiClient.setToken(response.data.token);
        apiClient.setRefreshToken(response.data.refreshToken);
        return response.data.token;
      }
      
      throw new Error(response.message || 'Token refresh failed');
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearAuth();
      throw error;
    }
  }

  // Change password
  async changePassword(passwordData) {
    try {
      const response = await apiClient.put('/auth/change-password', passwordData);
      
      if (response.success) {
        return response;
      }
      
      throw new Error(response.message || 'Password change failed');
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = apiClient.getToken();
    const user = this.getUser();
    return !!(token && user);
  }

  // Get stored user data
  getUser() {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  }

  // Store user data
  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  // Clear user data
  clearUser() {
    localStorage.removeItem('user');
  }

  // Clear all auth data
  clearAuth() {
    apiClient.clearToken();
    this.clearUser();
    this.clearRegistrationData();
  }

  // Store registration data (for multi-step registration)
  setRegistrationData(data) {
    localStorage.setItem('registrationData', JSON.stringify(data));
  }

  // Get registration data
  getRegistrationData() {
    const data = localStorage.getItem('registrationData');
    return data ? JSON.parse(data) : null;
  }

  // Clear registration data
  clearRegistrationData() {
    localStorage.removeItem('registrationData');
  }

  // Check verification status
  async checkVerificationStatus(userId) {
    try {
      const response = await apiClient.get(`/auth/verification-status/${userId}`);
      
      if (response.success) {
        return response.data;
      }
      
      throw new Error(response.message || 'Failed to check verification status');
    } catch (error) {
      console.error('Check verification status error:', error);
      throw error;
    }
  }

  // Store pending user ID (for verification checking)
  setPendingUserId(userId) {
    localStorage.setItem('pendingUserId', userId);
  }

  // Get pending user ID
  getPendingUserId() {
    return localStorage.getItem('pendingUserId');
  }

  // Clear pending user ID
  clearPendingUserId() {
    localStorage.removeItem('pendingUserId');
  }

  // Get user role
  getUserRole() {
    const user = this.getUser();
    return user?.role || null;
  }

  // Check if user is admin
  isAdmin() {
    return this.getUserRole() === 'admin';
  }

  // Check if user is regular user
  isUser() {
    return this.getUserRole() === 'user';
  }
}

// Create and export singleton instance
const authService = new AuthService();
export default authService;
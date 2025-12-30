// Material API service
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class MaterialService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/materials`;
  }

  // Helper to get auth token
  getToken() {
    return localStorage.getItem('authToken');
  }

  // Helper for API requests
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      ...options,
      credentials: 'include',
      headers: {
        ...options.headers,
      },
    };

    // Add auth token if available
    const token = this.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData (let browser set it with boundary)
    if (!(options.body instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('Material API error:', error);
      throw error;
    }
  }

  // ==================== MATERIAL OPERATIONS ====================

  // Upload new material
  async uploadMaterial(formData) {
    return this.request('', {
      method: 'POST',
      body: formData,
    });
  }

  // Get all materials with filters
  async getMaterials(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`?${queryString}`);
  }

  // Get single material by ID
  async getMaterial(id) {
    return this.request(`/${id}`);
  }

  // Update material
  async updateMaterial(id, data) {
    return this.request(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete material
  async deleteMaterial(id) {
    return this.request(`/${id}`, {
      method: 'DELETE',
    });
  }

  // Toggle like
  async toggleLike(id) {
    return this.request(`/${id}/like`, {
      method: 'POST',
    });
  }

  // Toggle save/bookmark
  async toggleSave(id) {
    return this.request(`/${id}/save`, {
      method: 'POST',
    });
  }

  // Get download URL
  getDownloadUrl(id) {
    return `${this.baseURL}/${id}/download`;
  }

  // Download material
  async downloadMaterial(id, filename) {
    const url = this.getDownloadUrl(id);
    const token = this.getToken();
    
    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      return { success: true };
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  // Get user's materials
  async getMyMaterials(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/user/my-materials?${queryString}`);
  }

  // Get saved materials
  async getSavedMaterials(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/user/saved?${queryString}`);
  }

  // Get file preview URL
  getFilePreviewUrl(filePath) {
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    // Extract just the filename from the full path (handles both Windows and Unix paths)
    const filename = filePath.split(/[/\\]/).pop();
    return `${baseUrl}/uploads/materials/${filename}`;
  }

  // ==================== COMMENT OPERATIONS ====================

  // Get comments for a material
  async getComments(materialId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/${materialId}/comments?${queryString}`);
  }

  // Add comment
  async addComment(materialId, content, parentComment = null) {
    return this.request(`/${materialId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentComment }),
    });
  }

  // Update comment
  async updateComment(materialId, commentId, content) {
    return this.request(`/${materialId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  // Delete comment
  async deleteComment(materialId, commentId) {
    return this.request(`/${materialId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  // Toggle comment like
  async toggleCommentLike(materialId, commentId) {
    return this.request(`/${materialId}/comments/${commentId}/like`, {
      method: 'POST',
    });
  }
}

// Export singleton instance
const materialService = new MaterialService();
export default materialService;

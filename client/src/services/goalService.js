// Goal API service
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class GoalService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/goals`;
  }

  // Helper to get auth token
  getToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
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
      if (error.message !== 'Invalid token.') console.error('Goal API error:', error);
      throw error;
    }
  }

  // ==================== AI SUGGESTIONS ====================

  // Get real-time AI suggestions for goal title
  async getGoalSuggestions(partialGoal, subject = '') {
    const params = new URLSearchParams({ partialGoal });
    if (subject) params.append('subject', subject);
    return this.request(`/suggestions?${params.toString()}`);
  }

  // ==================== GOAL CRUD ====================

  // Create goal without materials
  async createGoal(goalData) {
    return this.request('', {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
  }

  // Create goal with materials (FormData)
  async createGoalWithMaterials(formData) {
    return this.request('/with-materials', {
      method: 'POST',
      body: formData,
    });
  }

  // Get all user's goals
  async getMyGoals(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/my-goals${queryString ? `?${queryString}` : ''}`);
  }

  // Get single goal by ID
  async getGoal(goalId) {
    return this.request(`/${goalId}`);
  }

  // Update goal
  async updateGoal(goalId, data) {
    return this.request(`/${goalId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Delete goal
  async deleteGoal(goalId) {
    return this.request(`/${goalId}`, {
      method: 'DELETE',
    });
  }

  // ==================== CONTENT GENERATION ====================

  // Generate ALL content for a topic (notes + quiz + optional essay)
  async generateTopicContent(goalId, topicName, includeEssay = false) {
    return this.request(`/${goalId}/generate/topic`, {
      method: 'POST',
      body: JSON.stringify({ topicName, includeEssay }),
    });
  }

  // Generate notes for a topic
  async generateNotes(goalId, topicName) {
    return this.request(`/${goalId}/generate/notes`, {
      method: 'POST',
      body: JSON.stringify({ topicName }),
    });
  }

  // Generate quiz for a topic
  async generateQuiz(goalId, topicName, difficulty = 'medium', questionCount = 10) {
    return this.request(`/${goalId}/generate/quiz`, {
      method: 'POST',
      body: JSON.stringify({ topicName, difficulty, questionCount }),
    });
  }

  // Generate essay questions for a topic
  async generateEssay(goalId, topicName, difficulty = 'medium', questionCount = 5) {
    return this.request(`/${goalId}/generate/essay`, {
      method: 'POST',
      body: JSON.stringify({ topicName, difficulty, questionCount }),
    });
  }

  // ==================== CONTENT RETRIEVAL ====================

  // Get notes
  async getNotes(goalId, topic = null) {
    const params = topic ? `?topic=${encodeURIComponent(topic)}` : '';
    return this.request(`/${goalId}/notes${params}`);
  }

  // Get quizzes
  async getQuizzes(goalId, topic = null) {
    const params = topic ? `?topic=${encodeURIComponent(topic)}` : '';
    return this.request(`/${goalId}/quizzes${params}`);
  }

  // Get summaries
  async getSummaries(goalId) {
    return this.request(`/${goalId}/summaries`);
  }

  // Generate summary for a topic
  async generateSummary(goalId, topicName) {
    return this.request(`/${goalId}/generate/summary`, {
      method: 'POST',
      body: JSON.stringify({ topicName }),
    });
  }

  // Get essay questions
  async getEssays(goalId, topic = null) {
    const params = topic ? `?topic=${encodeURIComponent(topic)}` : '';
    return this.request(`/${goalId}/essays${params}`);
  }

  // ==================== PROGRESS & QUIZ ====================

  // Submit essay answer
  async submitEssayAnswer(contentId, questionId, userAnswer) {
    return this.request(`/content/${contentId}/essay-submit`, {
      method: 'POST',
      body: JSON.stringify({ questionId, userAnswer }),
    });
  }

  // Submit quiz attempt
  async submitQuizAttempt(contentId, answers, timeTaken) {
    return this.request(`/content/${contentId}/quiz-submit`, {
      method: 'POST',
      body: JSON.stringify({ answers, timeTaken }),
    });
  }

  // Update topic progress
  async updateTopicProgress(goalId, topicId, progressData) {
    return this.request(`/${goalId}/topics/${topicId}/progress`, {
      method: 'PATCH',
      body: JSON.stringify(progressData),
    });
  }

  // Get study recommendation
  async getStudyRecommendation(goalId) {
    return this.request(`/${goalId}/recommendation`);
  }

  // ==================== ACTIVITY TRACKING (ML) ====================

  // Track a learning activity (note view, time spent, flashcard review)
  async trackActivity(goalId, topicName, activityType, data = {}) {
    return this.request(`/${goalId}/track-activity`, {
      method: 'POST',
      body: JSON.stringify({ topicName, activityType, data }),
    });
  }

  // Get knowledge state (ML knowledge scores per topic)
  async getKnowledgeState(goalId) {
    return this.request(`/${goalId}/knowledge-state`);
  }

  // Regenerate content at user's current knowledge level
  async regenerateContent(goalId, topicName, contentType) {
    return this.request(`/${goalId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ topicName, contentType }),
    });
  }

  // Get ML predictions (quiz pass probability, exam readiness)
  async getPredictions(goalId) {
    return this.request(`/${goalId}/predictions`);
  }

  // Get difficulty adjustment suggestions (ML-based)
  async getDifficultySuggestions(goalId) {
    return this.request(`/${goalId}/difficulty-suggestions`);
  }

  // Get per-topic analytics (reading status, quiz stats, engagement)
  async getTopicAnalytics(goalId) {
    return this.request(`/${goalId}/topic-analytics`);
  }

  async toggleContentVisibility(goalId, contentId) {
    return this.request(`/${goalId}/content/${contentId}/visibility`, { method: 'PATCH' });
  }

  async getPublicNotes(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/public-notes?${query}`);
  }

  async getPublicNote(noteId) {
    return this.request(`/public-notes/${noteId}`);
  }

  async getAiNoteComments(noteId) {
    return this.request(`/public-notes/${noteId}/comments`);
  }

  async addAiNoteComment(noteId, content, parentComment = null) {
    return this.request(`/public-notes/${noteId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentComment })
    });
  }

  async deleteAiNoteComment(noteId, commentId) {
    return this.request(`/public-notes/${noteId}/comments/${commentId}`, { method: 'DELETE' });
  }

  async toggleAiNoteLike(noteId) {
    return this.request(`/public-notes/${noteId}/like`, { method: 'POST' });
  }
}

// Create and export singleton instance
const goalService = new GoalService();
export default goalService;

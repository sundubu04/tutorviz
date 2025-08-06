// API Client utility for frontend integration
// This file can be copied to the frontend src/utils/ directory

class ApiClient {
  constructor(baseURL = 'http://localhost:5001/api') {
    this.baseURL = baseURL;
    this.token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (typeof localStorage !== 'undefined') {
      if (token) {
        localStorage.setItem('authToken', token);
      } else {
        localStorage.removeItem('authToken');
      }
    }
  }

  // Get authentication headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout() {
    this.setToken(null);
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.token;
  }

  // Get current token
  getToken() {
    return this.token;
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // User methods
  async getUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/users?${queryString}`);
  }

  async getUser(id) {
    return this.request(`/users/${id}`);
  }

  async updateUser(id, userData) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getEnrollableStudents(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/users/students/enrollable?${queryString}`);
  }

  async getUserStats(id) {
    return this.request(`/users/${id}/stats`);
  }

  // Class methods
  async getClasses() {
    return this.request('/classes');
  }

  async getClass(id) {
    return this.request(`/classes/${id}`);
  }

  async createClass(classData) {
    return this.request('/classes', {
      method: 'POST',
      body: JSON.stringify(classData),
    });
  }

  async updateClass(id, classData) {
    return this.request(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(classData),
    });
  }

  async deleteClass(id) {
    return this.request(`/classes/${id}`, {
      method: 'DELETE',
    });
  }

  async enrollStudent(classId, studentId) {
    return this.request(`/classes/${classId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    });
  }

  async removeStudent(classId, studentId) {
    return this.request(`/classes/${classId}/enroll/${studentId}`, {
      method: 'DELETE',
    });
  }

  // Assignment methods
  async getAssignments() {
    return this.request('/assignments');
  }

  async getClassAssignments(classId) {
    return this.request(`/assignments/class/${classId}`);
  }

  async getAssignment(id) {
    return this.request(`/assignments/${id}`);
  }

  async createAssignment(assignmentData) {
    return this.request('/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }

  async updateAssignment(id, assignmentData) {
    return this.request(`/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assignmentData),
    });
  }

  async deleteAssignment(id) {
    return this.request(`/assignments/${id}`, {
      method: 'DELETE',
    });
  }

  async submitAssignment(id, submissionData) {
    return this.request(`/assignments/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(submissionData),
    });
  }

  async gradeAssignment(assignmentId, submissionId, gradeData) {
    return this.request(`/assignments/${assignmentId}/grade/${submissionId}`, {
      method: 'PUT',
      body: JSON.stringify(gradeData),
    });
  }

  // Calendar methods
  async getEvents(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/calendar?${queryString}`);
  }

  async getEvent(id) {
    return this.request(`/calendar/${id}`);
  }

  async createEvent(eventData) {
    return this.request('/calendar', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(id, eventData) {
    return this.request(`/calendar/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  async deleteEvent(id) {
    return this.request(`/calendar/${id}`, {
      method: 'DELETE',
    });
  }



  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

// Export for use in frontend
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
} else if (typeof window !== 'undefined') {
  window.ApiClient = ApiClient;
} 
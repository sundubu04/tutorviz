// API Client for TutoriAI Frontend
// This client handles all communication with the backend API

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'admin';
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher';
}

export interface Class {
  id: string;
  name: string;
  description: string;
  iconName: string;
  iconColor: string;
  teacherName: string;
  studentCount: number;
  assignmentCount: number;
  type: 'enrolled' | 'teaching';
  createdAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  isUrgent: boolean;
  className: string;
  classId: string;
  submissionCount?: number;
  submissionId?: string;
  submittedAt?: string;
  grade?: number;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  eventType: string;
  isAllDay: boolean;
  classId?: string;
  className?: string;
  classDescription?: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null;

  constructor(baseURL: string = 'http://localhost:5001/api') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  // Set authentication token
  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // Get authentication headers
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // Generic request method
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
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
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async register(userData: RegisterData): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout(): Promise<void> {
    this.setToken(null);
  }

  async getProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/profile');
  }

  async updateProfile(profileData: Partial<User>): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Class methods
  async getClasses(): Promise<{ classes: Class[] }> {
    return this.request<{ classes: Class[] }>('/classes');
  }

  async getClass(id: string): Promise<{ class: Class }> {
    return this.request<{ class: Class }>(`/classes/${id}`);
  }

  async createClass(classData: {
    name: string;
    description?: string;
    iconName?: string;
    iconColor?: string;
  }): Promise<{ class: Class }> {
    return this.request<{ class: Class }>('/classes', {
      method: 'POST',
      body: JSON.stringify(classData),
    });
  }

  async updateClass(id: string, classData: Partial<Class>): Promise<{ class: Class }> {
    return this.request<{ class: Class }>(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(classData),
    });
  }

  async deleteClass(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/classes/${id}`, {
      method: 'DELETE',
    });
  }

  // Assignment methods
  async getAssignments(): Promise<{ assignments: Assignment[] }> {
    return this.request<{ assignments: Assignment[] }>('/assignments');
  }

  async getClassAssignments(classId: string): Promise<{ assignments: Assignment[] }> {
    return this.request<{ assignments: Assignment[] }>(`/assignments/class/${classId}`);
  }

  async getAssignment(id: string): Promise<{ assignment: Assignment }> {
    return this.request<{ assignment: Assignment }>(`/assignments/${id}`);
  }

  async createAssignment(assignmentData: {
    title: string;
    description?: string;
    classId: string;
    dueDate: string;
    isUrgent?: boolean;
  }): Promise<{ assignment: Assignment }> {
    return this.request<{ assignment: Assignment }>('/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }

  async updateAssignment(id: string, assignmentData: Partial<Assignment>): Promise<{ assignment: Assignment }> {
    return this.request<{ assignment: Assignment }>(`/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assignmentData),
    });
  }

  async deleteAssignment(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/assignments/${id}`, {
      method: 'DELETE',
    });
  }

  async submitAssignment(id: string, submissionData: {
    submissionText?: string;
    fileUrl?: string;
  }): Promise<{ submission: { id: string; submittedAt: string } }> {
    return this.request<{ submission: { id: string; submittedAt: string } }>(`/assignments/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(submissionData),
    });
  }

  // Calendar methods
  async getEvents(params?: {
    start?: string;
    end?: string;
    classId?: string;
  }): Promise<{ events: CalendarEvent[] }> {
    const queryParams = new URLSearchParams();
    if (params?.start) queryParams.append('start', params.start);
    if (params?.end) queryParams.append('end', params.end);
    if (params?.classId) queryParams.append('classId', params.classId);
    
    return this.request<{ events: CalendarEvent[] }>(`/calendar?${queryParams.toString()}`);
  }

  // Get events without authentication (for public access)
  async getEventsPublic(params?: {
    start?: string;
    end?: string;
    classId?: string;
  }): Promise<{ events: CalendarEvent[] }> {
    const queryParams = new URLSearchParams();
    if (params?.start) queryParams.append('start', params.start);
    if (params?.end) queryParams.append('end', params.end);
    if (params?.classId) queryParams.append('classId', params.classId);
    
    return this.request<{ events: CalendarEvent[] }>(`/calendar?${queryParams.toString()}`);
  }

  async getEvent(id: string): Promise<{ event: CalendarEvent }> {
    return this.request<{ event: CalendarEvent }>(`/calendar/${id}`);
  }

  async createEvent(eventData: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    eventType: string;
    classId?: string;
    isAllDay?: boolean;
  }): Promise<{ event: CalendarEvent }> {
    return this.request<{ event: CalendarEvent }>('/calendar', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async createEventPublic(eventData: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    eventType: string;
    classId?: string;
    isAllDay?: boolean;
  }): Promise<{ event: CalendarEvent }> {
    return this.request<{ event: CalendarEvent }>('/calendar', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(id: string, eventData: Partial<CalendarEvent>): Promise<{ event: CalendarEvent }> {
    return this.request<{ event: CalendarEvent }>(`/calendar/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  async deleteEvent(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/calendar/${id}`, {
      method: 'DELETE',
    });
  }

  // Delete event without authentication (for public access)
  async deleteEventPublic(id: string): Promise<{ message: string }> {
    const url = `${this.baseURL}/calendar/${id}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'DELETE',
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

  // Health check
  async healthCheck(): Promise<{ status: string; message: string; timestamp: string }> {
    return this.request<{ status: string; message: string; timestamp: string }>('/health');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Get current token
  getToken(): string | null {
    return this.token;
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export the class for testing or custom instances
export default ApiClient; 
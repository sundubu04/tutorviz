// API Client for Tutorviz Frontend
// This client handles all communication with the backend API

import { getApiBase } from '../config/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'admin';
  verified: boolean;
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
  priority: 'low' | 'normal' | 'high' | 'urgent';
  className: string;
  classId: string;
  submissionCount?: number;
  submissionId?: string;
  submittedAt?: string;
  grade?: number;
  createdAt: string;
  topic?: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
    uploadedAt: string;
  }>;
  assignedStudents?: string[];
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

export type AccessTokenGetter = () => Promise<string | null>;

class ApiClient {
  private baseURL: string;
  private token: string | null;
  /** When set, Bearer token is read from Supabase session on each request (avoids stale JWT after refresh). */
  private getAccessTokenFromSession: AccessTokenGetter | null = null;
  /** After local logout, ignore Supabase session until `setToken` is called with a new token (signOut is async). */
  private ignoreSupabaseSession = false;

  constructor(baseURL: string = getApiBase()) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  setAccessTokenGetter(getter: AccessTokenGetter | null): void {
    this.getAccessTokenFromSession = getter;
  }

  // Set authentication token (mirror for localStorage / isAuthenticated; API calls prefer session getter when set)
  setToken(token: string | null): void {
    if (token) {
      this.ignoreSupabaseSession = false;
    }
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  private async resolveAccessToken(): Promise<string | null> {
    if (this.ignoreSupabaseSession) {
      return null;
    }
    if (this.getAccessTokenFromSession) {
      try {
        const t = await this.getAccessTokenFromSession();
        return t && t.length > 0 ? t : null;
      } catch {
        return null;
      }
    }
    return this.token;
  }

  /** Current access token from Supabase session (or legacy mirror). Use for raw `fetch` calls. */
  async getAccessToken(): Promise<string | null> {
    return this.resolveAccessToken();
  }

  /** JSON request headers including fresh `Authorization` when a session exists. */
  async getJsonAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = await this.resolveAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  /** Optional `Authorization` only; for DELETE etc. */
  async getOptionalAuthHeaderMap(): Promise<Record<string, string>> {
    const token = await this.resolveAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async mergeRequestHeaders(
    options: RequestInit
  ): Promise<Headers> {
    const base = new Headers();
    // Only set JSON content-type when sending a JSON body.
    // For streaming GETs (SSE) or non-JSON payloads, callers can set headers explicitly.
    if (options.body !== undefined) {
      base.set('Content-Type', 'application/json');
    }
    const token = await this.resolveAccessToken();
    if (token) {
      base.set('Authorization', `Bearer ${token}`);
    }
    const extra = options.headers;
    if (extra) {
      new Headers(extra as HeadersInit).forEach((value, key) => {
        base.set(key, value);
      });
    }
    return base;
  }

  /**
   * `fetch` with the same Supabase-backed auth as `request()`.
   * Use for endpoints that need `Response` (e.g. blobs) or ad-hoc calls outside `request()`.
   * Default headers include `Content-Type: application/json` and `Authorization` when logged in.
   */
  async fetchWithAuth(url: string, init: RequestInit = {}): Promise<Response> {
    const headers = await this.mergeRequestHeaders(init);
    return fetch(url, { ...init, headers });
  }

  // Generic request method
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.mergeRequestHeaders(options);
    const config: RequestInit = {
      ...options,
      headers,
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
    this.ignoreSupabaseSession = true;
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

  // Admin methods
  async getPendingUsers(): Promise<{ users: User[] }> {
    return this.request<{ users: User[] }>('/users/pending');
  }

  async verifyUser(userId: string): Promise<{ message: string; user: User }> {
    return this.request<{ message: string; user: User }>(`/users/${userId}/verify`, {
      method: 'PATCH',
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

  // Get students for a class
  async getClassStudents(classId: string): Promise<{ students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  }> }> {
    return this.request<{ students: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      avatarUrl?: string;
    }> }>(`/classes/${classId}/students`);
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
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    topic?: string;
    assignedStudents?: string[];
    attachments?: File[];
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

  // Upload assignment attachment
  async uploadAssignmentAttachment(assignmentId: string, file: File): Promise<{ attachment: any }> {
    /*
     * FILE STORAGE SERVICE SPECIFICATIONS
     * 
     * CHOOSING A STORAGE SERVICE:
     * 
     * 1. AWS S3 (Recommended for production)
     *    - Pros: Highly scalable, reliable, cost-effective for large files
     *    - Cons: More complex setup, requires AWS knowledge
     *    - Best for: Large-scale applications, enterprise use
     *    - Cost: ~$0.023 per GB/month + transfer costs
     *    - Setup: Create S3 bucket, configure CORS, set up IAM roles
     * 
     * 2. Cloudinary (Recommended for ease of use)
     *    - Pros: Easy setup, built-in image optimization, generous free tier
     *    - Cons: Can be expensive for high volume, vendor lock-in
     *    - Best for: Small to medium applications, quick prototyping
     *    - Cost: Free tier (25GB storage, 25GB bandwidth), then $89/month
     *    - Setup: Sign up, get API keys, configure upload presets
     * 
     * 3. Firebase Storage (Good for Google ecosystem)
     *    - Pros: Easy integration with other Firebase services, good security
     *    - Cons: Limited to Google ecosystem, can be expensive
     *    - Best for: Applications using other Firebase services
     *    - Cost: Free tier (5GB storage, 1GB/day transfer), then pay-as-you-go
     *    - Setup: Create Firebase project, enable Storage, configure rules
     * 
     * 4. Supabase Storage (Good for PostgreSQL users)
     *    - Pros: Built-in with Supabase, PostgreSQL integration, Row Level Security
     *    - Cons: Limited to Supabase ecosystem
     *    - Best for: Applications using Supabase as backend
     *    - Cost: Free tier (1GB storage), then $25/month
     *    - Setup: Enable Storage in Supabase dashboard
     * 
     * 5. Local Storage (Development only)
     *    - Pros: Simple, no external dependencies
     *    - Cons: Not scalable, files lost on server restart
     *    - Best for: Development and testing only
     *    - Cost: Free
     *    - Setup: Create uploads directory, configure Express static serving
     * 
     * RECOMMENDED IMPLEMENTATION STEPS:
     * 
     * 1. For Development/Testing:
     *    - Use local storage with Express static serving
     *    - Create /uploads directory in backend
     *    - Configure multer for file handling
     * 
     * 2. For Production (Small to Medium):
     *    - Start with Cloudinary for simplicity
     *    - Easy setup, good documentation, reliable service
     * 
     * 3. For Production (Large Scale):
     *    - Use AWS S3 with CloudFront CDN
     *    - More control, better cost optimization, enterprise features
     * 
     * SECURITY CONSIDERATIONS:
     * 
     * 1. File Type Validation:
     *    - Whitelist allowed file types (PDF, DOC, images, etc.)
     *    - Check file extensions and MIME types
     *    - Scan for malware (optional but recommended)
     * 
     * 2. File Size Limits:
     *    - Set reasonable limits (e.g., 10MB per file)
     *    - Implement client and server-side validation
     * 
     * 3. Access Control:
     *    - Implement proper authentication for uploads
     *    - Use signed URLs for secure file access
     *    - Set up proper CORS policies
     * 
     * 4. File Organization:
     *    - Use unique file names to prevent conflicts
     *    - Organize files by assignment/user/date
     *    - Implement file cleanup for deleted assignments
     * 
     * IMPLEMENTATION EXAMPLE (Cloudinary):
     * 
     * ```javascript
     * // 1. Install: npm install cloudinary multer
     * 
     * // 2. Backend setup (backend/src/routes/assignments.js):
     * const cloudinary = require('cloudinary').v2;
     * const multer = require('multer');
     * 
     * cloudinary.config({
     *   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
     *   api_key: process.env.CLOUDINARY_API_KEY,
     *   api_secret: process.env.CLOUDINARY_API_SECRET
     * });
     * 
     * const upload = multer({ storage: multer.memoryStorage() });
     * 
     * // 3. Upload endpoint:
     * router.post('/:id/attachments', upload.single('file'), async (req, res) => {
     *   try {
     *     const result = await cloudinary.uploader.upload_stream({
     *       resource_type: 'auto',
     *       folder: 'assignments'
     *     }, (error, result) => {
     *       if (error) throw error;
     *       
     *       // Save to database
     *       await pool.query(
     *         'INSERT INTO assignment_attachments (assignment_id, file_name, file_url, file_size, file_type) VALUES ($1, $2, $3, $4, $5)',
     *         [req.params.id, req.file.originalname, result.secure_url, req.file.size, req.file.mimetype]
     *       );
     *       
     *       res.json({ attachment: result });
     *     }).end(req.file.buffer);
     *   } catch (error) {
     *     res.status(500).json({ error: 'Upload failed' });
     *   }
     * });
     * 
     * // 4. Frontend implementation:
     * const formData = new FormData();
     * formData.append('file', file);
     * 
     * const response = await fetch(`/api/assignments/${assignmentId}/attachments`, {
     *   method: 'POST',
     *   headers: { 'Authorization': `Bearer ${token}` },
     *   body: formData
     * });
     * ```
     */
    
    // For now, we'll simulate file upload
    // In a real implementation, you would:
    // 1. Upload file to storage service (AWS S3, Cloudinary, etc.)
    // 2. Get the file URL
    // 3. Save the attachment record to the database
    
    console.log(`📎 [API] Simulating file upload: ${file.name} (${file.size} bytes)`);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate successful upload
    const mockAttachment = {
      id: `att_${Date.now()}`,
      name: file.name,
      url: `https://example.com/uploads/${file.name}`,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString()
    };
    
    // TODO: Replace with actual backend call
    // return this.request<{ attachment: any }>(`/assignments/${assignmentId}/attachments`, {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     fileName: file.name,
    //     fileUrl: uploadedFileUrl, // From storage service
    //     fileSize: file.size,
    //     fileType: file.type
    //   })
    // });
    
    return { attachment: mockAttachment };
  }


}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export the class for testing or custom instances
export default ApiClient; 
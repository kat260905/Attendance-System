import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add the JWT token to headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle token refresh & unauthorized errors
api.interceptors.response.use((response) => {
  return response;
}, async (error) => {
  const originalRequest = error.config;
  
  if (error.response && error.response.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    
    // Check if the endpoint is not login/refresh to avoid infinite loops
    if (originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/refresh') {
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
            headers: {
              Authorization: `Bearer ${refreshToken}`
            }
          });
          
          if (res.data && res.data.access_token) {
            localStorage.setItem('access_token', res.data.access_token);
            originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // If refresh token fails, clear user data and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
  }
  
  return Promise.reject(error);
});

// Auth endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getCurrentUser: () => api.get('/auth/me'),
};

// Student endpoints
export const studentAPI = {
  getAll: (facultyId) => api.get('/students', {
    params: facultyId ? { faculty_id: facultyId } : {}
  }),
  getById: (id) => api.get(`/students/${id}`),
  create: (studentData) => api.post('/students', studentData),
  update: (id, studentData) => api.put(`/students/${id}`, studentData),
  delete: (id) => api.delete(`/students/${id}`),
  getBySession: (session_id) => api.get(`/sessions/${session_id}/students`),
};

// Faculty endpoints
export const facultyAPI = {
  getAll: () => api.get('/faculty'),
  getById: (id) => api.get(`/faculty/${id}`),
  create: (facultyData) => api.post('/faculty', facultyData),
  update: (id, facultyData) => api.put(`/faculty/${id}`, facultyData),
  delete: (id) => api.delete(`/faculty/${id}`),
  getFacultyClasses: (facultyId) => api.get(`/faculty/${facultyId}/classes`),

  // Dashboard endpoints
  getDashboardSummary: (facultyId) => api.get(`/faculty/${facultyId}/dashboard/summary`),
  getCourseAlerts: (facultyId) => api.get(`/faculty/${facultyId}/dashboard/alerts`),
  getWeeklyTrend: (facultyId) => api.get(`/faculty/${facultyId}/dashboard/weekly-trend`),
  getCourseComparison: (facultyId) => api.get(`/faculty/${facultyId}/dashboard/course-comparison`),
  getCourseDefaulters: (facultyId, classId, subjectId) =>
    api.get(`/faculty/${facultyId}/dashboard/course-defaulters`, {
      params: { class_id: classId, subject_id: subjectId }
    }),
};

// Subject endpoints
export const subjectAPI = {
  getAll: () => api.get('/subjects'),
  getById: (id) => api.get(`/subjects/${id}`),
  create: (subjectData) => api.post('/subjects', subjectData),
  update: (id, subjectData) => api.put(`/subjects/${id}`, subjectData),
  delete: (id) => api.delete(`/subjects/${id}`),
};

// Class Session endpoints
export const classSessionAPI = {
  getAll: () => api.get('/class-sessions'),
  getById: (id) => api.get(`/class-sessions/${id}`),
  create: (sessionData) => api.post('/class-sessions', sessionData),
  update: (id, sessionData) => api.put(`/class-sessions/${id}`, sessionData),
  delete: (id) => api.delete(`/class-sessions/${id}`),
  getByFaculty: (facultyId) => api.get(`/class-sessions/faculty/${facultyId}`),
  getBySubject: (subjectId) => api.get(`/class-sessions/subject/${subjectId}`),
  getByClass: (classId, facultyId) => api.get(`/class-sessions/class/${classId}`, {
    params: facultyId ? { faculty_id: facultyId } : {}
  }),
};

// Attendance endpoints
export const attendanceAPI = {
  markAttendance: (attendanceData) => api.post('/attendance/mark', attendanceData),
  markBySuffix: (data) => api.post('/attendance/mark-by-suffix', data),
  getSessionAttendance: (sessionId) => api.get(`/attendance/session/${sessionId}`),
  updateAttendance: (attendanceId, updateData) => api.put(`/attendance/${attendanceId}`, updateData),
  getReport: (params) => api.get('/attendance/report', { params }),
  exportAttendance: (params) => api.get('/attendance/export', {
    params,
    responseType: 'blob'
  }),
};

export const odAPI = {
  approve: (payload) => api.post('/od/approve', payload),
  getPending: (facultyId) => api.get('/od/pending', { params: { faculty_id: facultyId } }),
  apply: (odId, payload) => api.put(`/od/apply/${odId}`, payload),
  downloadDocument: (requestId) =>
    api.get(`/student/od/document/${requestId}`, {
      responseType: 'blob'
    }),
};

// Add to your api.js file

// Student OD APIs
export const studentODAPI = {
  // Submit OD request
  submitRequest: (data) => {
    // When sending FormData, let axios automatically set Content-Type with boundary
    return api.post('/student/od/submit', data);
  },

  // Get my requests
  getMyRequests: (studentId) =>
    api.get('/student/od/my-requests', {
      params: { student_id: studentId }
    }),

  cancelRequest: (requestId, studentId) =>
    api.put(`/student/od/cancel/${requestId}`, { student_id: studentId }),

  // Get attendance summary
  getAttendanceSummary: (studentId) =>
    api.get('/student/attendance/summary', {
      params: { student_id: studentId }
    }),

  // Download OD supporting document
  downloadDocument: (requestId) =>
    api.get(`/student/od/document/${requestId}`, {
      responseType: 'blob'
    })
};

// Admin OD APIs - Student-initiated OD workflow (Student -> Admin -> Faculty)
export const adminODAPI = {
  // Get pending student OD requests for admin to review
  getPendingRequests: () => api.get('/admin/od/pending-requests'),

  // Approve a student OD request (creates ApprovedODRequest for faculty to apply)
  approveRequest: (requestId, data) =>
    api.post(`/admin/od/approve-request/${requestId}`, data),

  // Reject a student OD request
  rejectRequest: (requestId, data) =>
    api.post(`/admin/od/reject-request/${requestId}`, data),

  // Download student OD supporting document
  downloadDocument: (requestId) =>
    api.get(`/student/od/document/${requestId}`, {
      responseType: 'blob'
    }),
};

// Admin Dashboard APIs
export const adminDashboardAPI = {
  getSummary: () => api.get('/admin/dashboard/summary'),
  getDepartmentAttendance: () => api.get('/admin/dashboard/department-attendance'),
  getYearWiseTrend: () => api.get('/admin/dashboard/year-wise-trend'),
  getFacultyPerformance: () => api.get('/admin/dashboard/faculty-performance'),
  getAlerts: () => api.get('/admin/dashboard/alerts'),
};

// System Settings API (ERP Sync Module Control)
export const systemSettingsAPI = {
  getSettings: () => api.get('/system-settings'),
  toggleScheduler: (data) => api.post('/system-settings/toggle-scheduler', data),
};


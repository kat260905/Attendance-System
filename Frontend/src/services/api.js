import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
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
};

export default api;



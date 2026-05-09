import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (firebaseToken: string) =>
    apiClient.post('/api/v1/auth/login', { firebase_token: firebaseToken }),
  register: (userData: any) =>
    apiClient.post('/api/v1/auth/register', userData),
  getMe: () => apiClient.get('/api/v1/auth/me'),
};

export const clientsAPI = {
  list: (skip = 0, limit = 100) =>
    apiClient.get(`/api/v1/clients?skip=${skip}&limit=${limit}`),
  get: (id: number) => apiClient.get(`/api/v1/clients/${id}`),
  create: (data: any) => apiClient.post('/api/v1/clients', data),
  update: (id: number, data: any) =>
    apiClient.put(`/api/v1/clients/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/v1/clients/${id}`),
};

export const auditsAPI = {
  list: (filters = {}) =>
    apiClient.get('/api/v1/audits', { params: filters }),
  get: (id: number) => apiClient.get(`/api/v1/audits/${id}`),
  create: (data: any) => apiClient.post('/api/v1/audits', data),
  update: (id: number, data: any) =>
    apiClient.put(`/api/v1/audits/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/v1/audits/${id}`),
};

export const tasksAPI = {
  list: (filters = {}) =>
    apiClient.get('/api/v1/tasks', { params: filters }),
  get: (id: number) => apiClient.get(`/api/v1/tasks/${id}`),
  create: (data: any) => apiClient.post('/api/v1/tasks', data),
  update: (id: number, data: any) =>
    apiClient.put(`/api/v1/tasks/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/v1/tasks/${id}`),
};

export const documentsAPI = {
  list: (filters = {}) =>
    apiClient.get('/api/v1/documents', { params: filters }),
  get: (id: number) => apiClient.get(`/api/v1/documents/${id}`),
  upload: (formData: FormData) =>
    apiClient.post('/api/v1/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: number, data: any) =>
    apiClient.put(`/api/v1/documents/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/v1/documents/${id}`),
};

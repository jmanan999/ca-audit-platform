import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (firebaseToken: string) =>
    apiClient.post('/api/v1/auth/login', { firebase_token: firebaseToken }),
  register: (userData: any) => apiClient.post('/api/v1/auth/register', userData),
  getMe: () => apiClient.get('/api/v1/auth/me'),
};

export const clientsAPI = {
  list: (skip = 0, limit = 100) =>
    apiClient.get(`/api/v1/clients?skip=${skip}&limit=${limit}`),
  get: (id: number) => apiClient.get(`/api/v1/clients/${id}`),
  create: (data: any) => apiClient.post('/api/v1/clients', data),
  update: (id: number, data: any) => apiClient.put(`/api/v1/clients/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/v1/clients/${id}`),
};

export const auditsAPI = {
  list: (filters = {}) => apiClient.get('/api/v1/audits', { params: filters }),
  get: (id: number) => apiClient.get(`/api/v1/audits/${id}`),
  create: (data: any) => apiClient.post('/api/v1/audits', data),
  update: (id: number, data: any) => apiClient.put(`/api/v1/audits/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/v1/audits/${id}`),
  finalize: (id: number, notes?: string) =>
    apiClient.put(`/api/v1/audits/${id}/finalize`, { ca_approval_notes: notes }),
  parseBrief: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/api/v1/audits/${id}/parse-brief`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getRequestList: (id: number) =>
    apiClient.get(`/api/v1/audits/${id}/request-list`),
  markRequested: (id: number) =>
    apiClient.post(`/api/v1/audits/${id}/mark-requested`),
  tallyImport: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/api/v1/audits/${id}/tally-import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  aiSample: (id: number, minValue: number, sampleSize: number) =>
    apiClient.post(`/api/v1/audits/${id}/ai-sample`, {
      min_value: minValue,
      sample_size: sampleSize,
    }),
};

export const verificationItemsAPI = {
  list: (auditId: number, filters: { status?: string; skip?: number; limit?: number } = {}) =>
    apiClient.get(`/api/v1/audits/${auditId}/verification-items`, { params: filters }),
  create: (auditId: number, data: any) =>
    apiClient.post(`/api/v1/audits/${auditId}/verification-items`, data),
  update: (itemId: number, data: any) =>
    apiClient.put(`/api/v1/verification-items/${itemId}`, data),
  bulkVerify: (itemIds: number[], caNotes?: string) =>
    apiClient.post('/api/v1/verification-items/bulk-verify', {
      item_ids: itemIds,
      ca_notes: caNotes,
    }),
  delete: (itemId: number) => apiClient.delete(`/api/v1/verification-items/${itemId}`),
  getEvidence: (itemId: number) =>
    apiClient.get(`/api/v1/verification-items/${itemId}/evidence`),
};

export const executivesAPI = {
  list: (isApproved?: boolean) =>
    apiClient.get('/api/v1/executives', {
      params: isApproved !== undefined ? { is_approved: isApproved } : {},
    }),
  approve: (id: number) => apiClient.put(`/api/v1/executives/${id}/approve`),
  reject: (id: number) => apiClient.put(`/api/v1/executives/${id}/reject`),
  delete: (id: number) => apiClient.delete(`/api/v1/executives/${id}`),
};

export const tasksAPI = {
  list: (filters = {}) => apiClient.get('/api/v1/tasks', { params: filters }),
  get: (id: number) => apiClient.get(`/api/v1/tasks/${id}`),
  create: (data: any) => apiClient.post('/api/v1/tasks', data),
  update: (id: number, data: any) => apiClient.put(`/api/v1/tasks/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/v1/tasks/${id}`),
};

export const documentsAPI = {
  list: (filters = {}) => apiClient.get('/api/v1/documents', { params: filters }),
  get: (id: number) => apiClient.get(`/api/v1/documents/${id}`),
  upload: (auditId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/api/v1/documents/upload?audit_id=${auditId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id: number, data: any) => apiClient.put(`/api/v1/documents/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/v1/documents/${id}`),
};

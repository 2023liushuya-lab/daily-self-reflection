import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = 'https://wurisanxingwushen.onrender.com/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  sendCode: (phone: string) => client.post('/auth/send-code', { phone }),
  verifyCode: (phone: string, code: string) => client.post('/auth/verify-code', { phone, code }),
};

export const goalsApi = {
  list: () => client.get('/goals'),
  create: (data: any) => client.post('/goals', data),
  update: (id: string, data: any) => client.put(`/goals/${id}`, data),
  delete: (id: string) => client.delete(`/goals/${id}`),
};

export const reviewsApi = {
  list: (params?: any) => client.get('/reviews', { params }),
  get: (id: string) => client.get(`/reviews/${id}`),
  create: (data: any) => client.post('/reviews', data),
  update: (id: string, data: any) => client.put(`/reviews/${id}`, data),
  delete: (id: string) => client.delete(`/reviews/${id}`),
  uploadAudio: (formData: FormData) =>
    client.post('/reviews/upload-audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getStats: () => client.get('/reviews/stats'),
};

export const coachApi = {
  getMessages: (reviewId: string) => client.get(`/reviews/${reviewId}/coach-messages`),
  sendMessage: (reviewId: string, content: string) =>
    client.post(`/reviews/${reviewId}/coach-messages`, { content }),
};

export const reportsApi = {
  get: (params: { type: string; date: string }) => client.get('/reports', { params }),
  generate: (data: { type: string; date: string }) => client.post('/reports/generate', data),
  getById: (id: string) => client.get(`/reports/${id}`),
};

export const userApi = {
  getProfile: () => client.get('/user/profile'),
  updateProfile: (data: any) => client.put('/user/profile', data),
};

export default client;

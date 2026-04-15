import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4001',
});

// Attach JWT on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('cd_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear token and redirect to login
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cd_token');
      localStorage.removeItem('cd_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

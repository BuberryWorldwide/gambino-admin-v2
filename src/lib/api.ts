// src/lib/api.ts

import axios from 'axios';
import { getToken, clearToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.gambino.gold';
console.log('🔍 API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,  // IMPORTANT: Enable sending cookies with requests
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - Add Bearer token to all requests
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      console.warn('🔒 Authentication failed - clearing tokens');
      clearToken();
      
      // Redirect to login unless already there
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    // Handle 403 Forbidden - insufficient permissions
    if (error.response?.status === 403) {
      console.warn('🚫 Insufficient permissions');
    }
    
    return Promise.reject(error);
  }
);

export default api;
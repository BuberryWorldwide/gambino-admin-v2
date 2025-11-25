// src/lib/api.ts

import axios from 'axios';
import { getToken, clearToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.gambino.gold';
console.log('🔍 API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 second timeout to prevent hung requests
  withCredentials: false,
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

// Track if we're already redirecting to prevent multiple 401 redirects
let isRedirecting = false;

// Response interceptor - Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout');
      error.message = 'Request timed out. Please check your connection and try again.';
      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response) {
      console.error('🌐 Network error:', error.message);
      error.message = 'Unable to connect to server. Please check your internet connection.';
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      console.warn('🔒 Authentication failed - clearing tokens');
      clearToken();

      // Redirect to login unless already there or already redirecting
      if (typeof window !== 'undefined' &&
          !window.location.pathname.includes('/login') &&
          !isRedirecting) {
        isRedirecting = true;
        window.location.href = '/login';
      }
    }

    // Handle 403 Forbidden - insufficient permissions
    if (error.response?.status === 403) {
      console.warn('🚫 Insufficient permissions');
      error.message = 'You do not have permission to perform this action.';
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      error.message = error.response?.data?.error || 'The requested resource was not found.';
    }

    // Handle 500 Server Error
    if (error.response?.status >= 500) {
      console.error('💥 Server error:', error.response?.status);
      error.message = 'Server error. Please try again later.';
    }

    return Promise.reject(error);
  }
);

export default api;
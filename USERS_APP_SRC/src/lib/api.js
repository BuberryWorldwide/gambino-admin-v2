// lib/api.js
import axios from 'axios';
import { getToken } from './auth';

// Use a single canonical env var.
const API = process.env.NEXT_PUBLIC_API_URL;

if (!API && typeof window !== 'undefined') {
  // Helpful hint in dev if you forgot to set it
  console.warn('NEXT_PUBLIC_API_URL is not set; requests will use same-origin.');
}

const api = axios.create({
  // Prefer the explicit API host; otherwise same-origin (no hardcoded IPs!)
  baseURL: API || '',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const isOnboarding = config.url?.includes('/onboarding/');
  if (!config.headers?.Authorization && !isOnboarding) {
    const t = getToken();
    if (t) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${t}`;
    }
  }
  return config;
});

export default api;

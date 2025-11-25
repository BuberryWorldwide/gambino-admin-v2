const KEY = 'gambino_token';
export function setToken(t) { if (typeof window !== 'undefined') localStorage.setItem(KEY, t); }
export function getToken() { return typeof window !== 'undefined' ? localStorage.getItem(KEY) : null; }
export function clearToken() { if (typeof window !== 'undefined') localStorage.removeItem(KEY); }

// src/lib/auth.ts
import type { User } from '@/types';

const isBrowser = typeof window !== 'undefined';

const AUTH_KEYS = {
  TOKEN: 'gambino_token',
  USER: 'gambino_user',
} as const;

/**
 * Set cookie (for server-side middleware access)
 */
function setCookie(name: string, value: string, days: number = 7): void {
  if (!isBrowser) return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  // Set cookie with security flags
  const cookieString = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict${
    process.env.NODE_ENV === 'production' ? '; Secure' : ''
  }`;
  
  document.cookie = cookieString;
}

/**
 * Delete cookie
 */
function deleteCookie(name: string): void {
  if (!isBrowser) return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Store authentication token and user data
 */
export function setToken(token: string, userData: User): void {
  if (!isBrowser) return;
  
  // Store in localStorage for client-side access
  localStorage.setItem(AUTH_KEYS.TOKEN, token);
  localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(userData));
  
  // ALSO store in cookie for server-side middleware
  setCookie(AUTH_KEYS.TOKEN, token, 7);
}

/**
 * Get authentication token
 */
export function getToken(): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem(AUTH_KEYS.TOKEN);
}

/**
 * Get stored user data
 */
export function getUser(): User | null {
  if (!isBrowser) return null;
  const user = localStorage.getItem(AUTH_KEYS.USER);
  if (!user) return null;
  
  try {
    return JSON.parse(user) as User;
  } catch (error) {
    console.error('Failed to parse user data:', error);
    return null;
  }
}

/**
 * Clear all authentication data
 */
export function clearToken(): void {
  if (!isBrowser) return;
  
  // Clear localStorage
  localStorage.removeItem(AUTH_KEYS.TOKEN);
  localStorage.removeItem(AUTH_KEYS.USER);
  
  // Clear cookie
  deleteCookie(AUTH_KEYS.TOKEN);
  
  // Clear any legacy auth data
  document.cookie = 'token=; Max-Age=0; path=/';
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!(getToken() && getUser());
}

/**
 * Get user's redirect URL based on role
 */
export function getUserRedirectUrl(userData: User | null): string {
  if (!userData) return '/login';
  
  if (userData.redirectTo) {
    return userData.redirectTo;
  }
  
  switch (userData.role) {
    case 'super_admin':
    case 'gambino_ops':
      return '/admin/dashboard';
    case 'venue_manager':
      return '/admin/venues';
    case 'venue_staff':
      return '/admin/reports';
    case 'user':
    default:
      return '/dashboard';
  }
}

/**
 * Check if user can access admin area
 */
export function canAccessAdmin(userData: User | null = null): boolean {
  const user = userData || getUser();
  if (!user) return false;
  return ['super_admin', 'gambino_ops', 'venue_manager', 'venue_staff'].includes(user.role);
}

/**
 * Check if user can access specific venue
 */
export function canAccessVenue(storeId: string, userData: User | null = null): boolean {
  const user = userData || getUser();
  if (!user) return false;
  
  // Admin roles can access all venues
  if (['super_admin', 'gambino_ops'].includes(user.role)) {
    return true;
  }
  
  // Regular users can access all venues for gameplay
  if (user.role === 'user') {
    return true;
  }
  
  // Venue staff/managers need to be assigned
  if (['venue_staff', 'venue_manager'].includes(user.role)) {
    return user.assignedVenues ? user.assignedVenues.includes(storeId) : false;
  }
  
  return false;
}

/**
 * Check if user can manage specific venue
 */
export function canManageVenue(storeId: string, userData: User | null = null): boolean {
  const user = userData || getUser();
  if (!user) return false;

  // Demo accounts cannot manage venues
  if (user.isDemo) return false;

  if (['super_admin', 'gambino_ops'].includes(user.role)) {
    return true;
  }

  if (user.role === 'venue_manager') {
    return user.assignedVenues ? user.assignedVenues.includes(storeId) : false;
  }

  return false;
}

/**
 * Check if user is in demo mode (read-only)
 */
export function isDemoMode(userData: User | null = null): boolean {
  const user = userData || getUser();
  return user?.isDemo === true;
}

/**
 * Check if an action should be blocked due to demo mode
 * Returns a message if blocked, null if allowed
 */
export function getDemoModeBlockMessage(action: string): string | null {
  if (!isDemoMode()) return null;
  return `This is a demo account. ${action} is disabled in demo mode.`;
}
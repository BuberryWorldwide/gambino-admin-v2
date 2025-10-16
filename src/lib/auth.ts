// src/lib/auth.ts
import type { User } from '@/types';

const isBrowser = typeof window !== 'undefined';

export function setToken(token: string, userData: User): void {
  if (!isBrowser) return;
  localStorage.setItem('gambino_token', token);
  localStorage.setItem('gambino_user', JSON.stringify(userData));
}

export function getToken(): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem('gambino_token');
}

export function getUser(): User | null {
  if (!isBrowser) return null;
  const user = localStorage.getItem('gambino_user');
  if (!user) return null;
  
  try {
    return JSON.parse(user) as User;
  } catch (error) {
    console.error('Failed to parse user data:', error);
    return null;
  }
}

export function clearToken(): void {
  if (!isBrowser) return;
  localStorage.removeItem('gambino_token');
  localStorage.removeItem('gambino_user');
}

export function isAuthenticated(): boolean {
  return !!(getToken() && getUser());
}

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
      return '/stores';
    case 'venue_staff':
      return '/stores';
    case 'user':
    default:
      return '/dashboard';
  }
}

export function canAccessAdmin(userData: User | null = null): boolean {
  const user = userData || getUser();
  if (!user) return false;
  return ['super_admin', 'gambino_ops', 'venue_manager', 'venue_staff'].includes(user.role);
}

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

export function canManageVenue(storeId: string, userData: User | null = null): boolean {
  const user = userData || getUser();
  if (!user) return false;
  
  if (['super_admin', 'gambino_ops'].includes(user.role)) {
    return true;
  }
  
  if (user.role === 'venue_manager') {
    return user.assignedVenues ? user.assignedVenues.includes(storeId) : false;
  }
  
  return false;
}
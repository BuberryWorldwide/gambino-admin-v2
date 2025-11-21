// src/components/layout/AdminLayout.tsx
'use client';

import { useState, ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { clearToken, getToken } from '@/lib/auth';
import api from '@/lib/api';
import axios from 'axios';

import {
  LayoutDashboard,
  Activity,
  Store,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  LucideIcon,
  FileText,
  DollarSign,
  Receipt,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface User {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

interface AdminLayoutProps {
  children: ReactNode;
  user?: User | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export default function AdminLayout({ children, user: userProp }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Start with closed sidebar on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Internal user state - load if not provided via props
  const [internalUser, setInternalUser] = useState<User | null>(null);

  // Use prop user if provided, otherwise use internal user
  const user = userProp || internalUser;
  
  // Load user data if not provided via props
  useEffect(() => {
    // Only load user if not provided via props
    if (!userProp) {
      const loadUser = async () => {
        try {
          const token = getToken();
          if (!token) return;

          const res = await api.get('/api/users/profile');
          setInternalUser(res.data.user);
        } catch (err) {
          console.error('Failed to load user in AdminLayout:', err);
          if (axios.isAxiosError(err) && err.response?.status === 401) {
            clearToken();
            window.location.href = '/login';
          }
        }
      };
      loadUser();
    }
  }, [userProp]);

  // Initialize sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      // Open by default on desktop (lg breakpoint = 1024px)
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    // Listen for window resizes
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-close sidebar on mobile when pathname changes (user navigated)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [pathname]);

  const handleLogout = async () => {
  try {
    // Clear the token first
    clearToken();

    // Try to call logout endpoint (optional)
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout API failed:', err);
    }

    // Force redirect to login
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout failed:', error);
    // Still clear token and redirect even if error
    clearToken();
    window.location.href = '/login';
  }
};

// Define role permissions
const rolePermissions: Record<string, string[]> = {
  super_admin: ['view_users', 'manage_users', 'view_all_stores', 'manage_all_stores', 'view_machines', 'manage_machines', 'process_cashouts', 'view_cashout_history', 'reverse_cashouts', 'system_admin'],
  gambino_ops: ['view_users', 'view_all_stores', 'manage_all_stores', 'view_machines', 'manage_machines', 'process_cashouts', 'view_cashout_history'],
  venue_manager: ['view_assigned_stores', 'manage_assigned_stores', 'view_machines', 'view_store_metrics', 'process_cashouts', 'view_cashout_history'],
  venue_staff: ['view_assigned_stores', 'view_machines', 'view_store_metrics', 'process_cashouts', 'view_cashout_history'],
};

// Calculate nav items based on current user
const userPermissions = rolePermissions[user?.role || 'venue_staff'] || [];

// Build nav items array with conditional Live Logs
const allNavItems: (NavItem & { permissions?: string[] })[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/hubs', label: 'Pi Hubs', icon: Activity, permissions: ['view_all_stores', 'view_assigned_stores'] },
  { href: '/admin/machines', label: 'Machines', icon: Activity, permissions: ['view_machines'] },
  { href: '/admin/cashout', label: 'Token Cashout', icon: DollarSign, permissions: ['process_cashouts'] },
  { href: '/admin/distributions', label: 'Distributions', icon: Send, permissions: ['system_admin'] },
  { href: '/admin/transactions', label: 'Transactions', icon: Receipt, permissions: ['view_cashout_history'] },
  // Add Live Logs for super_admin only
  ...(user?.role === 'super_admin' ? [{ href: '/admin/logs', label: 'Live Logs', icon: FileText }] : []),
  { href: '/admin/stores', label: 'Venues', icon: Store, permissions: ['view_all_stores', 'view_assigned_stores'] },
  { href: '/admin/users', label: 'Users', icon: Users, permissions: ['view_users', 'manage_users'] },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

const navItems = allNavItems.filter(item => {
  if (!item.permissions) return true; // Always show items without permission requirements
  return item.permissions.some(perm => userPermissions.includes(perm));
});

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Top Nav */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo & Menu Toggle */}
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="h-9 w-9 p-0"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              
              <div className="font-bold text-base sm:text-lg">Gambino Admin</div>
            </div>

            {/* Right: Theme Switcher & User */}
            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeSwitcher />

              <div className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-gray-800"></div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium">
                    {user?.firstName || 'Admin'} {user?.lastName || 'User'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user?.role?.replace('_', ' ') || 'Super Admin'}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-9 w-9 p-0 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar - Hidden on mobile unless toggled */}
        {sidebarOpen && (
          <>
            {/* Mobile overlay */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            
            {/* Sidebar */}
            <aside className="fixed lg:sticky top-[73px] left-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-[calc(100vh-73px)] z-50 lg:z-auto">
              <nav className="p-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </a>
                  );
                })}
              </nav>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
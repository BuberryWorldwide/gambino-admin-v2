// src/components/layout/AdminLayout.tsx
'use client';

import { useState, ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import DemoBanner from '@/components/DemoBanner';
import { clearToken, getToken, getUser } from '@/lib/auth';
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
  Send,
  ChevronRight,
  Gamepad2,
  UserCheck
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [internalUser, setInternalUser] = useState<User | null>(null);

  const user = userProp || internalUser;

  useEffect(() => {
    if (!userProp) {
      // First, try to get user from localStorage cache (fast, no API call)
      const cachedUser = getUser();
      if (cachedUser) {
        setInternalUser(cachedUser);
        return; // Don't make API call if we have cached data
      }

      // Only fetch from API if no cached user (rare - only on first load after login)
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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [pathname]);

  const handleLogout = async () => {
    try {
      clearToken();
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (err) {
        console.warn('Logout API failed:', err);
      }
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      clearToken();
      window.location.href = '/login';
    }
  };

  const rolePermissions: Record<string, string[]> = {
    super_admin: ['view_users', 'manage_users', 'verify_user_age', 'view_all_stores', 'manage_all_stores', 'view_machines', 'manage_machines', 'process_cashouts', 'view_cashout_history', 'reverse_cashouts', 'system_admin'],
    gambino_ops: ['view_users', 'verify_user_age', 'view_all_stores', 'manage_all_stores', 'view_machines', 'manage_machines', 'process_cashouts', 'view_cashout_history'],
    venue_manager: ['view_users', 'verify_user_age', 'view_assigned_stores', 'manage_assigned_stores', 'view_machines', 'view_store_metrics', 'process_cashouts', 'view_cashout_history'],
    venue_staff: ['view_users', 'verify_user_age', 'view_assigned_stores', 'view_machines', 'view_store_metrics', 'process_cashouts', 'view_cashout_history'],
  };

  const userPermissions = rolePermissions[user?.role || 'venue_staff'] || [];

  const allNavItems: (NavItem & { permissions?: string[] })[] = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/hubs', label: 'Pi Hubs', icon: Activity, permissions: ['view_all_stores', 'view_assigned_stores'] },
    { href: '/admin/machines', label: 'Machines', icon: Activity, permissions: ['view_machines'] },
    { href: '/admin/cashout', label: 'Token Cashout', icon: DollarSign, permissions: ['process_cashouts'] },
    { href: '/admin/distributions', label: 'Distributions', icon: Send, permissions: ['system_admin'] },
    { href: '/admin/mining', label: 'Mining Library', icon: Gamepad2, permissions: ['system_admin', 'manage_all_stores'] },
    { href: '/admin/transactions', label: 'Transactions', icon: Receipt, permissions: ['view_cashout_history'] },
    ...(user?.role === 'super_admin' ? [{ href: '/admin/logs', label: 'Live Logs', icon: FileText }] : []),
    { href: '/admin/stores', label: 'Venues', icon: Store, permissions: ['view_all_stores', 'view_assigned_stores'] },
    { href: '/admin/users', label: 'Users', icon: Users, permissions: ['view_users', 'manage_users'] },
    { href: '/admin/kyc', label: 'KYC Verify', icon: UserCheck, permissions: ['verify_user_age'] },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const navItems = allNavItems.filter(item => {
    if (!item.permissions) return true;
    return item.permissions.some(perm => userPermissions.includes(perm));
  });

  const getRoleLabel = (role?: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      gambino_ops: 'Operations',
      venue_manager: 'Venue Manager',
      venue_staff: 'Venue Staff',
    };
    return labels[role || ''] || 'Admin';
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Demo Mode Banner */}
      <DemoBanner />

      {/* Top Nav */}
      <nav className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-50">
        <div className="px-4 lg:px-6 h-16 flex items-center justify-between">
          {/* Left: Logo & Menu Toggle */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-9 w-9 p-0 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                <span className="text-neutral-900 font-bold text-sm">G</span>
              </div>
              <span className="text-neutral-900 dark:text-white font-semibold hidden sm:block">
                Gambino Admin
              </span>
            </div>
          </div>

          {/* Right: Theme Switcher & User */}
          <div className="flex items-center gap-3">
            <ThemeSwitcher />

            <div className="hidden sm:block h-6 w-px bg-neutral-200 dark:bg-neutral-800" />

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {user?.firstName || 'Admin'} {user?.lastName || ''}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {getRoleLabel(user?.role)}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-9 w-9 p-0 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        {sidebarOpen && (
          <>
            {/* Mobile overlay */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className="fixed lg:sticky top-16 left-0 w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 h-[calc(100vh-64px)] z-50 lg:z-auto overflow-y-auto">
              <nav className="p-3">
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </div>
                        {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                      </a>
                    );
                  })}
                </div>
              </nav>

              {/* User info on mobile */}
              <div className="sm:hidden p-4 border-t border-neutral-200 dark:border-neutral-800 mt-auto">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-neutral-900 font-semibold text-sm">
                    {user?.firstName?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-neutral-900 dark:text-white">
                      {user?.firstName} {user?.lastName}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {getRoleLabel(user?.role)}
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </div>
    </div>
  );
}

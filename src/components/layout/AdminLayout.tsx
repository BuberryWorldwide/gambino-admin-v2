// src/components/layout/AdminLayout.tsx
'use client';

import { useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import api from '@/lib/api';
import { clearToken } from '@/lib/auth';


import { 
  LayoutDashboard, 
  Activity, 
  Store, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X,
  LucideIcon
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

export default function AdminLayout({ children, user }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const navItems: NavItem[] = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/hubs', label: 'Pi Hubs', icon: Activity },
    { href: '/admin/machines', label: 'Machines', icon: Activity },
    { href: '/admin/stores', label: 'Venues', icon: Store },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Top Nav */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo & Menu Toggle */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="h-9 w-9 p-0"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              
              <div className="font-bold text-lg">Gambino Admin</div>
            </div>

            {/* Right: Theme Switcher & User */}
            <div className="flex items-center gap-4">
              <ThemeSwitcher />

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-800"></div>

              <div className="flex items-center gap-3">
                <div className="text-right">
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
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-[calc(100vh-73px)] sticky top-[73px]">
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
        )}

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
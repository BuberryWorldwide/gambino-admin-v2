// src/app/admin/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Activity, Server, Cpu, Store, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { getToken, clearToken } from '@/lib/auth';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface User {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  assignedVenues?: string[];
}

interface Store {
  storeId: string;
  storeName: string;
}

interface Hub {
  hubId: string;
  isOnline: boolean;
  storeId: string;
  store?: Store;
  lastHeartbeat?: string | Date;
}

interface Stats {
  totalHubs: number;
  onlineHubs: number;
  offlineHubs: number;
  totalMachines: number;
  totalStores: number;
}

interface ActivityItem {
  id: string;
  type: 'hub_online' | 'hub_offline' | 'machine_discovered';
  hubId?: string;
  machineId?: string;
  storeName?: string;
  timestamp: Date;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalHubs: 0,
    onlineHubs: 0,
    offlineHubs: 0,
    totalMachines: 0,
    totalStores: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // CHECK TOKEN FIRST! This prevents the infinite loop
    const token = getToken();
    
    if (!token) {
      console.log('No token found, redirecting to login');
      window.location.href = '/login';
      return;
    }

    loadUser();
    loadDashboard();
  }, []); // Keep empty dependency array

  const loadUser = async () => {
    try {
      const res = await api.get('/api/users/profile');
      setUser(res.data.user);
    } catch (err) {
      console.log('Failed to load user profile');
      
      // CRITICAL: Handle 401 errors
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        console.log('Unauthorized - clearing token and redirecting');
        clearToken();
        window.location.href = '/login';
        return;
      }
      
      setUser(null);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load hubs (already filtered by backend based on role)
      const hubsRes = await api.get('/api/admin/hubs');
      const hubs: Hub[] = hubsRes.data.hubs || [];

      // Load stores
      const storesRes = await api.get('/api/admin/stores');
      const stores = storesRes.data.stores || [];

      // Calculate stats
      const onlineHubs = hubs.filter(h => h.isOnline).length;
      const offlineHubs = hubs.length - onlineHubs;

      // Get total machines from hubs
      let totalMachines = 0;
      await Promise.all(
        hubs.map(async (hub) => {
          try {
            const res = await api.get(`/api/admin/hubs/${hub.hubId}/discovered-machines`);
            totalMachines += (res.data.machines || []).length;
          } catch (err) {
            console.error(`Failed to load machines for ${hub.hubId}`);
          }
        })
      );

      setStats({
        totalHubs: hubs.length,
        onlineHubs,
        offlineHubs,
        totalMachines,
        totalStores: stores.length,
      });

      // Generate recent activity from hubs
      const activity: ActivityItem[] = hubs
        .sort((a, b) => {
          const aTime = a.lastHeartbeat ? new Date(a.lastHeartbeat).getTime() : 0;
          const bTime = b.lastHeartbeat ? new Date(b.lastHeartbeat).getTime() : 0;
          return bTime - aTime;
        })
        .slice(0, 10)
        .map((hub, index) => ({
          id: `${hub.hubId}-${index}`,
          type: hub.isOnline ? 'hub_online' : 'hub_offline',
          hubId: hub.hubId,
          storeName: hub.store?.storeName || hub.storeId,
          timestamp: hub.lastHeartbeat ? new Date(hub.lastHeartbeat) : new Date(),
        }));

      setRecentActivity(activity);
    } catch (err: unknown) {
      console.error('Failed to load dashboard:', err);
      
      // CRITICAL: Handle 401 errors
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          console.log('Unauthorized - clearing token and redirecting');
          clearToken();
          window.location.href = '/login';
          return;
        }
        setError(err.response?.data?.error || 'Failed to load dashboard');
      } else {
        setError('Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <AdminLayout user={user}>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 dark:text-gray-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout user={user}>
        <div className="max-w-md mx-auto mt-12">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-900 p-6">
            <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Error Loading Dashboard</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={loadDashboard} className="w-full">
              Retry
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const isVenueManager = user?.role === 'venue_manager' || user?.role === 'venue_staff';

  return (
    <AdminLayout user={user}>
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-[73px] z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {isVenueManager ? 'Your venues overview' : 'System overview'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            label="Total Hubs"
            value={stats.totalHubs}
            icon={<Server className="w-5 h-5" />}
          />
          <StatCard
            label="Hubs Online"
            value={stats.onlineHubs}
            icon={<Activity className="w-5 h-5" />}
            variant="success"
          />
          <StatCard
            label="Hubs Offline"
            value={stats.offlineHubs}
            icon={<Server className="w-5 h-5" />}
            variant="warning"
          />
          <StatCard
            label="Discovered Machines"
            value={stats.totalMachines}
            icon={<Cpu className="w-5 h-5" />}
          />
          <StatCard
            label="Total Stores"
            value={stats.totalStores}
            icon={<Store className="w-5 h-5" />}
          />
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 mb-6">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Latest hub heartbeats and updates</p>
          </div>
          <div className="overflow-hidden">
            {recentActivity.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                No recent activity
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Hub ID</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.type === 'hub_online'
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                        }`}>
                          {item.type === 'hub_online' ? '✓ Online' : '○ Offline'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{item.hubId}</TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">{item.storeName}</TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                        {item.timestamp.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLink
            href="/admin/hubs"
            title="Manage Hubs"
            description="View and manage Pi hubs"
            icon={<Server className="w-6 h-6" />}
          />
          <QuickLink
            href="/admin/machines"
            title="Manage Machines"
            description="View and manage machines"
            icon={<Cpu className="w-6 h-6" />}
          />
          <QuickLink
            href="/admin/stores"
            title="Manage Stores"
            description="View and manage stores"
            icon={<Store className="w-6 h-6" />}
          />
        </div>
      </div>
    </AdminLayout>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning';
}

function StatCard({ label, value, icon, variant = 'default' }: StatCardProps) {
  const variants = {
    default: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
    success: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900',
    warning: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900',
  };

  return (
    <div className={`${variants[variant]} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-500 dark:text-gray-400">{icon}</div>
      </div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">{value}</div>
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{label}</div>
    </div>
  );
}

interface QuickLinkProps {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}
function QuickLink({ href, title, description, icon }: QuickLinkProps) {
  return (
    <a                    // ← YOU'RE MISSING THIS LINE!!!
      href={href}
      className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-gray-900 dark:hover:border-gray-100 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
          {icon}
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </a>
  );
}
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

// ADD THESE NEW INTERFACES after the existing ActivityItem interface:
interface MachineMetric {
  machineId: string;
  storeId: string;
  moneyIn: number;
  moneyOut: number;
  netRevenue: number;
  profitMargin: number;
  totalEvents: number;
}

interface StoreMetric {
  storeId: string;
  moneyIn: number;
  moneyOut: number;
  netRevenue: number;
  gambinoCut: number;
}

interface MachineMetrics {
  success: boolean;
  timeframe: string;
  summary: {
    totalMachines: number;
    totalStores: number;
    systemMoneyIn: number;
    systemMoneyOut: number;
    systemNetRevenue: number;
  };
  byStore: StoreMetric[];
  byMachine: MachineMetric[];
  lastUpdated: Date;
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
  const [machineMetrics, setMachineMetrics] = useState<MachineMetrics | null>(null);
  const [metricsTimeframe, setMetricsTimeframe] = useState('7d');

  useEffect(() => {
    const token = getToken();
    
    if (!token) {
      console.log('No token found, redirecting to login');
      window.location.href = '/login';
      return;
    }

    loadUser();
    loadDashboard();
  }, []);

  const loadUser = async () => {
    try {
      const res = await api.get('/api/users/profile');
      setUser(res.data.user);
    } catch (err) {
      console.log('Failed to load user profile');
      
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

    // Load hubs, stores, AND machine metrics in parallel
    const [hubsRes, storesRes, metricsRes] = await Promise.all([
      api.get('/api/admin/hubs'),
      api.get('/api/admin/stores'),
      api.get(`/api/admin/machine-metrics?timeframe=${metricsTimeframe}`)  // NEW!
    ]);

    const hubs: Hub[] = hubsRes.data.hubs || [];
    const stores = storesRes.data.stores || [];
    const metrics = metricsRes.data;  // NEW!

    // Calculate stats
    const onlineHubs = hubs.filter(h => h.isOnline).length;
    const offlineHubs = hubs.length - onlineHubs;

    setStats({
      totalHubs: hubs.length,
      onlineHubs,
      offlineHubs,
      totalMachines: metrics?.summary?.totalMachines || 0,  // Get from metrics now
      totalStores: stores.length,
    });

    setMachineMetrics(metrics);  // NEW!

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

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return timestamp.toLocaleDateString();
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
        <div className="max-w-md mx-auto mt-12 px-4">
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
      {/* Page Header - Mobile Optimized */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                {isVenueManager ? 'Your venues overview' : 'System overview'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Stats Grid - Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatCard
            label="Total Hubs"
            value={stats.totalHubs}
            icon={<Server className="w-4 h-4 sm:w-5 sm:h-5" />}
          />
          <StatCard
            label="Hubs Online"
            value={stats.onlineHubs}
            icon={<Activity className="w-4 h-4 sm:w-5 sm:h-5" />}
            variant="success"
          />
          <StatCard
            label="Hubs Offline"
            value={stats.offlineHubs}
            icon={<Server className="w-4 h-4 sm:w-5 sm:h-5" />}
            variant="warning"
          />
          <StatCard
            label="Machines"
            value={stats.totalMachines}
            icon={<Cpu className="w-4 h-4 sm:w-5 sm:h-5" />}
          />
          <StatCard
            label="Stores"
            value={stats.totalStores}
            icon={<Store className="w-4 h-4 sm:w-5 sm:h-5" />}
          />
        </div>

        {/* Machine Metrics Section - NEW! */}
{machineMetrics && (
  <div className="mt-8 space-y-6">
    {/* Revenue Summary Cards */}
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Revenue Overview
        </h2>
        <select 
          value={metricsTimeframe}
          onChange={(e) => {
            setMetricsTimeframe(e.target.value);
            loadDashboard();
          }}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Money IN</p>
            <Activity className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-500 mt-2">
            ${machineMetrics.summary.systemMoneyIn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Money OUT</p>
            <Activity className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-500 mt-2">
            ${machineMetrics.summary.systemMoneyOut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Net Revenue</p>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-500 mt-2">
            ${machineMetrics.summary.systemNetRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Profit Margin</p>
            <Activity className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500 mt-2">
            {machineMetrics.summary.systemMoneyIn > 0 
              ? ((machineMetrics.summary.systemNetRevenue / machineMetrics.summary.systemMoneyIn) * 100).toFixed(1)
              : '0.0'}%
          </p>
        </div>
      </div>
    </div>

    {/* Store Breakdown */}
    {machineMetrics.byStore.length > 0 && (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Revenue by Store
        </h3>
        <div className="space-y-4">
          {machineMetrics.byStore.map((store) => (
            <div 
              key={store.storeId}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {store.storeId}
                </h4>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Gambino Cut: ${store.gambinoCut.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Money IN</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-500">
                    ${store.moneyIn.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Money OUT</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-500">
                    ${store.moneyOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Net Revenue</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-500">
                    ${store.netRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Machine Breakdown for this store */}
              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Machines ({machineMetrics.byMachine.filter(m => m.storeId === store.storeId).length})
                </h5>
                <div className="space-y-2">
                  {machineMetrics.byMachine
                    .filter(m => m.storeId === store.storeId)
                    .sort((a, b) => b.netRevenue - a.netRevenue)
                    .map((machine) => (
                      <div 
                        key={machine.machineId}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {machine.machineId}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {machine.totalEvents} events
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-right">
                            <p className="text-green-600 dark:text-green-500 font-mono">
                              +${machine.moneyIn.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-red-600 dark:text-red-500 font-mono">
                              -${machine.moneyOut.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right min-w-[100px]">
                            <p className={`font-bold font-mono ${
                              machine.netRevenue >= 0 
                                ? 'text-blue-600 dark:text-blue-500' 
                                : 'text-red-600 dark:text-red-500'
                            }`}>
                              ${machine.netRevenue.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {machine.profitMargin.toFixed(1)}% margin
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}

        {/* Recent Activity - Mobile Cards / Desktop Table */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Latest hub heartbeats and updates</p>
          </div>

          {recentActivity.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-gray-500 dark:text-gray-400">
              No recent activity
            </div>
          ) : (
            <>
              {/* Mobile: Card Layout */}
              <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-800">
                {recentActivity.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.type === 'hub_online'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                      }`}>
                        {item.type === 'hub_online' ? '✓ Online' : '○ Offline'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                    <div className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {item.hubId}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {item.storeName}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table Layout */}
              <div className="hidden lg:block overflow-x-auto">
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
                        <TableCell className="font-medium font-mono">{item.hubId}</TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">{item.storeName}</TableCell>
                        <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                          {item.timestamp.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        {/* Quick Links - Already Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <QuickLink
            href="/admin/hubs"
            title="Manage Hubs"
            description="View and manage Pi hubs"
            icon={<Server className="w-5 h-5 sm:w-6 sm:h-6" />}
          />
          <QuickLink
            href="/admin/machines"
            title="Manage Machines"
            description="View and manage machines"
            icon={<Cpu className="w-5 h-5 sm:w-6 sm:h-6" />}
          />
          <QuickLink
            href="/admin/stores"
            title="Manage Stores"
            description="View and manage stores"
            icon={<Store className="w-5 h-5 sm:w-6 sm:h-6" />}
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
    <div className={`${variants[variant]} border rounded-lg p-3 sm:p-4`}>
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <div className="text-gray-500 dark:text-gray-400">{icon}</div>
      </div>
      <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-0.5 sm:mb-1">{value}</div>
      <div className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase leading-tight">{label}</div>
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
    <a
      href={href}
      className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 sm:p-6 hover:border-gray-900 dark:hover:border-gray-100 transition-colors active:scale-[0.98]"
    >
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
          {icon}
        </div>
        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </a>
  );
}
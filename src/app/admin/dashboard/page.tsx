// src/app/admin/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Activity, Server, Cpu, Store, AlertCircle, RefreshCw, ArrowRight, TrendingUp, TrendingDown, DollarSign, ChevronDown } from 'lucide-react';
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

interface StoreData {
  storeId: string;
  storeName: string;
  city?: string;
  state?: string;
}

interface Hub {
  hubId: string;
  isOnline: boolean;
  storeId: string;
  store?: StoreData;
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

  // Venue manager specific state
  const [assignedStores, setAssignedStores] = useState<StoreData[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('all');

  useEffect(() => {
    const token = getToken();

    if (!token) {
      console.log('No token found, redirecting to login');
      window.location.href = '/login';
      return;
    }

    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user, metricsTimeframe, selectedStore]);

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

      const isVenueRole = user?.role === 'venue_manager' || user?.role === 'venue_staff';

      if (isVenueRole) {
        // Load venue manager dashboard
        const [storesRes, hubsRes, metricsRes] = await Promise.all([
          api.get('/api/admin/stores'),
          api.get('/api/admin/hubs'),
          api.get(`/api/admin/machine-metrics?timeframe=${metricsTimeframe}`).catch(() => ({ data: null }))
        ]);

        const allStores = storesRes.data.stores || [];
        const allHubs = hubsRes.data.hubs || [];
        const metrics = metricsRes.data;

        // Filter to assigned venues
        const myStores = allStores.filter((s: StoreData) =>
          user?.assignedVenues?.includes(s.storeId)
        );
        setAssignedStores(myStores);

        const myHubs = allHubs.filter((h: Hub) =>
          user?.assignedVenues?.includes(h.storeId)
        );

        // Filter by selected store if not 'all'
        const filteredHubs = selectedStore === 'all'
          ? myHubs
          : myHubs.filter((h: Hub) => h.storeId === selectedStore);

        // Count machines
        let totalMachines = 0;
        for (const hub of filteredHubs) {
          try {
            const machinesRes = await api.get(`/api/admin/hubs/${hub.hubId}/discovered-machines`);
            totalMachines += (machinesRes.data.machines || []).length;
          } catch {
            // ignore
          }
        }

        const onlineHubs = filteredHubs.filter((h: Hub) => h.isOnline).length;

        setStats({
          totalHubs: filteredHubs.length,
          onlineHubs,
          offlineHubs: filteredHubs.length - onlineHubs,
          totalMachines,
          totalStores: selectedStore === 'all' ? myStores.length : 1,
        });

        // Filter metrics to assigned venues
        if (metrics) {
          const filteredByStore = metrics.byStore?.filter((s: StoreMetric) =>
            selectedStore === 'all'
              ? user?.assignedVenues?.includes(s.storeId)
              : s.storeId === selectedStore
          ) || [];

          const filteredByMachine = metrics.byMachine?.filter((m: MachineMetric) =>
            selectedStore === 'all'
              ? user?.assignedVenues?.includes(m.storeId)
              : m.storeId === selectedStore
          ) || [];

          const totalMoneyIn = filteredByStore.reduce((sum: number, s: StoreMetric) => sum + s.moneyIn, 0);
          const totalMoneyOut = filteredByStore.reduce((sum: number, s: StoreMetric) => sum + s.moneyOut, 0);
          const totalNetRevenue = filteredByStore.reduce((sum: number, s: StoreMetric) => sum + s.netRevenue, 0);

          setMachineMetrics({
            ...metrics,
            summary: {
              ...metrics.summary,
              systemMoneyIn: totalMoneyIn,
              systemMoneyOut: totalMoneyOut,
              systemNetRevenue: totalNetRevenue,
              totalMachines: filteredByMachine.length,
            },
            byStore: filteredByStore,
            byMachine: filteredByMachine,
          });
        }

        // Activity
        const activity: ActivityItem[] = filteredHubs
          .sort((a: Hub, b: Hub) => {
            const aTime = a.lastHeartbeat ? new Date(a.lastHeartbeat).getTime() : 0;
            const bTime = b.lastHeartbeat ? new Date(b.lastHeartbeat).getTime() : 0;
            return bTime - aTime;
          })
          .slice(0, 5)
          .map((hub: Hub, index: number) => ({
            id: `${hub.hubId}-${index}`,
            type: hub.isOnline ? 'hub_online' : 'hub_offline',
            hubId: hub.hubId,
            storeName: hub.store?.storeName || hub.storeId,
            timestamp: hub.lastHeartbeat ? new Date(hub.lastHeartbeat) : new Date(),
          }));

        setRecentActivity(activity);

      } else {
        // Super admin / Gambino ops - load everything
        const [hubsRes, storesRes, metricsRes] = await Promise.all([
          api.get('/api/admin/hubs'),
          api.get('/api/admin/stores'),
          api.get(`/api/admin/machine-metrics?timeframe=${metricsTimeframe}`)
        ]);

        const hubs: Hub[] = hubsRes.data.hubs || [];
        const stores = storesRes.data.stores || [];
        const metrics = metricsRes.data || {};

        const onlineHubs = hubs.filter(h => h.isOnline).length;
        const offlineHubs = hubs.length - onlineHubs;

        setStats({
          totalHubs: hubs.length,
          onlineHubs,
          offlineHubs,
          totalMachines: metrics?.summary?.totalMachines || 0,
          totalStores: stores.length,
        });

        setMachineMetrics(metrics);

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
      }
    } catch (err: unknown) {
      console.error('Failed to load dashboard:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || 'Failed to load dashboard');
      } else if (err instanceof Error) {
        setError(err.message);
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

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calculateGrowth = () => {
    // Placeholder - would need historical data comparison
    if (!machineMetrics?.summary?.systemMoneyIn) return null;
    return ((machineMetrics.summary.systemNetRevenue / (machineMetrics.summary.systemMoneyIn || 1)) * 100);
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
  const growth = calculateGrowth();

  // ==================== VENUE MANAGER DASHBOARD ====================
  if (isVenueManager) {
    return (
      <AdminLayout user={user}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
          {/* Header */}
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {assignedStores.length} venue{assignedStores.length !== 1 ? 's' : ''} • {metricsTimeframe === '24h' ? 'Today' : metricsTimeframe === '7d' ? 'This Week' : metricsTimeframe === '30d' ? 'This Month' : 'Last 90 Days'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Location Selector */}
            {assignedStores.length > 1 && (
              <div className="relative">
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                >
                  <option value="all">All Locations</option>
                  {assignedStores.map((store) => (
                    <option key={store.storeId} value={store.storeId}>
                      {store.storeName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>

          <div className="px-4 py-6 space-y-6">
            {/* Profit Summary Card */}
            {machineMetrics && (
              <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-5 text-black shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-sm font-medium opacity-80">Net Profit</span>
                </div>
                <div className="text-3xl font-bold mb-1">
                  ${formatCurrency(machineMetrics.summary.systemNetRevenue)}
                </div>
                {growth !== null && (
                  <div className="flex items-center gap-1 text-sm">
                    {growth >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="font-medium">
                      {growth >= 0 ? '+' : ''}{growth.toFixed(1)}% margin
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Cash In / Out / Profit Cards */}
            {machineMetrics && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cash In</span>
                  </div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    ${formatCurrency(machineMetrics.summary.systemMoneyIn)}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cash Out</span>
                  </div>
                  <div className="text-xl font-bold text-red-600 dark:text-red-400">
                    ${formatCurrency(machineMetrics.summary.systemMoneyOut)}
                  </div>
                </div>
              </div>
            )}

            {/* Timeframe Selector */}
            <div className="flex gap-2">
              {['24h', '7d', '30d', '90d'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setMetricsTimeframe(tf)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    metricsTimeframe === tf
                      ? 'bg-yellow-400 text-black'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {tf === '24h' ? '24H' : tf === '7d' ? '7D' : tf === '30d' ? '30D' : '90D'}
                </button>
              ))}
            </div>

            {/* Machines Table */}
            {machineMetrics && machineMetrics.byMachine.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Machines
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {machineMetrics.byMachine.length} machine{machineMetrics.byMachine.length !== 1 ? 's' : ''} active
                  </p>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {/* Header */}
                  <div className="grid grid-cols-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <div>Machine</div>
                    <div className="text-right">Cash In</div>
                    <div className="text-right">Cash Out</div>
                  </div>

                  {/* Rows */}
                  {machineMetrics.byMachine
                    .sort((a, b) => b.netRevenue - a.netRevenue)
                    .map((machine) => (
                      <div key={machine.machineId} className="grid grid-cols-3 px-4 py-3 items-center">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {machine.machineId}
                          </p>
                          {selectedStore === 'all' && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {machine.storeId}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            ${formatCurrency(machine.moneyIn)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            -${formatCurrency(machine.moneyOut)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Hub Status */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">System Status</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalHubs}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Hubs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.onlineHubs}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Online</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalMachines}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Machines</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentActivity.map((item) => (
                    <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          item.type === 'hub_online' ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.hubId}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.storeName}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ==================== SUPER ADMIN DASHBOARD ====================
  return (
    <AdminLayout user={user}>
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                System overview
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
        {/* Stats Grid */}
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

        {/* Machine Metrics Section */}
        {machineMetrics && (
          <div className="space-y-6">
            {/* Revenue Summary */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Revenue Overview
                </h2>
                <select
                  value={metricsTimeframe}
                  onChange={(e) => setMetricsTimeframe(e.target.value)}
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
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-500 mt-2">
                    ${formatCurrency(machineMetrics.summary.systemMoneyIn)}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Money OUT</p>
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  </div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-500 mt-2">
                    ${formatCurrency(machineMetrics.summary.systemMoneyOut)}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Net Revenue</p>
                    <DollarSign className="w-4 h-4 text-yellow-500" />
                  </div>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500 mt-2">
                    ${formatCurrency(machineMetrics.summary.systemNetRevenue)}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Profit Margin</p>
                    <Activity className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-500 mt-2">
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
                            ${formatCurrency(store.moneyIn)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Money OUT</p>
                          <p className="text-xl font-bold text-red-600 dark:text-red-500">
                            ${formatCurrency(store.moneyOut)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Net Revenue</p>
                          <p className="text-xl font-bold text-yellow-600 dark:text-yellow-500">
                            ${formatCurrency(store.netRevenue)}
                          </p>
                        </div>
                      </div>

                      {/* Machine Breakdown */}
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
                                        ? 'text-yellow-600 dark:text-yellow-500'
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

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Latest hub heartbeats</p>
          </div>

          {recentActivity.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-gray-500 dark:text-gray-400">
              No recent activity
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
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

              {/* Desktop Table */}
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

        {/* Quick Links */}
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
      className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 sm:p-6 hover:border-yellow-500 dark:hover:border-yellow-500 transition-colors active:scale-[0.98]"
    >
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="text-gray-500 dark:text-gray-400 group-hover:text-yellow-500 transition-colors">
          {icon}
        </div>
        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-yellow-500 transition-colors" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </a>
  );
}

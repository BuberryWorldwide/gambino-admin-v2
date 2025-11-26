// src/app/admin/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Activity, Server, Cpu, Store, AlertCircle, RefreshCw, ArrowRight, TrendingUp, TrendingDown, DollarSign, ChevronDown, Wifi, WifiOff } from 'lucide-react';
import api from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { getToken, clearToken } from '@/lib/auth';

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
        // NOTE: API routes already filter data based on user's assigned venues
        const [storesRes, hubsRes, metricsRes] = await Promise.all([
          api.get('/api/admin/stores'),
          api.get('/api/admin/hubs'),
          api.get(`/api/admin/machine-metrics?timeframe=${metricsTimeframe}`).catch((err) => {
            console.log('Metrics fetch failed:', err?.response?.status);
            return { data: null };
          })
        ]);

        // API already scopes data to assigned venues for venue managers
        const allStores = storesRes.data.stores || [];
        const allHubs = hubsRes.data.hubs || [];
        const metrics = metricsRes.data;

        console.log('Dashboard data loaded:', {
          stores: allStores.length,
          hubs: allHubs.length,
          hasMetrics: !!metrics,
          metricsStores: metrics?.byStore?.length || 0,
          metricsMachines: metrics?.byMachine?.length || 0,
          assignedVenues: user?.assignedVenues
        });

        // Use all stores returned by API (already filtered server-side)
        setAssignedStores(allStores);

        // Filter by selected store if not 'all'
        const filteredHubs = selectedStore === 'all'
          ? allHubs
          : allHubs.filter((h: Hub) => h.storeId === selectedStore);

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
          totalStores: selectedStore === 'all' ? allStores.length : 1,
        });

        // Use metrics directly (API already scopes to assigned venues)
        if (metrics && metrics.success !== false) {
          // Apply local store filter if a specific store is selected
          const filteredByStore = selectedStore === 'all'
            ? (metrics.byStore || [])
            : (metrics.byStore || []).filter((s: StoreMetric) => s.storeId === selectedStore);

          const filteredByMachine = selectedStore === 'all'
            ? (metrics.byMachine || [])
            : (metrics.byMachine || []).filter((m: MachineMetric) => m.storeId === selectedStore);

          // Recalculate totals based on filtered data
          const totalMoneyIn = filteredByStore.reduce((sum: number, s: StoreMetric) => sum + (s.moneyIn || 0), 0);
          const totalMoneyOut = filteredByStore.reduce((sum: number, s: StoreMetric) => sum + (s.moneyOut || 0), 0);
          const totalNetRevenue = filteredByStore.reduce((sum: number, s: StoreMetric) => sum + (s.netRevenue || 0), 0);

          setMachineMetrics({
            ...metrics,
            summary: {
              ...metrics.summary,
              systemMoneyIn: selectedStore === 'all' ? (metrics.summary?.systemMoneyIn || totalMoneyIn) : totalMoneyIn,
              systemMoneyOut: selectedStore === 'all' ? (metrics.summary?.systemMoneyOut || totalMoneyOut) : totalMoneyOut,
              systemNetRevenue: selectedStore === 'all' ? (metrics.summary?.systemNetRevenue || totalNetRevenue) : totalNetRevenue,
              totalMachines: filteredByMachine.length,
            },
            byStore: filteredByStore,
            byMachine: filteredByMachine,
          });
        } else {
          // No metrics available - set empty state
          setMachineMetrics(null);
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
    if (!machineMetrics?.summary?.systemMoneyIn) return null;
    return ((machineMetrics.summary.systemNetRevenue / (machineMetrics.summary.systemMoneyIn || 1)) * 100);
  };

  if (loading) {
    return (
      <AdminLayout user={user}>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-4" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout user={user}>
        <div className="max-w-md mx-auto mt-12 px-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Error Loading Dashboard</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">{error}</p>
            <Button onClick={loadDashboard} className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900">
              Try Again
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
    const netProfit = machineMetrics?.summary?.systemNetRevenue || 0;
    const cashIn = machineMetrics?.summary?.systemMoneyIn || 0;
    const cashOut = machineMetrics?.summary?.systemMoneyOut || 0;
    const profitMargin = cashIn > 0 ? ((netProfit / cashIn) * 100) : 0;

    return (
      <AdminLayout user={user}>
        <div className="p-4 lg:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Dashboard</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {assignedStores.length} venue{assignedStores.length !== 1 ? 's' : ''} • {metricsTimeframe === '24h' ? 'Today' : metricsTimeframe === '7d' ? 'This Week' : metricsTimeframe === '30d' ? 'This Month' : 'Last 90 Days'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-neutral-200 dark:border-neutral-800"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Location Selector */}
          {assignedStores.length > 1 && (
            <div className="relative">
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
              >
                <option value="all">All Locations</option>
                {assignedStores.map((store) => (
                  <option key={store.storeId} value={store.storeId}>
                    {store.storeName}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
            </div>
          )}

          {/* Timeframe Selector - Moved to top for better UX */}
          <div className="flex gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            {['24h', '7d', '30d', '90d'].map((tf) => (
              <button
                key={tf}
                onClick={() => setMetricsTimeframe(tf)}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  metricsTimeframe === tf
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {tf === '24h' ? '24H' : tf === '7d' ? '7D' : tf === '30d' ? '30D' : '90D'}
              </button>
            ))}
          </div>

          {/* Profit Summary Card - Always show */}
          <div className={`rounded-2xl p-6 ${netProfit >= 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-neutral-900' : 'bg-gradient-to-br from-red-500 to-red-600 text-white'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <span className="text-sm font-medium opacity-80">Net Profit</span>
              </div>
              <span className="text-xs font-medium opacity-70 uppercase">
                {metricsTimeframe === '24h' ? 'Today' : metricsTimeframe === '7d' ? '7 Days' : metricsTimeframe === '30d' ? '30 Days' : '90 Days'}
              </span>
            </div>
            <div className="text-4xl font-bold mb-2">
              ${formatCurrency(netProfit)}
            </div>
            <div className="flex items-center gap-1 text-sm">
              {profitMargin >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="font-medium">
                {profitMargin >= 0 ? '+' : ''}{profitMargin.toFixed(1)}% margin
              </span>
            </div>
          </div>

          {/* Cash Flow Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium">Cash In</span>
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${formatCurrency(cashIn)}
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium">Cash Out</span>
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                ${formatCurrency(cashOut)}
              </div>
            </div>
          </div>

          {/* System Status - More prominent */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="font-semibold text-neutral-900 dark:text-white">System Status</h2>
            </div>
            <div className="grid grid-cols-3 divide-x divide-neutral-200 dark:divide-neutral-800">
              <div className="p-5 text-center">
                <div className="text-3xl font-bold text-neutral-900 dark:text-white">{stats.totalHubs}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 uppercase tracking-wide">Hubs</div>
              </div>
              <div className="p-5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.onlineHubs}</span>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 uppercase tracking-wide">Online</div>
              </div>
              <div className="p-5 text-center">
                <div className="text-3xl font-bold text-neutral-900 dark:text-white">{stats.totalMachines}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 uppercase tracking-wide">Machines</div>
              </div>
            </div>
          </div>

          {/* Top Performing Machines */}
          {machineMetrics && machineMetrics.byMachine.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-neutral-900 dark:text-white">Machine Performance</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {machineMetrics.byMachine.length} machine{machineMetrics.byMachine.length !== 1 ? 's' : ''} active
                  </p>
                </div>
                <a href="/admin/machines" className="text-xs text-yellow-600 dark:text-yellow-400 hover:underline font-medium">
                  View All →
                </a>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {/* Header row */}
                <div className="px-5 py-3 bg-neutral-50 dark:bg-neutral-800/50 grid grid-cols-4 gap-4 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                  <div>Machine</div>
                  <div className="text-right">In</div>
                  <div className="text-right">Out</div>
                  <div className="text-right">Net</div>
                </div>
                {machineMetrics.byMachine
                  .sort((a, b) => b.netRevenue - a.netRevenue)
                  .slice(0, 10)
                  .map((machine, index) => (
                    <div key={`${machine.storeId}-${machine.machineId}-${index}`} className="px-5 py-4 grid grid-cols-4 gap-4 items-center hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            index < 3
                              ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                          }`}>
                            {index + 1}
                          </span>
                          <p className="font-medium text-neutral-900 dark:text-white text-sm truncate">
                            {machine.machineId}
                          </p>
                        </div>
                        {selectedStore === 'all' && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate ml-7">
                            {machine.storeId}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-green-600 dark:text-green-400 font-medium text-sm">
                          ${formatCurrency(machine.moneyIn)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-red-600 dark:text-red-400 font-medium text-sm">
                          ${formatCurrency(machine.moneyOut)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold text-sm ${machine.netRevenue >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                          ${formatCurrency(machine.netRevenue)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Venue Breakdown - Only show when viewing all locations */}
          {selectedStore === 'all' && machineMetrics && machineMetrics.byStore.length > 1 && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="font-semibold text-neutral-900 dark:text-white">Revenue by Venue</h2>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {machineMetrics.byStore
                  .sort((a, b) => b.netRevenue - a.netRevenue)
                  .map((store) => {
                    const storeName = assignedStores.find(s => s.storeId === store.storeId)?.storeName || store.storeId;
                    const machineCount = machineMetrics.byMachine.filter(m => m.storeId === store.storeId).length;
                    return (
                      <div key={store.storeId} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-neutral-900 dark:text-white text-sm">{storeName}</span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {machineCount} machine{machineCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-green-600 dark:text-green-400">+${formatCurrency(store.moneyIn)}</span>
                          <span className="text-red-600 dark:text-red-400">-${formatCurrency(store.moneyOut)}</span>
                          <span className={`ml-auto font-bold ${store.netRevenue >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                            ${formatCurrency(store.netRevenue)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="font-semibold text-neutral-900 dark:text-white">Recent Activity</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Hub connectivity status</p>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {recentActivity.map((item) => (
                  <div key={item.id} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        item.type === 'hub_online' ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">{item.hubId}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.storeName}</p>
                      </div>
                    </div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <a
              href="/admin/machines"
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 hover:border-yellow-500 dark:hover:border-yellow-500 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <Cpu className="w-5 h-5 text-neutral-500 dark:text-neutral-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400" />
                <ArrowRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:text-yellow-500" />
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white text-sm">Machines</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">View all machines</p>
            </a>
            <a
              href="/admin/hubs"
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 hover:border-yellow-500 dark:hover:border-yellow-500 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <Server className="w-5 h-5 text-neutral-500 dark:text-neutral-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400" />
                <ArrowRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:text-yellow-500" />
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white text-sm">Pi Hubs</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Manage hub devices</p>
            </a>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ==================== SUPER ADMIN DASHBOARD ====================
  return (
    <AdminLayout user={user}>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">System overview and metrics</p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-neutral-200 dark:border-neutral-800"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Hubs" value={stats.totalHubs} icon={<Server className="w-5 h-5" />} />
          <StatCard label="Online" value={stats.onlineHubs} icon={<Wifi className="w-5 h-5" />} variant="success" />
          <StatCard label="Offline" value={stats.offlineHubs} icon={<WifiOff className="w-5 h-5" />} variant="warning" />
          <StatCard label="Machines" value={stats.totalMachines} icon={<Cpu className="w-5 h-5" />} />
          <StatCard label="Venues" value={stats.totalStores} icon={<Store className="w-5 h-5" />} />
        </div>

        {/* Revenue Overview */}
        {machineMetrics && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-semibold text-neutral-900 dark:text-white">Revenue Overview</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Financial metrics across all venues</p>
              </div>
              <select
                value={metricsTimeframe}
                onChange={(e) => setMetricsTimeframe(e.target.value)}
                className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200 dark:divide-neutral-800">
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Money IN</p>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${formatCurrency(machineMetrics.summary.systemMoneyIn)}
                </p>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Money OUT</p>
                  <TrendingDown className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  ${formatCurrency(machineMetrics.summary.systemMoneyOut)}
                </p>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Net Revenue</p>
                  <DollarSign className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  ${formatCurrency(machineMetrics.summary.systemNetRevenue)}
                </p>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Profit Margin</p>
                  <Activity className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {machineMetrics.summary.systemMoneyIn > 0
                    ? ((machineMetrics.summary.systemNetRevenue / machineMetrics.summary.systemMoneyIn) * 100).toFixed(1)
                    : '0.0'}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Store Breakdown & Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue by Store */}
          {machineMetrics && machineMetrics.byStore.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="font-semibold text-neutral-900 dark:text-white">Revenue by Venue</h2>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
                {machineMetrics.byStore
                  .sort((a, b) => b.netRevenue - a.netRevenue)
                  .map((store) => (
                    <div key={store.storeId} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-neutral-900 dark:text-white text-sm">{store.storeId}</span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {machineMetrics.byMachine.filter(m => m.storeId === store.storeId).length} machines
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600 dark:text-green-400">+${formatCurrency(store.moneyIn)}</span>
                        <span className="text-red-600 dark:text-red-400">-${formatCurrency(store.moneyOut)}</span>
                        <span className="ml-auto font-semibold text-yellow-600 dark:text-yellow-400">
                          ${formatCurrency(store.netRevenue)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="font-semibold text-neutral-900 dark:text-white">Recent Activity</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Latest hub heartbeats</p>
            </div>

            {recentActivity.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 dark:text-neutral-400">
                No recent activity
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
                {recentActivity.map((item) => (
                  <div key={item.id} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        item.type === 'hub_online' ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white font-mono">{item.hubId}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.storeName}</p>
                      </div>
                    </div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickLink href="/admin/hubs" title="Manage Hubs" description="View and manage Pi hubs" icon={<Server className="w-5 h-5" />} />
          <QuickLink href="/admin/machines" title="Manage Machines" description="View and manage machines" icon={<Cpu className="w-5 h-5" />} />
          <QuickLink href="/admin/stores" title="Manage Venues" description="View and manage venues" icon={<Store className="w-5 h-5" />} />
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
    default: 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800',
    success: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50',
  };

  const iconColors = {
    default: 'text-neutral-500 dark:text-neutral-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
  };

  return (
    <div className={`${variants[variant]} border rounded-xl p-4`}>
      <div className={`${iconColors[variant]} mb-3`}>{icon}</div>
      <div className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</div>
      <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mt-1">{label}</div>
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
      className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 hover:border-yellow-500 dark:hover:border-yellow-500 transition-all hover:shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-neutral-500 dark:text-neutral-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
          {icon}
        </div>
        <ArrowRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:text-yellow-500 transition-colors" />
      </div>
      <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
    </a>
  );
}

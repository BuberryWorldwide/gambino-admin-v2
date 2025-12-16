// src/app/admin/hubs/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Wifi, WifiOff, Search, RefreshCw, Plus, AlertCircle, Server, Cpu, ChevronDown, ArrowUpDown, Filter } from 'lucide-react';
import api from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { getToken, clearToken, getUser as getCachedUser } from '@/lib/auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableHeader, useSort, sortData } from '@/components/ui/sortable-header';

interface User {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

interface Store {
  storeName?: string;
  city?: string;
  state?: string;
  storeId?: string;
}

interface Hub {
  hubId: string;
  isOnline: boolean;
  store?: Store;
  storeId: string;
  lastHeartbeat?: string | Date;
}

interface Machine {
  machineId: string;
  isRegistered: boolean;
  totalDays?: number;
  totalMoneyIn?: number;
  totalMoneyOut?: number;
  lastSeen?: string | Date;
}

interface Stats {
  total: number;
  online: number;
  totalMachines: number;
  registered: number;
}

export default function HubsPage() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [discoveredMachines, setDiscoveredMachines] = useState<Record<string, Machine[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const { sortConfig, handleSort } = useSort('hubId', 'asc');

  // Get unique stores from hubs
  const stores = useMemo(() => {
    const storeMap = new Map<string, string>();
    hubs.forEach(hub => {
      if (hub.storeId) {
        storeMap.set(hub.storeId, hub.store?.storeName || hub.storeId);
      }
    });
    return Array.from(storeMap.entries()).map(([storeId, storeName]) => ({ storeId, storeName }));
  }, [hubs]);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      console.log('No token found, redirecting to login');
      window.location.href = '/login';
      return;
    }

    loadUser();
    loadData();
  }, []);

  const loadUser = async () => {
    // First try cached user from localStorage (no API call)
    const cachedUser = getCachedUser();
    if (cachedUser) {
      setUser(cachedUser);
      return;
    }

    try {
      const res = await api.get('/api/users/profile');
      setUser(res.data.user);
    } catch (err) {
      console.log('Failed to load user profile');
      setUser(null);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const hubsRes = await api.get('/api/admin/hubs');
      const hubsList: Hub[] = hubsRes.data.hubs || [];
      setHubs(hubsList);

      const machinesData: Record<string, Machine[]> = {};
      await Promise.all(
        hubsList.map(async (hub) => {
          try {
            const res = await api.get(`/api/admin/hubs/${hub.hubId}/discovered-machines`);
            machinesData[hub.hubId] = res.data.machines || [];
          } catch (machineErr: unknown) {
            console.error(`Failed to load machines for ${hub.hubId}:`, machineErr);
            machinesData[hub.hubId] = [];
          }
        })
      );
      setDiscoveredMachines(machinesData);
    } catch (err: unknown) {
      console.error('Failed to load hubs:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || 'Failed to load hubs');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load hubs');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const stats: Stats = {
    total: hubs.length,
    online: hubs.filter(h => h.isOnline).length,
    totalMachines: Object.values(discoveredMachines).reduce((sum, machines) => sum + machines.length, 0),
    registered: Object.values(discoveredMachines).reduce(
      (sum, machines) => sum + machines.filter(m => m.isRegistered).length, 0
    ),
  };

  // Filter and sort hubs
  const filteredAndSortedHubs = useMemo(() => {
    let filtered = hubs.filter(hub =>
      hub.hubId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hub.store?.storeName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply status filter
    if (statusFilter === 'online') {
      filtered = filtered.filter(hub => hub.isOnline);
    } else if (statusFilter === 'offline') {
      filtered = filtered.filter(hub => !hub.isOnline);
    }

    // Apply store filter
    if (storeFilter !== 'all') {
      filtered = filtered.filter(hub => hub.storeId === storeFilter);
    }

    // Custom comparators for complex fields
    const customComparators = {
      'store.storeName': (a: Hub, b: Hub) => {
        const aName = a.store?.storeName || a.storeId || '';
        const bName = b.store?.storeName || b.storeId || '';
        return aName.localeCompare(bName);
      },
      'isOnline': (a: Hub, b: Hub) => {
        return (a.isOnline === b.isOnline) ? 0 : a.isOnline ? -1 : 1;
      },
      'machineCount': (a: Hub, b: Hub) => {
        const aCount = discoveredMachines[a.hubId]?.length || 0;
        const bCount = discoveredMachines[b.hubId]?.length || 0;
        return aCount - bCount;
      },
      'registeredCount': (a: Hub, b: Hub) => {
        const aCount = discoveredMachines[a.hubId]?.filter(m => m.isRegistered).length || 0;
        const bCount = discoveredMachines[b.hubId]?.filter(m => m.isRegistered).length || 0;
        return aCount - bCount;
      }
    };

    return sortData(filtered, sortConfig, customComparators);
  }, [hubs, searchTerm, sortConfig, discoveredMachines, statusFilter, storeFilter]);

  // Sort options for mobile
  const sortOptions = [
    { key: 'hubId', label: 'Hub ID' },
    { key: 'store.storeName', label: 'Store Name' },
    { key: 'isOnline', label: 'Status' },
    { key: 'machineCount', label: 'Machines' },
  ];

  if (loading) {
    return (
      <AdminLayout user={user}>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-4" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading hubs...</p>
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
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Error Loading Hubs</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">{error}</p>
            <Button onClick={loadData} className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900">
              Try Again
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout user={user}>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Pi Hubs</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Manage Raspberry Pi hubs and connected machines
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-neutral-200 dark:border-neutral-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => window.location.href = '/admin/hubs/register'}
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              Register Hub
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Total Hubs" value={stats.total} icon={<Server className="w-5 h-5" />} color="default" />
          <StatCard label="Online" value={stats.online} icon={<Wifi className="w-5 h-5" />} color="green" />
          <StatCard label="Discovered" value={stats.totalMachines} icon={<Cpu className="w-5 h-5" />} color="yellow" />
          <StatCard label="Registered" value={stats.registered} icon={<Cpu className="w-5 h-5" />} color="yellow" />
        </div>

        {/* Search + Filters */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 sm:p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search hubs by ID or store name..."
              className="pl-10 h-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
            />
          </div>

          {/* Mobile Filter & Sort Controls */}
          <div className="flex gap-2 lg:hidden">
            {/* Status Filter Pills */}
            <div className="flex-1 flex gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800">
              {(['all', 'online', 'offline'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                    statusFilter === status
                      ? 'bg-yellow-500 text-black'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {status === 'all' ? 'All' : status === 'online' ? 'Online' : 'Offline'}
                </button>
              ))}
            </div>

            {/* Store Filter */}
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="px-2 py-1.5 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
            >
              <option value="all">All Stores</option>
              {stores.map(s => (
                <option key={s.storeId} value={s.storeId}>{s.storeName}</option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sort
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-20 overflow-hidden">
                  {sortOptions.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => {
                        handleSort(option.key);
                        setShowSortMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                        sortConfig.key === option.key
                          ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-medium'
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {option.label}
                      {sortConfig.key === option.key && (
                        <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Filter Pills */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Status:</span>
              <div className="flex gap-1">
                {(['all', 'online', 'offline'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                      statusFilter === status
                        ? 'bg-yellow-500 text-black'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {status === 'all' ? `All (${stats.total})` : status === 'online' ? `Online (${stats.online})` : `Offline (${stats.total - stats.online})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Store:</span>
              <select
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
                className="px-3 py-1 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              >
                <option value="all">All Stores</option>
                {stores.map(s => (
                  <option key={s.storeId} value={s.storeId}>{s.storeName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {filteredAndSortedHubs.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-12 text-center">
            <Search className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No hubs found</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              {statusFilter !== 'all' ? `No ${statusFilter} hubs. Try changing the filter.` : 'Try adjusting your search or register a new hub'}
            </p>
            <Button
              onClick={() => window.location.href = '/admin/hubs/register'}
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              Register Hub
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile: Compact Card Layout */}
            <div className="lg:hidden space-y-2">
              {filteredAndSortedHubs.map((hub) => {
                const machines = discoveredMachines[hub.hubId] || [];
                const registered = machines.filter(m => m.isRegistered).length;

                return (
                  <div
                    key={hub.hubId}
                    onClick={() => window.location.href = `/admin/hubs/${hub.hubId}`}
                    className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 cursor-pointer active:bg-neutral-50 dark:active:bg-neutral-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Status Indicator */}
                      <div className={`w-2 h-10 rounded-full shrink-0 ${
                        hub.isOnline ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'
                      }`} />

                      {/* Hub Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-mono font-semibold text-sm text-neutral-900 dark:text-white truncate">
                            {hub.hubId}
                          </h3>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            hub.isOnline
                              ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                          }`}>
                            {hub.isOnline ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {hub.store?.storeName || hub.storeId}
                          {hub.store?.city && ` · ${hub.store.city}, ${hub.store.state}`}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <div>
                          <p className="text-xs text-neutral-400">Machines</p>
                          <p className="font-semibold text-sm text-neutral-900 dark:text-white">{machines.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-400">Reg.</p>
                          <p className="font-semibold text-sm text-yellow-600 dark:text-yellow-400">{registered}</p>
                        </div>
                        <ChevronDown className="w-4 h-4 -rotate-90 text-neutral-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden lg:block bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                    <TableHead>
                      <SortableHeader
                        label="Hub ID"
                        sortKey="hubId"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        label="Store"
                        sortKey="store.storeName"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        label="Status"
                        sortKey="isOnline"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        label="Machines"
                        sortKey="machineCount"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        label="Registered"
                        sortKey="registeredCount"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        label="Last Seen"
                        sortKey="lastHeartbeat"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedHubs.map((hub) => {
                    const machines = discoveredMachines[hub.hubId] || [];
                    const registered = machines.filter(m => m.isRegistered).length;
                    const unknown = machines.length - registered;

                    return (
                      <TableRow
                        key={hub.hubId}
                        className="border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/admin/hubs/${hub.hubId}`}
                      >
                        <TableCell className="font-mono font-medium text-neutral-900 dark:text-white">
                          {hub.hubId}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-neutral-900 dark:text-white">
                            {hub.store?.storeName || hub.storeId}
                          </div>
                          {hub.store?.city && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {hub.store.city}, {hub.store.state}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${
                            hub.isOnline
                              ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                          }`}>
                            {hub.isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                            {hub.isOnline ? 'Online' : 'Offline'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-neutral-900 dark:text-white">
                          {machines.length}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-green-600 dark:text-green-400">{registered}</span>
                            {unknown > 0 && (
                              <span className="text-xs text-neutral-500 dark:text-neutral-400">+{unknown} unknown</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                          {hub.lastHeartbeat ? new Date(hub.lastHeartbeat).toLocaleString() : 'Never'}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-medium text-sm">
                            View →
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'default' | 'green' | 'yellow';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    default: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
    green: 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-600 dark:text-yellow-400',
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium truncate">{label}</p>
          <p className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

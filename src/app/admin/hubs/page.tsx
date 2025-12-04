// src/app/admin/hubs/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Wifi, WifiOff, Search, RefreshCw, Plus, AlertCircle, Server, Cpu } from 'lucide-react';
import api from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  const { sortConfig, handleSort } = useSort('hubId', 'asc');

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
    const filtered = hubs.filter(hub =>
      hub.hubId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hub.store?.storeName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
  }, [hubs, searchTerm, sortConfig, discoveredMachines]);

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
              className="border-neutral-200 dark:border-neutral-800"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => window.location.href = '/admin/hubs/register'}
              className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
            >
              <Plus className="w-4 h-4 mr-2" />
              Register Hub
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Hubs" value={stats.total} icon={<Server className="w-5 h-5" />} color="default" />
          <StatCard label="Online" value={stats.online} icon={<Wifi className="w-5 h-5" />} color="green" />
          <StatCard label="Discovered" value={stats.totalMachines} icon={<Cpu className="w-5 h-5" />} color="blue" />
          <StatCard label="Registered" value={stats.registered} icon={<Cpu className="w-5 h-5" />} color="purple" />
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
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
        </div>

        {/* Content */}
        {filteredAndSortedHubs.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-12 text-center">
            <Search className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No hubs found</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              Try adjusting your search or register a new hub
            </p>
            <Button
              onClick={() => window.location.href = '/admin/hubs/register'}
              className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
            >
              <Plus className="w-4 h-4 mr-2" />
              Register Hub
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile: Card Layout */}
            <div className="lg:hidden space-y-3">
              {filteredAndSortedHubs.map((hub) => {
                const machines = discoveredMachines[hub.hubId] || [];
                const registered = machines.filter(m => m.isRegistered).length;
                const unknown = machines.length - registered;

                return (
                  <div
                    key={hub.hubId}
                    onClick={() => window.location.href = `/admin/hubs/${hub.hubId}`}
                    className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 cursor-pointer active:bg-neutral-50 dark:active:bg-neutral-800 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-mono font-semibold text-neutral-900 dark:text-white mb-1">
                          {hub.hubId}
                        </h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {hub.store?.storeName || hub.storeId}
                        </p>
                        {hub.store?.city && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5">
                            {hub.store.city}, {hub.store.state}
                          </p>
                        )}
                      </div>
                      <Badge className={`shrink-0 ${
                        hub.isOnline
                          ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}>
                        {hub.isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                        {hub.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Machines</p>
                        <p className="font-semibold text-neutral-900 dark:text-white">{machines.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Registered</p>
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          {registered}
                          {unknown > 0 && (
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-1">
                              +{unknown}
                            </span>
                          )}
                        </p>
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
  color: 'default' | 'green' | 'blue' | 'purple';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    default: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
    green: 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium">{label}</p>
          <p className="text-xl font-bold text-neutral-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

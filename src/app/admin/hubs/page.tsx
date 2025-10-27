// src/app/admin/hubs/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Search, RefreshCw, Plus, AlertCircle } from 'lucide-react';
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

  useEffect(() => {
  // Check token first - prevents unauthorized API calls
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
    
    // Handle 401 errors - redirect to login
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      console.log('Unauthorized - clearing token and redirecting');
      clearToken();
      window.location.href = '/login';
      return;
    }
    
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
    
    // Handle 401 errors
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      console.log('Unauthorized - redirecting to login');
      clearToken();
      window.location.href = '/login';
      return;
    }
    
    if (axios.isAxiosError(err)) {
      setError(err.response?.data?.error || 'Failed to load hubs');
    } else {
      setError('Failed to load hubs');
    }
  } finally {
    // CRITICAL: Always set loading to false!
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

  const filteredHubs = hubs.filter(hub => 
    hub.hubId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hub.store?.storeName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AdminLayout user={user}>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 dark:text-gray-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading hubs...</p>
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Error Loading Hubs</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={loadData} className="w-full">
              Retry
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout user={user}>
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-[73px] z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Pi Hubs</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage Raspberry Pi hubs and discover connected machines
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => window.location.href = '/admin/hubs/register'} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Register Hub
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search hubs by ID or store name..."
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Stats - Mobile Responsive Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatBox label="Total Hubs" value={stats.total} />
          <StatBox label="Online" value={stats.online} variant="success" />
          <StatBox label="Discovered Machines" value={stats.totalMachines} variant="info" />
          <StatBox label="Registered" value={stats.registered} variant="info" />
        </div>

        {/* Mobile Cards / Desktop Table */}
        {filteredHubs.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
            <Search className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No hubs found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Try adjusting your search or register a new hub
            </p>
            <Button onClick={() => window.location.href = '/admin/hubs/register'}>
              <Plus className="w-4 h-4 mr-2" />
              Register Hub
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile: Card Layout */}
            <div className="lg:hidden space-y-3">
              {filteredHubs.map((hub) => {
                const machines = discoveredMachines[hub.hubId] || [];
                const registered = machines.filter(m => m.isRegistered).length;
                const unknown = machines.length - registered;

                return (
                  <div
                    key={hub.hubId}
                    onClick={() => window.location.href = `/admin/hubs/${hub.hubId}`}
                    className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {hub.hubId}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {hub.store?.storeName || hub.storeId}
                        </p>
                        {hub.store?.city && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                            {hub.store.city}, {hub.store.state}
                          </p>
                        )}
                      </div>
                      {hub.isOnline ? (
                        <Badge variant="default" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 shrink-0">
                          <Wifi className="w-3 h-3 mr-1" />
                          Online
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">
                          <WifiOff className="w-3 h-3 mr-1" />
                          Offline
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Machines</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{machines.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Registered</p>
                        <p className="font-semibold text-green-700 dark:text-green-400">
                          {registered}
                          {unknown > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
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
            <div className="hidden lg:block bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hub ID</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Machines</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHubs.map((hub) => {
                      const machines = discoveredMachines[hub.hubId] || [];
                      const registered = machines.filter(m => m.isRegistered).length;
                      const unknown = machines.length - registered;

                      return (
                        <TableRow 
                          key={hub.hubId} 
                          className="cursor-pointer"
                          onClick={() => window.location.href = `/admin/hubs/${hub.hubId}`}
                        >
                          <TableCell className="font-medium">{hub.hubId}</TableCell>
                          <TableCell>
                            <div className="text-sm">{hub.store?.storeName || hub.storeId}</div>
                            {hub.store?.city && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {hub.store.city}, {hub.store.state}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {hub.isOnline ? (
                              <Badge variant="default" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                <Wifi className="w-3 h-3 mr-1" />
                                Online
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <WifiOff className="w-3 h-3 mr-1" />
                                Offline
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{machines.length}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-green-700 dark:text-green-400">{registered}</span>
                              {unknown > 0 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">+{unknown} unknown</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                            {hub.lastHeartbeat ? new Date(hub.lastHeartbeat).toLocaleString() : 'Never'}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 font-medium">
                              View →
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
  variant?: 'default' | 'success' | 'info';
}

function StatBox({ label, value, variant = 'default' }: StatBoxProps) {
  const variants = {
    default: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
    success: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900',
    info: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900',
  };

  return (
    <div className={`${variants[variant]} border rounded-lg p-3 sm:p-4`}>
      <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">{value}</div>
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{label}</div>
    </div>
  );
}
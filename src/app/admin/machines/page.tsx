// src/app/admin/machines/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { Search, RefreshCw, DollarSign, Edit2, Check, X, Plus, Cpu, Activity, Eye, AlertCircle, BookOpen, TrendingUp, TrendingDown, WifiOff, ChevronDown, ArrowUpDown, Filter } from 'lucide-react';
import api from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { SortableHeader, useSort, sortData } from '@/components/ui/sortable-header';

interface Machine {
  _id: string;
  machineId: string;
  name?: string;
  storeId: string;
  hubId?: string;
  status?: 'active' | 'inactive' | 'maintenance';
  isRegistered?: boolean;
  connectionStatus?: string;
  lastSeen?: string | Date;
  muthaGooseNumber?: number;
  totalDays?: number;
  totalMoneyIn?: number;
  totalMoneyOut?: number;
  store?: {
    storeName: string;
    city: string;
    state: string;
  };
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  maintenance: number;
}

interface TodayStats {
  totalRevenue: number;
  totalMoneyIn: number;
  totalMoneyOut: number;
  totalVouchers: number;
  activeMachines: number;
}

interface BooksClearedData {
  lastCleared: string;
  clearCount: number;
  lastClearedDate: string;
  lastClearedTime: string;
  daysSinceCleared: number;
  status: 'recent' | 'warning' | 'overdue' | 'unknown';
}

interface BooksClearedMap {
  [machineId: string]: BooksClearedData;
}

export default function MachinesPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = mounted ? resolvedTheme === 'dark' : false;

  const [machines, setMachines] = useState<Machine[]>([]);
  const [stores, setStores] = useState<{storeId: string; storeName: string}[]>([]);
  const [hubNames, setHubNames] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, maintenance: 0 });
  const [todayStats, setTodayStats] = useState<TodayStats>({
    totalRevenue: 0,
    totalMoneyIn: 0,
    totalMoneyOut: 0,
    totalVouchers: 0,
    activeMachines: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [editingMachine, setEditingMachine] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [registering, setRegistering] = useState<string | null>(null);
  const [booksCleared, setBooksCleared] = useState<BooksClearedMap>({});
  const [showMobileSortMenu, setShowMobileSortMenu] = useState(false);

  // Registration modal state
  const [registerModal, setRegisterModal] = useState<{ show: boolean; machine: Machine | null }>({ show: false, machine: null });
  const [registerName, setRegisterName] = useState('');

  // Sorting
  const { sortConfig, handleSort } = useSort('machineId', 'asc');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    loadMachines().then(() => {
      loadTodayStats();
      loadBooksCleared();
    });
  }, []);

  // Sort options for mobile
  const sortOptions = [
    { key: 'machineId', label: 'Machine ID' },
    { key: 'store.storeName', label: 'Store' },
    { key: 'totalMoneyIn', label: 'Money In' },
    { key: 'totalMoneyOut', label: 'Money Out' },
    { key: 'revenue', label: 'Net Revenue' },
    { key: 'lastSeen', label: 'Last Seen' },
    { key: 'booksCleared', label: 'Last Cleared' },
  ];

  // Filter and sort machines
  const filteredMachines = useMemo(() => {
    let filtered = machines;

    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.machineId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.store?.storeName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter === 'registered') {
      filtered = filtered.filter(m => m.isRegistered);
    } else if (statusFilter === 'discovered') {
      filtered = filtered.filter(m => !m.isRegistered);
    }

    if (storeFilter !== 'all') {
      filtered = filtered.filter(m => m.storeId === storeFilter);
    }

    // Custom comparators for special fields
    const customComparators: Record<string, (a: Machine, b: Machine) => number> = {
      'store.storeName': (a, b) => {
        const aName = a.store?.storeName || '';
        const bName = b.store?.storeName || '';
        return aName.localeCompare(bName);
      },
      'status': (a, b) => {
        const aStatus = a.isRegistered ? 1 : 0;
        const bStatus = b.isRegistered ? 1 : 0;
        return aStatus - bStatus;
      },
      'lastSeen': (a, b) => {
        const aTime = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const bTime = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        return aTime - bTime;
      },
      'booksCleared': (a, b) => {
        const aCleared = booksCleared[a.machineId]?.daysSinceCleared ?? 999;
        const bCleared = booksCleared[b.machineId]?.daysSinceCleared ?? 999;
        return aCleared - bCleared;
      },
      'totalMoneyIn': (a, b) => (a.totalMoneyIn || 0) - (b.totalMoneyIn || 0),
      'totalMoneyOut': (a, b) => (a.totalMoneyOut || 0) - (b.totalMoneyOut || 0),
      'revenue': (a, b) => {
        const aRev = (a.totalMoneyIn || 0) - (a.totalMoneyOut || 0);
        const bRev = (b.totalMoneyIn || 0) - (b.totalMoneyOut || 0);
        return aRev - bRev;
      },
    };

    return sortData(filtered, sortConfig, customComparators);
  }, [machines, searchTerm, statusFilter, storeFilter, sortConfig, booksCleared]);

  // Machines that need attention
  const alertMachines = useMemo(() => {
    const now = new Date();
    return machines.filter(m => {
      // Offline for more than 1 hour
      if (m.lastSeen) {
        const lastSeen = new Date(m.lastSeen);
        const hoursSince = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);
        if (hoursSince > 1 && m.isRegistered) return true;
      }
      // Books overdue (more than 7 days)
      const cleared = booksCleared[m.machineId];
      if (cleared && cleared.daysSinceCleared > 7) return true;
      return false;
    });
  }, [machines, booksCleared]);

  const loadTodayStats = async () => {
    try {
      const response = await api.get('/api/admin/machine-metrics?timeframe=24h');
      if (response.data.success && response.data.summary) {
        const summary = response.data.summary;
        setTodayStats({
          totalRevenue: summary.systemNetRevenue || 0,
          totalMoneyIn: summary.systemMoneyIn || 0,
          totalMoneyOut: summary.systemMoneyOut || 0,
          totalVouchers: 0,
          activeMachines: summary.totalMachines || 0
        });
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        const totalIn = machines.reduce((sum, m) => sum + (m.totalMoneyIn || 0), 0);
        const totalOut = machines.reduce((sum, m) => sum + (m.totalMoneyOut || 0), 0);
        setTodayStats({
          totalRevenue: totalIn - totalOut,
          totalMoneyIn: totalIn,
          totalMoneyOut: totalOut,
          totalVouchers: 0,
          activeMachines: machines.filter(m => m.isRegistered).length
        });
      } else {
        console.error('Failed to load today stats:', err);
      }
    }
  };

  const loadBooksCleared = async () => {
    try {
      const response = await api.get('/api/admin/events/books-cleared');
      if (response.data.success) {
        setBooksCleared(response.data.data || {});
      }
    } catch (err) {
      console.error('Failed to load books cleared data:', err);
    }
  };

  const loadMachines = async () => {
    try {
      setLoading(true);
      setError(null);

      const hubsRes = await api.get('/api/admin/hubs');
      const hubs = hubsRes.data.hubs || [];

      // Build stores list and hub names from hubs
      const storeMap = new Map<string, string>();
      const hubNamesMap: Record<string, string> = {};
      hubs.forEach((hub: any) => {
        if (hub.storeId && hub.store?.storeName) {
          storeMap.set(hub.storeId, hub.store.storeName);
        }
        if (hub.hubId) {
          hubNamesMap[hub.hubId] = hub.name || hub.hubId;
        }
      });
      setStores(Array.from(storeMap.entries()).map(([storeId, storeName]) => ({ storeId, storeName })));
      setHubNames(hubNamesMap);

      const allMachines: Machine[] = [];

      for (const hub of hubs) {
        try {
          const machinesRes = await api.get(`/api/admin/hubs/${hub.hubId}/discovered-machines`);
          const hubMachines = machinesRes.data.machines || [];

          hubMachines.forEach((m: Machine) => {
            m.hubId = hub.hubId;
            m.storeId = hub.storeId;
            m.store = hub.store;

            const existingIndex = allMachines.findIndex(existing => existing.machineId === m.machineId);

            if (existingIndex === -1) {
              allMachines.push(m);
            }
          });
        } catch (err) {
          console.error(`Failed to load machines for hub ${hub.hubId}`);
        }
      }

      setMachines(allMachines);

      const newStats = {
        total: allMachines.length,
        active: allMachines.filter((m: Machine) => m.isRegistered).length,
        inactive: allMachines.filter((m: Machine) => !m.isRegistered).length,
        maintenance: 0
      };
      setStats(newStats);

    } catch (err) {
      console.error('Failed to load machines:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load machines';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const openRegisterModal = (machine: Machine) => {
    setRegisterName('');
    setRegisterModal({ show: true, machine });
  };

  const closeRegisterModal = () => {
    setRegisterModal({ show: false, machine: null });
    setRegisterName('');
  };

  const handleRegisterMachine = async () => {
    const machine = registerModal.machine;
    if (!machine) return;

    try {
      setRegistering(machine.machineId);

      const response = await api.post('/api/admin/machines/register', {
        machineId: machine.machineId,
        storeId: machine.storeId,
        hubId: machine.hubId,
        name: registerName.trim() || `Machine ${machine.machineId}`,
        gameType: 'slot'
      });

      if (response.data.success) {
        closeRegisterModal();
        await loadMachines();
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      alert(error.response?.data?.error || 'Failed to register machine');
    } finally {
      setRegistering(null);
    }
  };

  const startEditName = (machine: Machine) => {
    setEditingMachine(machine.machineId);
    setEditName(machine.name || '');
  };

  const cancelEditName = () => {
    setEditingMachine(null);
    setEditName('');
  };

  const saveEditName = async (machineId: string) => {
    try {
      const response = await api.put(`/api/admin/machines/${machineId}`, {
        name: editName
      });

      if (response.data.success) {
        setMachines(machines.map(m =>
          m.machineId === machineId ? { ...m, name: editName } : m
        ));
        setEditingMachine(null);
        setEditName('');
      }
    } catch (error: any) {
      console.error('Update failed:', error);
      alert(error.response?.data?.error || 'Failed to update machine name');
    }
  };

  const formatLastSeen = (lastSeen?: string | Date) => {
    if (!lastSeen) return 'Never';

    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getBooksStatusColor = (status?: string) => {
    switch (status) {
      case 'recent':
        return 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300';
      case 'overdue':
        return 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300';
      default:
        return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400';
    }
  };

  const formatBooksCleared = (machineId: string) => {
    const data = booksCleared[machineId];
    if (!data) return { text: '—', status: 'unknown' };

    if (data.daysSinceCleared === 0) {
      return { text: 'Today', status: data.status };
    } else if (data.daysSinceCleared === 1) {
      return { text: 'Yesterday', status: data.status };
    } else if (data.daysSinceCleared < 7) {
      return { text: `${data.daysSinceCleared}d ago`, status: data.status };
    } else {
      return { text: data.lastClearedDate || `${data.daysSinceCleared}d ago`, status: data.status };
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-4" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading machines...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="max-w-md mx-auto mt-12 px-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Failed to Load Machines</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">{error}</p>
            <Button onClick={loadMachines} className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900">
              Try Again
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Machines</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {filteredMachines.length} total machine{filteredMachines.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => { loadMachines(); loadTodayStats(); loadBooksCleared(); }}
            className="border-neutral-200 dark:border-neutral-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Machines"
            value={stats.total}
            icon={<Cpu className="w-5 h-5" />}
            color="default"
          />
          <StatCard
            label="Registered"
            value={stats.active}
            icon={<Activity className="w-5 h-5" />}
            color="green"
          />
          <StatCard
            label="Revenue Today"
            value={formatCurrency(todayStats.totalRevenue)}
            icon={<DollarSign className="w-5 h-5" />}
            color="yellow"
          />
          <StatCard
            label="Need Attention"
            value={alertMachines.length}
            icon={<AlertCircle className="w-5 h-5" />}
            color={alertMachines.length > 0 ? 'red' : 'green'}
          />
        </div>

        {/* Alerts Banner */}
        {alertMachines.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
                  {alertMachines.length} machine{alertMachines.length !== 1 ? 's' : ''} need attention
                </h3>
                <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                  {alertMachines.slice(0, 3).map(m => m.machineId).join(', ')}
                  {alertMachines.length > 3 && ` and ${alertMachines.length - 3} more`}
                </p>
              </div>
              <button
                onClick={() => {
                  setStatusFilter('registered');
                  handleSort('lastSeen');
                }}
                className="text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 shrink-0"
              >
                View All →
              </button>
            </div>
          </div>
        )}

        {/* Search + Filters */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 sm:p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search machines, stores..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
            />
          </div>

          {/* Mobile Filters */}
          <div className="flex gap-2 lg:hidden">
            {/* Status Filter Pills */}
            <div className="flex-1 flex gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800">
              {(['all', 'registered', 'discovered'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                    statusFilter === status
                      ? 'bg-yellow-500 text-black'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {status === 'all' ? 'All' : status === 'registered' ? 'Reg.' : 'New'}
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
                onClick={() => setShowMobileSortMenu(!showMobileSortMenu)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
              {showMobileSortMenu && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-20 overflow-hidden">
                  {sortOptions.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => {
                        handleSort(option.key);
                        setShowMobileSortMenu(false);
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

          {/* Desktop Filters */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Status:</span>
              <div className="flex gap-1">
                {(['all', 'registered', 'discovered'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                      statusFilter === status
                        ? 'bg-yellow-500 text-black'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {status === 'all' ? 'All' : status === 'registered' ? 'Registered' : 'Discovered'}
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

        {/* Machines List */}
        {filteredMachines.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
              <Cpu className="w-6 h-6 text-neutral-400" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No machines found</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {searchTerm ? 'Try adjusting your search criteria' : 'Machines will appear here once discovered'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: Card Layout */}
            <div className="lg:hidden space-y-2">
              {filteredMachines.map((machine) => {
                const netRevenue = (machine.totalMoneyIn || 0) - (machine.totalMoneyOut || 0);
                const cleared = formatBooksCleared(machine.machineId);
                return (
                  <div
                    key={machine.machineId}
                    className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3"
                  >
                    {/* Header Row */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-2 h-10 rounded-full shrink-0 ${
                        machine.isRegistered ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-neutral-900 dark:text-white">
                            {machine.machineId}
                          </span>
                          {machine.muthaGooseNumber && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 font-medium">
                              MG{machine.muthaGooseNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {machine.store?.storeName || 'Unknown venue'}
                          {machine.name && ` • ${machine.name}`}
                        </p>
                      </div>
                      {!machine.isRegistered ? (
                        <Button
                          size="sm"
                          className="h-8 bg-yellow-500 hover:bg-yellow-600 text-black shrink-0"
                          onClick={() => openRegisterModal(machine)}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Link href={`/admin/machines/${machine.machineId}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}
                    </div>

                    {/* Revenue Row */}
                    <div className="flex items-center gap-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <div className="flex-1 flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-[10px] uppercase text-neutral-400 font-medium">IN</p>
                          <p className="text-xs font-medium text-green-600 dark:text-green-400">
                            {machine.totalMoneyIn ? `$${(machine.totalMoneyIn / 100).toFixed(0)}` : '—'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] uppercase text-neutral-400 font-medium">OUT</p>
                          <p className="text-xs font-medium text-red-600 dark:text-red-400">
                            {machine.totalMoneyOut ? `$${(machine.totalMoneyOut / 100).toFixed(0)}` : '—'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] uppercase text-neutral-400 font-medium">NET</p>
                          <p className={`text-xs font-bold ${netRevenue >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                            {netRevenue !== 0 ? `$${(netRevenue / 100).toFixed(0)}` : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                        <span>{formatLastSeen(machine.lastSeen)}</span>
                        <span className="text-neutral-300 dark:text-neutral-600">•</span>
                        <Badge className={`${getBooksStatusColor(cleared.status)} text-[10px] font-medium px-1.5 py-0`}>
                          {cleared.text}
                        </Badge>
                      </div>
                    </div>

                    {/* Edit Name (if editing) */}
                    {editingMachine === machine.machineId && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <Input
                          value={editName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                          className="text-sm h-8 bg-neutral-50 dark:bg-neutral-800"
                          placeholder="Machine name"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => saveEditName(machine.machineId)}
                        >
                          <Check className="w-4 h-4 text-green-500" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={cancelEditName}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden lg:block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      <TableHead>
                        <SortableHeader
                          label="Machine"
                          sortKey="machineId"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                        />
                      </TableHead>
                      <TableHead>
                        <SortableHeader
                          label="Name"
                          sortKey="name"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                        />
                      </TableHead>
                      <TableHead>
                        <SortableHeader
                          label="Venue"
                          sortKey="store.storeName"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                        />
                      </TableHead>
                      <TableHead>
                        <SortableHeader
                          label="Hub"
                          sortKey="hubId"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                        />
                      </TableHead>
                      <TableHead>
                        <SortableHeader
                          label="Money In"
                          sortKey="totalMoneyIn"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                        />
                      </TableHead>
                      <TableHead>
                        <SortableHeader
                          label="Money Out"
                          sortKey="totalMoneyOut"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                        />
                      </TableHead>
                      <TableHead>
                        <SortableHeader
                          label="Net"
                          sortKey="revenue"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                        />
                      </TableHead>
                      <TableHead>
                        <SortableHeader
                          label="Status"
                          sortKey="status"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                        />
                      </TableHead>
                      <TableHead>
                        <SortableHeader
                          label="Last Seen"
                          sortKey="lastSeen"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                        />
                      </TableHead>
                      <TableHead>
                        <SortableHeader
                          label="Last Cleared"
                          sortKey="booksCleared"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                        />
                      </TableHead>
                      <TableHead>
                        <SortableHeader
                          label="MG #"
                          sortKey="muthaGooseNumber"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                        />
                      </TableHead>
                      <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMachines.map((machine) => (
                      <TableRow
                        key={machine.machineId}
                        className="border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-black">
                              <Cpu className="w-4 h-4" />
                            </div>
                            <span className="font-mono text-sm text-neutral-900 dark:text-white">
                              {machine.machineId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {editingMachine === machine.machineId ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                                className="w-40 h-8 bg-neutral-50 dark:bg-neutral-800"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => saveEditName(machine.machineId)}
                              >
                                <Check className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={cancelEditName}
                              >
                                <X className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-neutral-700 dark:text-neutral-300">{machine.name || '—'}</span>
                              {machine.isRegistered && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                  onClick={() => startEditName(machine)}
                                >
                                  <Edit2 className="w-3 h-3 text-neutral-400" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-neutral-700 dark:text-neutral-300">
                            {machine.store?.storeName || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                            {machine.hubId?.slice(-8) || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            {machine.totalMoneyIn ? formatCurrency(machine.totalMoneyIn / 100) : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">
                            {machine.totalMoneyOut ? formatCurrency(machine.totalMoneyOut / 100) : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const net = (machine.totalMoneyIn || 0) - (machine.totalMoneyOut || 0);
                            return (
                              <span className={`text-sm font-bold ${net >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                {net !== 0 ? formatCurrency(net / 100) : '—'}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(machine.isRegistered ? 'registered' : 'discovered')} text-xs font-medium px-2 py-0.5`}>
                            {machine.isRegistered ? 'Registered' : 'Discovered'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">
                            {formatLastSeen(machine.lastSeen)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const cleared = formatBooksCleared(machine.machineId);
                            return (
                              <div className="flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
                                <Badge className={`${getBooksStatusColor(cleared.status)} text-xs font-medium px-2 py-0.5`}>
                                  {cleared.text}
                                </Badge>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                            {machine.muthaGooseNumber ? `MG${machine.muthaGooseNumber}` : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {!machine.isRegistered ? (
                            <Button
                              size="sm"
                              className="bg-yellow-500 hover:bg-yellow-600 text-black"
                              onClick={() => openRegisterModal(machine)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Register
                            </Button>
                          ) : (
                            <Link href={`/admin/machines/${machine.machineId}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1.5" />
                                View
                              </Button>
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Register Machine Modal */}
      {registerModal.show && registerModal.machine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeRegisterModal}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-black" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Register Machine
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">
                  {registerModal.machine.machineId}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Venue</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {registerModal.machine.store?.storeName || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Pi Hub</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {registerModal.machine.hubId ? hubNames[registerModal.machine.hubId] || registerModal.machine.hubId : '—'}
                  </p>
                  <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                    {registerModal.machine.hubId || '—'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Machine Name <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <Input
                  value={registerName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegisterName(e.target.value)}
                  placeholder="e.g., Slot by the door, Machine #3"
                  className="h-11 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  autoFocus
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                  Give it a friendly name so you can identify it later
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-neutral-200 dark:border-neutral-700"
                onClick={closeRegisterModal}
                disabled={registering === registerModal.machine.machineId}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
                onClick={handleRegisterMachine}
                disabled={registering === registerModal.machine.machineId}
              >
                {registering === registerModal.machine.machineId ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Register
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'registered':
      return 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300';
    case 'discovered':
      return 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300';
    default:
      return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400';
  }
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'default' | 'green' | 'red' | 'yellow' | 'blue';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    default: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
    green: 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400',
    red: 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-600 dark:text-yellow-400',
    blue: 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
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

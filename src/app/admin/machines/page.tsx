// src/app/admin/machines/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Search, RefreshCw, DollarSign, Edit2, Check, X, Plus, Cpu, Activity, Ticket, Eye, AlertCircle } from 'lucide-react';
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

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);
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
  const [editingMachine, setEditingMachine] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [registering, setRegistering] = useState<string | null>(null);

  useEffect(() => {
    loadMachines().then(() => loadTodayStats());
  }, []);

  useEffect(() => {
    filterMachines();
  }, [searchTerm, statusFilter, machines]);

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

  const loadMachines = async () => {
    try {
      setLoading(true);
      setError(null);

      const hubsRes = await api.get('/api/admin/hubs');
      const hubs = hubsRes.data.hubs || [];

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

  const filterMachines = () => {
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

    setFilteredMachines(filtered);
  };

  const handleRegisterMachine = async (machine: Machine) => {
    try {
      setRegistering(machine.machineId);

      const response = await api.post('/api/admin/machines/register', {
        machineId: machine.machineId,
        storeId: machine.storeId,
        hubId: machine.hubId,
        name: machine.name || `Machine ${machine.machineId}`,
        gameType: 'slot'
      });

      if (response.data.success) {
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
            onClick={() => { loadMachines(); loadTodayStats(); }}
            className="border-neutral-200 dark:border-neutral-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Machines"
            value={stats.total}
            icon={<Cpu className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="Registered"
            value={stats.active}
            icon={<Activity className="w-5 h-5" />}
            color="green"
          />
          <StatCard
            label="Discovered"
            value={stats.inactive}
            icon={<Activity className="w-5 h-5" />}
            color="yellow"
          />
          <StatCard
            label="Revenue Today"
            value={formatCurrency(todayStats.totalRevenue)}
            icon={<DollarSign className="w-5 h-5" />}
            color={todayStats.totalRevenue >= 0 ? 'green' : 'red'}
          />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search machines, stores..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
            >
              <option value="all">All Status</option>
              <option value="registered">Registered</option>
              <option value="discovered">Discovered Only</option>
            </select>
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
            <div className="lg:hidden space-y-3">
              {filteredMachines.map((machine) => (
                <div
                  key={machine.machineId}
                  className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white shrink-0">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-medium text-neutral-900 dark:text-white truncate">
                          {machine.machineId}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {machine.store?.storeName || 'Unknown venue'}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(machine.isRegistered ? 'registered' : 'discovered')} text-xs font-medium px-2 py-0.5 shrink-0`}>
                      {machine.isRegistered ? 'Registered' : 'Discovered'}
                    </Badge>
                  </div>

                  {/* Editable Name */}
                  {editingMachine === machine.machineId ? (
                    <div className="flex items-center gap-2 mb-3">
                      <Input
                        value={editName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                        className="text-sm h-9 bg-neutral-50 dark:bg-neutral-800"
                        placeholder="Machine name"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0"
                        onClick={() => saveEditName(machine.machineId)}
                      >
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0"
                        onClick={cancelEditName}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ) : machine.name ? (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">{machine.name}</span>
                      {machine.isRegistered && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => startEditName(machine)}
                        >
                          <Edit2 className="w-3 h-3 text-neutral-400" />
                        </Button>
                      )}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-3 gap-3 py-3 border-t border-neutral-100 dark:border-neutral-800 mb-3">
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">Hub</p>
                      <p className="text-sm font-mono text-neutral-700 dark:text-neutral-300 truncate">
                        {machine.hubId?.slice(-6) || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">Last Seen</p>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300">
                        {formatLastSeen(machine.lastSeen)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">MG #</p>
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {machine.muthaGooseNumber ? `MG${machine.muthaGooseNumber}` : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!machine.isRegistered ? (
                      <Button
                        size="sm"
                        className="flex-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100"
                        onClick={() => handleRegisterMachine(machine)}
                        disabled={registering === machine.machineId}
                      >
                        {registering === machine.machineId ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Register
                      </Button>
                    ) : (
                      <Link href={`/admin/machines/${machine.machineId}`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          View Details
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden lg:block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium">Machine</TableHead>
                      <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium">Name</TableHead>
                      <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium">Venue</TableHead>
                      <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium">Hub</TableHead>
                      <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium">Status</TableHead>
                      <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium">Last Seen</TableHead>
                      <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium">MG #</TableHead>
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
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white">
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
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                            {machine.muthaGooseNumber ? `MG${machine.muthaGooseNumber}` : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {!machine.isRegistered ? (
                            <Button
                              size="sm"
                              className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100"
                              onClick={() => handleRegisterMachine(machine)}
                              disabled={registering === machine.machineId}
                            >
                              {registering === machine.machineId ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4 mr-2" />
                              )}
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
  color: 'green' | 'red' | 'yellow' | 'blue';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
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

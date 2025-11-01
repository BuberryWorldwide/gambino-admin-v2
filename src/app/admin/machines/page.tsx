// src/app/admin/machines/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Search, RefreshCw, DollarSign, Edit2, Check, X, Plus } from 'lucide-react';
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
  const [mounted, setMounted] = useState(false);

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
    // Try to load system-wide metrics (only works for super_admin/gambino_ops)
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
    // If 403, user doesn't have permission - calculate from their machines instead
    if (err.response?.status === 403) {
      console.log('Using venue-scoped metrics');
      // Calculate from loaded machines instead
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
    
    // Get all hubs
    const hubsRes = await api.get('/api/admin/hubs');
    const hubs = hubsRes.data.hubs || [];
    
    const allMachines: Machine[] = [];
    
    // Get machines from each hub
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
        console.log(`✅ Registered ${machine.machineId}`);
        await loadMachines(); // Reload to show updated status
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
        console.log(`✅ Updated name for ${machineId}`);
        // Update local state
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

  return (
    <AdminLayout user={null}>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Machines</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage gaming machines across all venues
            </p>
          </div>
          <Button onClick={() => { loadMachines(); loadTodayStats(); }} disabled={loading} className="w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards - Mobile Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Machines</div>
            <div className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Active Today</div>
            <div className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 text-blue-500">{todayStats.activeMachines}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Vouchers Today</div>
            <div className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 text-purple-500">{todayStats.totalVouchers}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
              <div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Revenue Today</div>
                  <div className="text-xs text-gray-500 mt-1">All venues combined</div>                <div className={`text-xl sm:text-2xl font-bold ${todayStats.totalRevenue >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(todayStats.totalRevenue)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search machines, stores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900"
            >
              <option value="all">All Status</option>
              <option value="registered">Registered</option>
              <option value="discovered">Discovered Only</option>
            </select>
          </div>
        </div>

        {/* Machines Table - Mobile Cards / Desktop Table */}
        {loading ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">Loading machines...</p>
          </div>
        ) : filteredMachines.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-12 text-center">
            <Search className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No machines found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search or wait for machines to be discovered
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: Card Layout */}
            <div className="lg:hidden space-y-3">
              {filteredMachines.map((machine) => (
                <div
                  key={machine.machineId}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {machine.machineId}
                      </div>
                      
                      {/* Editable Name */}
                      {editingMachine === machine.machineId ? (
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="text-sm h-8"
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
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {machine.name || '-'}
                          </span>
                          {machine.isRegistered && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => startEditName(machine)}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {machine.store?.storeName || '-'}
                      </p>
                    </div>
                    
                    <Badge
                      className={
                        machine.isRegistered
                          ? 'bg-blue-500/20 text-blue-400 shrink-0'
                          : 'bg-gray-500/20 text-gray-400 shrink-0'
                      }
                    >
                      {machine.isRegistered ? 'Registered' : 'Discovered'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-800 mb-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Seen</p>
                      <p className="text-sm font-semibold">{formatLastSeen(machine.lastSeen)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">MG #</p>
                      <p className="text-sm font-semibold">
                        {machine.muthaGooseNumber ? `MG${machine.muthaGooseNumber}` : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!machine.isRegistered ? (
                      <Button
                        size="sm"
                        className="flex-1"
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
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden lg:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Hub</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead>MG #</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMachines.map((machine) => (
                      <TableRow key={machine.machineId}>
                        <TableCell className="font-mono text-sm">{machine.machineId}</TableCell>
                        <TableCell>
                          {editingMachine === machine.machineId ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-40 h-8"
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
                              <span>{machine.name || '-'}</span>
                              {machine.isRegistered && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => startEditName(machine)}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {machine.store ? `${machine.store.storeName}` : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{machine.hubId || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              machine.isRegistered
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }
                          >
                            {machine.isRegistered ? 'Registered' : 'Discovered'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatLastSeen(machine.lastSeen)}
                        </TableCell>
                        <TableCell>
                          {machine.muthaGooseNumber ? `MG${machine.muthaGooseNumber}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {!machine.isRegistered ? (
                            <Button
                              size="sm"
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
                              <Button variant="ghost" size="sm">
                                View Details
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
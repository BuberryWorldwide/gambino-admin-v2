// src/app/admin/machines/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Search, RefreshCw, DollarSign } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadMachines();
    loadTodayStats();
  }, []);

  useEffect(() => {
    filterMachines();
  }, [searchTerm, statusFilter, machines]);

  const loadTodayStats = async () => {
    try {
      const response = await api.get('/api/admin/events/today/summary');
      if (response.data.success) {
        setTodayStats(response.data.stats);
      }
    } catch (err) {
      console.error('Failed to load today stats:', err);
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
          
          // Attach hub and store info to each machine, and deduplicate
          hubMachines.forEach((m: Machine) => {
            m.hubId = hub.hubId;
            m.storeId = hub.storeId;
            m.store = hub.store ? {
              storeName: hub.store.storeName,
              city: hub.store.city || '',
              state: hub.store.state || ''
            } : undefined;
            
            // Check if machine already added from another hub
            const existingIndex = allMachines.findIndex(existing => existing.machineId === m.machineId);
            
            if (existingIndex === -1) {
              // New machine, add it
              allMachines.push(m);
            } else {
              // Duplicate discovered machine - keep the one with most recent lastSeen
              const existing = allMachines[existingIndex];
              const existingTime = existing.lastSeen ? new Date(existing.lastSeen).getTime() : 0;
              const newTime = m.lastSeen ? new Date(m.lastSeen).getTime() : 0;
              
              if (newTime > existingTime) {
                // This one is more recent, replace it
                allMachines[existingIndex] = m;
              }
            }
          });
        } catch (err) {
          console.error(`Failed to load machines for hub ${hub.hubId}`);
        }
      }
      
      setMachines(allMachines);
      
      // Calculate stats
      const newStats = {
        total: allMachines.length,
        active: allMachines.filter(m => m.isRegistered).length,
        inactive: allMachines.filter(m => !m.isRegistered).length,
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Machines</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage gaming machines across all venues
            </p>
          </div>
          <Button onClick={() => { loadMachines(); loadTodayStats(); }} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Machines</div>
            <div className="text-3xl font-bold mt-2">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Today</div>
            <div className="text-3xl font-bold mt-2 text-blue-500">{todayStats.activeMachines}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Vouchers Today</div>
            <div className="text-3xl font-bold mt-2 text-purple-500">{todayStats.totalVouchers}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Revenue Today</div>
                <div className={`text-2xl font-bold ${todayStats.totalRevenue >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(todayStats.totalRevenue)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="flex gap-4">
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

        {/* Machines Table */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
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
              {loading ? (
                <TableRow key="loading">
                  <TableCell colSpan={8} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : filteredMachines.length === 0 ? (
                <TableRow key="empty">
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No machines found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMachines.map((machine) => (
                  <TableRow key={machine.machineId}>
                    <TableCell className="font-mono text-sm">{machine.machineId}</TableCell>
                    <TableCell>{machine.name || '-'}</TableCell>
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
                      <Link href={`/admin/machines/${machine.machineId}`}>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
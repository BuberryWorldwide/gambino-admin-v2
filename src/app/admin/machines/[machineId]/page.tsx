
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Calendar, DollarSign, TrendingUp, Activity, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  role?: string;
}

interface Machine {
  _id: string;
  machineId: string;
  name?: string;
  storeId: string;
  storeName?: string;
  hubId?: string;
  gameType?: string;
  location?: string;
  status?: string;
  isRegistered: boolean;
  lastSeen?: string | Date;
  totalDays?: number;
  totalMoneyIn?: number;
  totalMoneyOut?: number;
  totalRevenue?: number;
}

interface DailyStats {
  date: string;
  moneyIn: number;
  moneyOut: number;
  revenue: number;
}

export default function MachineDetailsPage({ params }: { params: Promise<{ machineId: string }> }) {
  const unwrappedParams = use(params);
  const { machineId } = unwrappedParams;
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
    loadMachineDetails();
  }, [machineId]);

  const loadUser = async () => {
    try {
      const res = await api.get('/api/users/profile');
      setUser(res.data.user);
    } catch (err) {
      console.log('Failed to load user profile');
      setUser(null);
    }
  };

  const loadMachineDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load machine details
      const machineRes = await api.get(`/api/admin/machines/${machineId}`);
      setMachine(machineRes.data.machine);

      // Load daily stats for last 30 days
      const statsRes = await api.get(`/api/admin/machines/${machineId}/stats`, {
        params: { days: 30 }
      });
      setDailyStats(statsRes.data.dailyStats || []);

    } catch (err: any) {
      console.error('Failed to load machine details:', err);
      setError(err.response?.data?.error || 'Failed to load machine details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMachineDetails();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <AdminLayout user={user}>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 dark:text-gray-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading machine details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !machine) {
    return (
      <AdminLayout user={user}>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Machine</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error || 'Machine not found'}</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const totalRevenue = dailyStats.reduce((sum, stat) => sum + stat.revenue, 0);
  const totalMoneyIn = dailyStats.reduce((sum, stat) => sum + stat.moneyIn, 0);
  const totalMoneyOut = dailyStats.reduce((sum, stat) => sum + stat.moneyOut, 0);

  return (
    <AdminLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{machine.name || machine.machineId}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {machine.storeName && `${machine.storeName} • `}
                {machine.gameType || 'Gaming Machine'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={machine.isRegistered ? 'default' : 'secondary'}>
              {machine.isRegistered ? 'Registered' : 'Unregistered'}
            </Badge>
            <Badge variant={machine.status === 'active' ? 'default' : 'secondary'}>
              {machine.status || 'Unknown'}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Money In</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalMoneyIn.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Money Out</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalMoneyOut.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Machine Info */}
        <Card>
          <CardHeader>
            <CardTitle>Machine Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Machine ID</label>
                <p className="text-sm font-mono mt-1">{machine.machineId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Store ID</label>
                <p className="text-sm font-mono mt-1">{machine.storeId}</p>
              </div>
              {machine.hubId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Hub ID</label>
                  <p className="text-sm font-mono mt-1">{machine.hubId}</p>
                </div>
              )}
              {machine.location && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="text-sm mt-1">{machine.location}</p>
                </div>
              )}
              {machine.lastSeen && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Seen</label>
                  <p className="text-sm mt-1">{new Date(machine.lastSeen).toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Stats Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Performance</CardTitle>
            <CardDescription>Revenue breakdown for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyStats.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Money In</TableHead>
                    <TableHead className="text-right">Money Out</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyStats.map((stat) => (
                    <TableRow key={stat.date}>
                      <TableCell className="font-medium">
                        {new Date(stat.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">${stat.moneyIn.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${stat.moneyOut.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${stat.revenue.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No performance data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
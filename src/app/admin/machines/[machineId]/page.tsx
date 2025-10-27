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
        <div className="flex items-center justify-center h-[calc(100vh-200px)] px-4">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Machine</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error || 'Machine not found'}</p>
            <Button onClick={() => router.back()} className="w-full sm:w-auto">
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
      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="px-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold break-words">
                {machine.name || machine.machineId}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {machine.storeName && `${machine.storeName} • `}
                {machine.gameType || 'Gaming Machine'}
              </p>
            </div>
          </div>
          
          {/* Badges and Refresh - Mobile Stack */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Badge variant={machine.isRegistered ? 'default' : 'secondary'} className="text-xs">
              {machine.isRegistered ? 'Registered' : 'Unregistered'}
            </Badge>
            <Badge variant={machine.status === 'active' ? 'default' : 'secondary'} className="text-xs">
              {machine.status || 'Unknown'}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={refreshing}
              className="ml-auto sm:ml-0"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards - Responsive Grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Money In</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">${totalMoneyIn.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Money Out</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">${totalMoneyOut.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Machine Info - Mobile Optimized */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Machine Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Machine ID</label>
                <p className="text-sm font-mono mt-1 break-all">{machine.machineId}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Store ID</label>
                <p className="text-sm font-mono mt-1 break-all">{machine.storeId}</p>
              </div>
              {machine.hubId && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">Hub ID</label>
                  <p className="text-sm font-mono mt-1 break-all">{machine.hubId}</p>
                </div>
              )}
              {machine.location && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">Location</label>
                  <p className="text-sm mt-1">{machine.location}</p>
                </div>
              )}
              {machine.lastSeen && (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">Last Seen</label>
                  <p className="text-sm mt-1">{new Date(machine.lastSeen).toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Stats - Mobile Cards / Desktop Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Daily Performance</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Revenue breakdown for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyStats.length > 0 ? (
              <>
                {/* Mobile: Card Layout */}
                <div className="lg:hidden space-y-3">
                  {dailyStats.map((stat) => (
                    <div 
                      key={stat.date}
                      className="border border-gray-200 dark:border-gray-800 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium text-sm">
                          {new Date(stat.date).toLocaleDateString()}
                        </div>
                        <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                          ${stat.revenue.toFixed(2)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-muted-foreground mb-1">Money In</div>
                          <div className="font-medium">${stat.moneyIn.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-1">Money Out</div>
                          <div className="font-medium">${stat.moneyOut.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: Table Layout */}
                <div className="hidden lg:block overflow-x-auto">
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
                          <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                            ${stat.revenue.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No performance data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
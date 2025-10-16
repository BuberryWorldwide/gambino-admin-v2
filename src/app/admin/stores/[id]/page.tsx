'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  Edit,
  RefreshCw,
  Download
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AdminLayout from '@/components/layout/AdminLayout';

interface Store {
  _id: string;
  storeId: string;
  storeName: string;
  city: string;
  state: string;
  address?: string;
  phone?: string;
  status: string;
  feePercentage?: number;
  ownerUserId?: string;
}

interface MachineData {
  machineId: string;
  moneyIn: number;
  collect: number;  // Backend uses 'collect' not 'moneyOut'
  netRevenue: number;
  transactionCount?: number;
  lastSeen?: string;
}

interface MachineBreakdown {
  machineId: string;
  moneyIn: number;
  moneyOut: number;  // Calculated frontend value
  net: number;
}

interface DailyReport {
  _id: string;
  date: string;
  reconciliationStatus: 'included' | 'pending' | 'excluded';
  machineData: MachineData[];
  submittedAt?: string;
  notes?: string;
}

export default function StoreDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;
  
  const [store, setStore] = useState<Store | null>(null);
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Date navigation
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateString = selectedDate.toISOString().split('T')[0];

  // Stats comparison
  const [weekStats, setWeekStats] = useState<any>(null);
  const [monthStats, setMonthStats] = useState<any>(null);

  useEffect(() => {
    loadAllData();
  }, [storeId]);

  useEffect(() => {
    if (store) {
      loadDailyReports();
    }
  }, [selectedDate, store]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load store details
      const storeRes = await api.get(`/api/admin/stores/${storeId}`);
      setStore(storeRes.data.store);
      
      // Load daily reports
      await loadDailyReports();
      
      // Load week/month stats
      await loadStats();
    } catch (err) {
      console.error('Failed to load store data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyReports = async () => {
    try {
      const reportsRes = await api.get(`/api/admin/reports/daily/${storeId}`, {
        params: { date: dateString }
      });
      setTodayData(reportsRes.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setTodayData(null);
    }
  };

  const loadStats = async () => {
    try {
      // Load week stats (last 7 days)
      const weekRes = await api.get(`/api/admin/stores/${storeId}/stats`, {
        params: { period: 'week' }
      });
      setWeekStats(weekRes.data);

      // Load month stats (last 30 days)
      const monthRes = await api.get(`/api/admin/stores/${storeId}/stats`, {
        params: { period: 'month' }
      });
      setMonthStats(monthRes.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  // Date navigation
  const goToPrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  const calculateTotals = () => {
    if (!todayData?.reports || todayData.reports.length === 0) {
      return { moneyIn: 0, moneyOut: 0, net: 0, machineCount: 0, reportCount: 0, pendingCount: 0 };
    }
    
    const activeReports = todayData.reports.filter(
      (r: DailyReport) => r.reconciliationStatus === 'included' || r.reconciliationStatus === 'pending'
    );
    
    const includedCount = todayData.reports.filter(
      (r: DailyReport) => r.reconciliationStatus === 'included'
    ).length;
    
    const pendingCount = todayData.reports.filter(
      (r: DailyReport) => r.reconciliationStatus === 'pending'
    ).length;
    
    const machines = new Set();
    let totalMoneyIn = 0;
    let totalNet = 0;
    
    activeReports.forEach((report: DailyReport) => {
      report.machineData?.forEach((machine) => {
        machines.add(machine.machineId);
        totalMoneyIn += machine.moneyIn || 0;
        totalNet += machine.netRevenue || 0;
      });
    });
    
    // Calculate moneyOut as moneyIn - netRevenue (same as old code)
    const totalMoneyOut = totalMoneyIn - totalNet;
    
    return {
      moneyIn: totalMoneyIn,
      moneyOut: totalMoneyOut,
      net: totalNet,
      machineCount: machines.size,
      reportCount: includedCount,
      pendingCount: pendingCount
    };
  };

  const getMachineBreakdown = () => {
    if (!todayData?.reports) return [];
    
    const machineMap = new Map();
    
    todayData.reports
      .filter((r: DailyReport) => r.reconciliationStatus === 'included' || r.reconciliationStatus === 'pending')
      .forEach((report: DailyReport) => {
        report.machineData?.forEach((machine) => {
          if (!machineMap.has(machine.machineId)) {
            machineMap.set(machine.machineId, {
              machineId: machine.machineId,
              moneyIn: 0,
              net: 0,
              moneyOut: 0
            });
          }
          const m = machineMap.get(machine.machineId);
          m.moneyIn += machine.moneyIn || 0;
          m.net += machine.netRevenue || 0;
        });
      });
    
    // Calculate moneyOut for each machine (same as old code)
    return Array.from(machineMap.values()).map(m => ({
      ...m,
      moneyOut: m.moneyIn - m.net
    }));
  };

  const approvePendingReports = async () => {
    if (!todayData?.reports) return;
    
    const pendingReports = todayData.reports.filter(
      (r: DailyReport) => r.reconciliationStatus === 'pending'
    );
    
    if (pendingReports.length === 0) return;
    
    try {
      await Promise.all(
        pendingReports.map((report: DailyReport) =>
          api.put(`/api/admin/reports/${report._id}`, {
            reconciliationStatus: 'included',
            notes: 'Approved from store dashboard'
          })
        )
      );
      
      await loadDailyReports();
    } catch (err) {
      console.error('Failed to approve reports:', err);
    }
  };

  const exportData = () => {
    // TODO: Implement CSV export
    console.log('Exporting data...');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 dark:border-yellow-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading store data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!store) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">Store not found</p>
            <Button onClick={() => router.push('/admin/stores')}>
              Back to Stores
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const totals = calculateTotals();
  const machineBreakdown = getMachineBreakdown();

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex items-start gap-4">
              <Button
                onClick={() => router.push('/admin/stores')}
                variant="outline"
                size="sm"
                className="mt-1 border-gray-300 dark:border-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {store.storeName}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {store.address}, {store.city}, {store.state}
                  </div>
                  {store.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4" />
                      {store.phone}
                    </div>
                  )}
                  <Badge className={
                    store.status === 'active'
                      ? 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border border-green-500/20'
                      : 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border border-red-500/20'
                  }>
                    {store.status}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={refreshing}
                className="border-gray-300 dark:border-gray-700"
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={exportData}
                variant="outline"
                size="sm"
                className="border-gray-300 dark:border-gray-700"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Export
              </Button>
              <Button
                onClick={() => router.push(`/admin/stores/${storeId}/edit`)}
                className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-400 dark:hover:bg-yellow-500 text-gray-900"
              >
                <Edit className="w-4 h-4 mr-1.5" />
                Edit Store
              </Button>
            </div>
          </div>
        </div>

        {/* Date Navigator */}
        <Card className="p-4 mb-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <Button
              onClick={goToPrevDay}
              variant="outline"
              size="sm"
              className="border-gray-300 dark:border-gray-700"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            <div className="text-center">
              <div className="flex items-center gap-2 justify-center mb-1">
                <Calendar className="w-5 h-5 text-gray-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h2>
              </div>
              {!isToday() && (
                <button
                  onClick={goToToday}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Jump to Today
                </button>
              )}
            </div>

            <Button
              onClick={goToNextDay}
              disabled={isToday()}
              variant="outline"
              size="sm"
              className="border-gray-300 dark:border-gray-700"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>

        {/* Daily Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Money IN</p>
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${totals.moneyIn.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cash inserted today</p>
          </Card>

          <Card className="p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Money OUT</p>
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${totals.moneyOut.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Vouchers paid out</p>
          </Card>

          <Card className="p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Revenue</p>
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <DollarSign className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${totals.net.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {store.feePercentage}% fee = ${(totals.net * (store.feePercentage || 5) / 100).toFixed(2)}
            </p>
          </Card>

          <Card className="p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Machines</p>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totals.machineCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {totals.reportCount} approved, {totals.pendingCount} pending
            </p>
          </Card>
        </div>

        {/* Alerts & Notifications */}
        {totals.reportCount === 0 && totals.pendingCount === 0 && (
          <Card className="p-4 mb-6 bg-blue-500/10 border-blue-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">No Data for This Date</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  No reports found for {selectedDate.toLocaleDateString()}. Reports are automatically created when the daily report button is pressed on the Mutha Goose.
                </p>
              </div>
            </div>
          </Card>
        )}

        {totals.pendingCount > 0 && (
          <Card className="p-4 mb-6 bg-yellow-500/10 border-yellow-500/20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-1">
                    {totals.pendingCount} Pending Report{totals.pendingCount !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    These reports are from the Mutha Goose but haven't been approved yet. They're shown above but won't count in official totals until approved.
                  </p>
                </div>
              </div>
              <Button
                onClick={approvePendingReports}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white shrink-0"
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Approve All
              </Button>
            </div>
          </Card>
        )}

        {/* Machine Breakdown Table */}
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Machine Breakdown</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Revenue by machine for {selectedDate.toLocaleDateString()}
            </p>
          </div>

          {machineBreakdown.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">No Machine Data</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No machine data available for this date. Press the daily report button on the Mutha Goose to generate data.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-gray-800">
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">Machine ID</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-right">Money IN</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-right">Money OUT</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-right">Net Revenue</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-right">Store Fee ({store.feePercentage}%)</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-right">Venue Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machineBreakdown.map((machine) => {
                    const storeFee = machine.net * (store.feePercentage || 5) / 100;
                    const venueShare = machine.net - storeFee;
                    return (
                      <TableRow
                        key={machine.machineId}
                        className="border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <TableCell className="font-mono font-medium text-gray-900 dark:text-white">
                          {machine.machineId}
                        </TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400 font-medium">
                          ${machine.moneyIn.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400 font-medium">
                          ${machine.moneyOut.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-yellow-600 dark:text-yellow-400 font-bold">
                          ${machine.net.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-purple-600 dark:text-purple-400 font-medium">
                          ${storeFee.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-blue-600 dark:text-blue-400 font-medium">
                          ${venueShare.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Totals Row */}
                  <TableRow className="border-t-2 border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                    <TableCell className="font-bold text-gray-900 dark:text-white">TOTALS</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400 font-bold">
                      ${totals.moneyIn.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400 font-bold">
                      ${totals.moneyOut.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-yellow-600 dark:text-yellow-400 font-bold text-lg">
                      ${totals.net.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-purple-600 dark:text-purple-400 font-bold">
                      ${(totals.net * (store.feePercentage || 5) / 100).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600 dark:text-blue-400 font-bold">
                      ${(totals.net - (totals.net * (store.feePercentage || 5) / 100)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
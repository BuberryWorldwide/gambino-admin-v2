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
  MapPin,
  Edit,
  RefreshCw,
  Download
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
}

interface VenueStats {
  totalMachines: number;
  moneyIn: number;
  moneyOut: number;
  voucherCount: number;
  voucherTotal: number;
  netRevenue: number;
}

interface MachineRevenue {
  machineId: string;
  moneyIn: number;
  moneyOut: number;
  netRevenue: number;
}

interface EventData {
  eventType: string;
  gamingMachineId?: string;
  machineId?: string;
  amount?: number;
}

export default function StoreDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;
  
  const [store, setStore] = useState<Store | null>(null);
  const [todayStats, setTodayStats] = useState<VenueStats | null>(null);
  const [machineRevenue, setMachineRevenue] = useState<MachineRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Date navigation
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, selectedDate]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load store details
      const storeRes = await api.get(`/api/admin/stores/${storeId}`);
      setStore(storeRes.data.store);
      
      // Load venue events for selected date
      await loadVenueStats();
    } catch (err) {
      console.error('Failed to load store data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVenueStats = async () => {
    try {
      // Calculate start and end of selected day
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const response = await api.get(`/api/admin/stores/${storeId}/daily/${selectedDate.toISOString().split('T')[0]}`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      if (response.data) {
        // Count vouchers from machines
        const voucherCount = 0;
        const voucherTotal = 0;
            
        setTodayStats({
          totalMachines: response.data.machines?.length || 0,
          moneyIn: response.data.totalMoneyIn || 0,
          moneyOut: response.data.totalMoneyOut || 0,
          voucherCount: voucherCount,
          voucherTotal: voucherTotal,
          netRevenue: response.data.netRevenue || 0
        });
        
        const sortedMachines = (response.data.machines || [])
          .map((m: { machineId: string; moneyIn: number; moneyOut: number }) => ({
            machineId: m.machineId,
            moneyIn: m.moneyIn,
            moneyOut: m.moneyOut,
            netRevenue: m.moneyIn - m.moneyOut
          }))
          .sort((a: MachineRevenue, b: MachineRevenue) => b.netRevenue - a.netRevenue);
        
        setMachineRevenue(sortedMachines);
      }
    } catch (err) {
      console.error('Failed to load venue stats:', err);
      setTodayStats(null);
      setMachineRevenue([]);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
        <div className="p-6 text-center">
          <p className="text-red-500">Store not found</p>
        </div>
      </AdminLayout>
    );
  }

  const feePercentage = store.feePercentage || 25;
  const netRevenue = todayStats?.netRevenue || 0;
  const storeFee = netRevenue * (feePercentage / 100);
  const venueShare = netRevenue - storeFee;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Button
              onClick={() => router.push('/admin/stores')}
              variant="outline"
              size="sm"
              className="border-gray-300 dark:border-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {store.storeName}
              </h1>
              <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{store.city}, {store.state}</span>
                </div>
                <Badge className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-500/20">
                  {store.status}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="border-gray-300 dark:border-gray-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => router.push(`/admin/stores/${storeId}/export`)}
                variant="outline"
                size="sm"
                className="border-gray-300 dark:border-gray-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={() => router.push(`/admin/stores/${storeId}/edit`)}
                size="sm"
                className="bg-yellow-500 hover:bg-yellow-600 text-gray-900"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Store
              </Button>
            </div>
          </div>
        </div>

        {/* Date Selector */}
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

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
              {!isToday() && (
                <button
                  onClick={goToToday}
                  className="text-sm text-yellow-600 dark:text-yellow-400 hover:underline"
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
              {formatCurrency(todayStats?.moneyIn || 0)}
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
              {formatCurrency(todayStats?.moneyOut || 0)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {todayStats?.voucherCount || 0} vouchers paid out
            </p>
          </Card>

          <Card className="p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Revenue</p>
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <DollarSign className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(netRevenue)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {feePercentage}% fee = {formatCurrency(storeFee)}
            </p>
          </Card>

          <Card className="p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Machines</p>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {todayStats?.totalMachines || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {machineRevenue.length} active today
            </p>
          </Card>
        </div>

        {/* Machine Breakdown Table */}
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Machine Breakdown</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Revenue by machine for {selectedDate.toLocaleDateString()}
            </p>
          </div>

          {machineRevenue.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">No Machine Data</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No events recorded for this date. Data is automatically collected from your Pi devices.
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
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-right">Store Fee ({feePercentage}%)</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300 font-semibold text-right">Venue Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machineRevenue.map((machine) => {
                    const machineFee = machine.netRevenue * (feePercentage / 100);
                    const machineShare = machine.netRevenue - machineFee;
                    return (
                      <TableRow
                        key={machine.machineId}
                        className="border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <TableCell className="font-mono font-medium text-gray-900 dark:text-white">
                          {machine.machineId}
                        </TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400 font-medium">
                          {formatCurrency(machine.moneyIn)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400 font-medium">
                          {formatCurrency(machine.moneyOut)}
                        </TableCell>
                        <TableCell className="text-right text-yellow-600 dark:text-yellow-400 font-bold">
                          {formatCurrency(machine.netRevenue)}
                        </TableCell>
                        <TableCell className="text-right text-purple-600 dark:text-purple-400 font-medium">
                          {formatCurrency(machineFee)}
                        </TableCell>
                        <TableCell className="text-right text-blue-600 dark:text-blue-400 font-medium">
                          {formatCurrency(machineShare)}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Totals Row */}
                  <TableRow className="border-t-2 border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                    <TableCell className="font-bold text-gray-900 dark:text-white">TOTALS</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400 font-bold">
                      {formatCurrency(todayStats?.moneyIn || 0)}
                    </TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400 font-bold">
                      {formatCurrency(todayStats?.moneyOut || 0)}
                    </TableCell>
                    <TableCell className="text-right text-yellow-600 dark:text-yellow-400 font-bold text-lg">
                      {formatCurrency(netRevenue)}
                    </TableCell>
                    <TableCell className="text-right text-purple-600 dark:text-purple-400 font-bold">
                      {formatCurrency(storeFee)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600 dark:text-blue-400 font-bold">
                      {formatCurrency(venueShare)}
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
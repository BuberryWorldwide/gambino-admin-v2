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
  Download,
  Cpu
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      const response = await api.get(`/api/admin/reports/${storeId}/cumulative/${selectedDate.toISOString().split('T')[0]}`);

      if (response.data) {
        setTodayStats({
          totalMachines: response.data.machines?.length || 0,
          moneyIn: response.data.totalMoneyIn || 0,
          moneyOut: response.data.totalMoneyOut || 0,
          voucherCount: 0,
          voucherTotal: 0,
          netRevenue: response.data.netRevenue || 0
        });

        const sortedMachines = (response.data.machines || [])
          .map((m: { machineId: string; moneyIn: number; collect: number }) => ({
            machineId: m.machineId,
            moneyIn: m.moneyIn,
            moneyOut: m.collect,
            netRevenue: m.moneyIn - m.collect
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
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-4" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading venue...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!store) {
    return (
      <AdminLayout>
        <div className="p-4 text-center">
          <p className="text-red-500">Venue not found</p>
          <Button onClick={() => router.push('/admin/stores')} className="mt-4">
            Back to Venues
          </Button>
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
      <div className="p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/admin/stores')}
            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Venues
          </button>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-white truncate">
                {store.storeName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {store.city}, {store.state}
                </span>
                <Badge className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 text-xs">
                  {store.status}
                </Badge>
              </div>
            </div>

            <Button
              onClick={() => router.push(`/admin/stores/${storeId}/edit`)}
              size="sm"
              className="bg-yellow-500 hover:bg-yellow-600 text-black flex-shrink-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons - Mobile Stacked */}
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="flex-1 border-neutral-200 dark:border-neutral-800"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => router.push(`/admin/stores/${storeId}/export`)}
            variant="outline"
            size="sm"
            className="flex-1 border-neutral-200 dark:border-neutral-800"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
        </div>

        {/* Date Selector - Mobile Optimized */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={goToPrevDay}
              className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 text-center min-w-0">
              <div className="flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              {!isToday() && (
                <button
                  onClick={goToToday}
                  className="text-xs text-yellow-600 dark:text-yellow-400 hover:underline mt-1"
                >
                  Today
                </button>
              )}
            </div>

            <button
              onClick={goToNextDay}
              disabled={isToday()}
              className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Daily Summary Cards - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 uppercase">In</span>
            </div>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(todayStats?.moneyIn || 0)}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 uppercase">Out</span>
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(todayStats?.moneyOut || 0)}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-950/50 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 uppercase">Net</span>
            </div>
            <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
              {formatCurrency(netRevenue)}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {100 - feePercentage}% venue share
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 uppercase">Machines</span>
            </div>
            <p className="text-xl font-bold text-neutral-900 dark:text-white">
              {machineRevenue.length}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              active today
            </p>
          </div>
        </div>

        {/* Revenue Split Card */}
        <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl p-4 text-neutral-900">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium opacity-80">Venue Share</span>
            <span className="text-xs opacity-70">{100 - feePercentage}%</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(venueShare)}</p>
          <div className="flex items-center justify-between mt-2 text-sm opacity-80">
            <span>Platform Share ({feePercentage}%)</span>
            <span>{formatCurrency(storeFee)}</span>
          </div>
        </div>

        {/* Machine Breakdown - Card Layout for Mobile */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="font-semibold text-neutral-900 dark:text-white">Machine Breakdown</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>

          {machineRevenue.length === 0 ? (
            <div className="p-8 text-center">
              <Cpu className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
              <h3 className="font-medium text-neutral-900 dark:text-white mb-1">No Data</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No events recorded for this date
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {machineRevenue.map((machine, index) => {
                const machineFee = machine.netRevenue * (feePercentage / 100);
                const machineShare = machine.netRevenue - machineFee;
                return (
                  <div key={machine.machineId} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index < 3
                            ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-mono text-sm font-medium text-neutral-900 dark:text-white">
                          {machine.machineId}
                        </span>
                      </div>
                      <span className={`text-sm font-bold ${machine.netRevenue >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(machine.netRevenue)}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-neutral-500 dark:text-neutral-400 block">In</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {formatCurrency(machine.moneyIn)}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 dark:text-neutral-400 block">Out</span>
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          {formatCurrency(machine.moneyOut)}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 dark:text-neutral-400 block">Platform</span>
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                          {formatCurrency(machineFee)}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 dark:text-neutral-400 block">Venue</span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {formatCurrency(machineShare)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Totals Card */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-neutral-900 dark:text-white">Total</span>
                  <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    {formatCurrency(netRevenue)}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400 block">In</span>
                    <span className="text-green-600 dark:text-green-400 font-bold">
                      {formatCurrency(todayStats?.moneyIn || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400 block">Out</span>
                    <span className="text-red-600 dark:text-red-400 font-bold">
                      {formatCurrency(todayStats?.moneyOut || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400 block">Platform</span>
                    <span className="text-purple-600 dark:text-purple-400 font-bold">
                      {formatCurrency(storeFee)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400 block">Venue</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {formatCurrency(venueShare)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

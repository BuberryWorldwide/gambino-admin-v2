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
  Cpu,
  ChevronDown
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line
} from 'recharts';
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

interface TrendData {
  date: string;
  netRevenue: number;
}

interface Hub {
  _id: string;
  hubId: string;
  name: string;
  storeId: string;
  status: string;
}

interface MachineHubMapping {
  [machineId: string]: string; // machineId -> hubId
}

interface DailyBreakdown {
  date: string;
  moneyIn: number;
  moneyOut: number;
  netRevenue: number;
  machineCount: number;
}

export default function StoreDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [todayStats, setTodayStats] = useState<VenueStats | null>(null);
  const [machineRevenue, setMachineRevenue] = useState<MachineRevenue[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Date navigation
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRangeMode, setDateRangeMode] = useState<'day' | '7days' | '30days' | 'custom'>('day');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rangeStats, setRangeStats] = useState<VenueStats | null>(null);
  const [dailyBreakdown, setDailyBreakdown] = useState<DailyBreakdown[]>([]);

  // Hub-related state
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [machineHubMapping, setMachineHubMapping] = useState<MachineHubMapping>({});
  const [expandedHubs, setExpandedHubs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, selectedDate]);

  // Load range data when mode changes
  useEffect(() => {
    if (dateRangeMode !== 'day') {
      loadRangeStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRangeMode, startDate, endDate]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load store details
      const storeRes = await api.get(`/api/admin/stores/${storeId}`);
      setStore(storeRes.data.store);

      // Load hubs for this store
      await loadHubs();

      // Load venue events for selected date
      await loadVenueStats();

      // Load 7-day trend data
      await load7DayTrend();
    } catch (err) {
      console.error('Failed to load store data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHubs = async () => {
    try {
      const response = await api.get(`/api/admin/hubs?storeId=${storeId}`);
      const hubsData = response.data.hubs || response.data || [];
      setHubs(hubsData);

      // Also load machine-to-hub mapping from events
      await loadMachineHubMapping();
    } catch (err) {
      console.error('Failed to load hubs:', err);
      setHubs([]);
    }
  };

  const loadMachineHubMapping = async () => {
    try {
      // Get machine-hub mapping from the dedicated endpoint
      const response = await api.get(`/api/admin/reports/${storeId}/machine-hub-mapping`);

      if (response.data?.success) {
        setMachineHubMapping(response.data.mapping || {});

        // Update hub names if available
        if (response.data.hubNames) {
          const hubNames = response.data.hubNames;
          const hubIds = Object.keys(hubNames);
          setHubs(hubIds.map(hubId => ({
            _id: hubId,
            hubId: hubId,
            name: hubNames[hubId],
            storeId: storeId as string,
            status: 'online'
          })));
        }
      } else {
        setMachineHubMapping({});
      }
    } catch (err) {
      // Silently fail - hub grouping will fall back to flat list
      console.log('Machine-hub mapping not available, using flat list');
      setMachineHubMapping({});
    }
  };

  const toggleHubExpanded = (hubId: string) => {
    setExpandedHubs(prev => {
      const next = new Set(prev);
      if (next.has(hubId)) {
        next.delete(hubId);
      } else {
        next.add(hubId);
      }
      return next;
    });
  };

  const getMachinesByHub = () => {
    // Group machines by their hub
    const grouped: { [hubId: string]: MachineRevenue[] } = {};
    const unmapped: MachineRevenue[] = [];

    machineRevenue.forEach(machine => {
      const hubId = machineHubMapping[machine.machineId];
      if (hubId) {
        if (!grouped[hubId]) {
          grouped[hubId] = [];
        }
        grouped[hubId].push(machine);
      } else {
        unmapped.push(machine);
      }
    });

    return { grouped, unmapped };
  };

  const getHubName = (hubId: string): string => {
    const hub = hubs.find(h => h.hubId === hubId);
    return hub?.name || hubId;
  };

  const getHubStats = (machines: MachineRevenue[]) => {
    return {
      moneyIn: machines.reduce((sum, m) => sum + m.moneyIn, 0),
      moneyOut: machines.reduce((sum, m) => sum + m.moneyOut, 0),
      netRevenue: machines.reduce((sum, m) => sum + m.netRevenue, 0),
      count: machines.length
    };
  };

  const load7DayTrend = async () => {
    try {
      // Fetch last 7 days of data
      const trends: TrendData[] = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        try {
          const response = await api.get(`/api/admin/reports/${storeId}/cumulative/${dateStr}`);
          trends.push({
            date: date.toLocaleDateString('en-US', { weekday: 'short' }),
            netRevenue: response.data?.netRevenue || 0
          });
        } catch {
          trends.push({
            date: date.toLocaleDateString('en-US', { weekday: 'short' }),
            netRevenue: 0
          });
        }
      }

      setTrendData(trends);
    } catch (err) {
      console.error('Failed to load 7-day trend:', err);
      setTrendData([]);
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
          .filter((m: { machineId: string }) => m.machineId !== 'grand_total')
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

  const loadRangeStats = async () => {
    try {
      let start: Date;
      let end: Date = new Date();

      if (dateRangeMode === '7days') {
        start = new Date();
        start.setDate(start.getDate() - 6);
      } else if (dateRangeMode === '30days') {
        start = new Date();
        start.setDate(start.getDate() - 29);
      } else {
        start = startDate;
        end = endDate;
      }

      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      // Use single API call for date range
      const response = await api.get(`/api/admin/reports/${storeId}/cumulative-range?startDate=${startStr}&endDate=${endStr}`);

      if (response.data) {
        setRangeStats({
          totalMachines: response.data.machines?.length || 0,
          moneyIn: response.data.totalMoneyIn || 0,
          moneyOut: response.data.totalMoneyOut || 0,
          voucherCount: response.data.voucherCount || 0,
          voucherTotal: response.data.voucherTotal || 0,
          netRevenue: response.data.netRevenue || 0
        });

        // Map machine data to expected format (filter out grand_total)
        const machines = (response.data.machines || [])
          .filter((m: { machineId: string }) => m.machineId !== 'grand_total')
          .map((m: { machineId: string; moneyIn: number; collect: number; netRevenue: number }) => ({
            machineId: m.machineId,
            moneyIn: m.moneyIn,
            moneyOut: m.collect,
            netRevenue: m.netRevenue
          }));
        setMachineRevenue(machines);

        // Set daily breakdown for accounting table
        setDailyBreakdown(response.data.dailyBreakdown || []);

        // Update trend chart with range data (reversed so oldest first)
        const rangeTrend = (response.data.dailyBreakdown || [])
          .slice()
          .reverse()
          .map((d: DailyBreakdown) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            netRevenue: d.netRevenue
          }));
        setTrendData(rangeTrend);
      }
    } catch (err) {
      console.error('Failed to load range stats:', err);
    }
  };

  const handleDateRangeChange = (mode: 'day' | '7days' | '30days' | 'custom') => {
    setDateRangeMode(mode);
    setShowDatePicker(false);

    if (mode === 'day') {
      setSelectedDate(new Date());
      loadVenueStats();
    } else if (mode === '7days') {
      const start = new Date();
      start.setDate(start.getDate() - 6);
      setStartDate(start);
      setEndDate(new Date());
    } else if (mode === '30days') {
      const start = new Date();
      start.setDate(start.getDate() - 29);
      setStartDate(start);
      setEndDate(new Date());
    } else if (mode === 'custom') {
      setShowDatePicker(true);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    if (dateRangeMode !== 'day') {
      await loadRangeStats();
    }
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
  const activeStats = dateRangeMode === 'day' ? todayStats : rangeStats;
  const netRevenue = activeStats?.netRevenue || 0;
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

        {/* Date Range Selector */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 space-y-3">
          {/* Range Quick Selectors */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => handleDateRangeChange('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                dateRangeMode === 'day'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Single Day
            </button>
            <button
              onClick={() => handleDateRangeChange('7days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                dateRangeMode === '7days'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleDateRangeChange('30days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                dateRangeMode === '30days'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handleDateRangeChange('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                dateRangeMode === 'custom'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Single Day Navigation */}
          {dateRangeMode === 'day' && (
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
          )}

          {/* Range Display */}
          {dateRangeMode !== 'day' && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <span className="text-neutral-900 dark:text-white font-medium">
                {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' - '}
                {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}

          {/* Custom Date Picker */}
          {showDatePicker && dateRangeMode === 'custom' && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex-1">
                <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate.toISOString().split('T')[0]}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  max={endDate.toISOString().split('T')[0]}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate.toISOString().split('T')[0]}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                  min={startDate.toISOString().split('T')[0]}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => loadRangeStats()}
                  className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black text-sm font-medium"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Revenue Trend Chart */}
        {trendData.length > 0 && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-neutral-900 dark:text-white text-sm">
                {dateRangeMode === 'day' ? '7-Day Trend' : `${trendData.length}-Day Trend`}
              </h3>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Net Revenue
              </span>
            </div>
            <div className={dateRangeMode === '30days' || (dateRangeMode === 'custom' && trendData.length > 14) ? 'h-40' : 'h-24'}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Net Revenue']}
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="netRevenue"
                    stroke="#eab308"
                    strokeWidth={2}
                    dot={{ fill: '#eab308', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: '#eab308' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

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
              {formatCurrency(activeStats?.moneyIn || 0)}
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
              {formatCurrency(activeStats?.moneyOut || 0)}
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
              {dateRangeMode === 'day' ? 'active today' : 'in period'}
            </p>
          </div>
        </div>

        {/* Revenue Split Card with Donut Chart */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Revenue Split</h3>
          <div className="flex items-center gap-4">
            {/* Donut Chart */}
            <div className="w-32 h-32 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Venue', value: venueShare, color: '#eab308' },
                      { name: 'Platform', value: storeFee, color: '#a855f7' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    <Cell fill="#eab308" />
                    <Cell fill="#a855f7" />
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend and Values */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Venue ({100 - feePercentage}%)</span>
                </div>
                <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{formatCurrency(venueShare)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Platform ({feePercentage}%)</span>
                </div>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{formatCurrency(storeFee)}</span>
              </div>
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Total Net</span>
                  <span className="text-lg font-bold text-neutral-900 dark:text-white">{formatCurrency(netRevenue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Machine Performance Bar Chart - Top 5 only */}
        {machineRevenue.length > 0 && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">Machine Performance</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Top 5 by net revenue</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={machineRevenue.slice(0, 5)}
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  barCategoryGap="20%"
                >
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`}
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="machineId"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                    width={75}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Net Revenue']}
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="netRevenue" fill="#eab308" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {machineRevenue.slice(0, 5).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.netRevenue >= 0 ? '#eab308' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Daily Breakdown Table - Only shown in range mode */}
        {dateRangeMode !== 'day' && dailyBreakdown.length > 0 && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="font-semibold text-neutral-900 dark:text-white">Daily Breakdown</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {dailyBreakdown.length} days with data
              </p>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <div>Date</div>
              <div className="text-right">In</div>
              <div className="text-right">Out</div>
              <div className="text-right">Net</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {dailyBreakdown.map((day) => (
                <div key={day.date} className="grid grid-cols-4 gap-2 px-4 py-3 text-sm">
                  <div className="text-neutral-900 dark:text-white font-medium">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-right text-green-600 dark:text-green-400">
                    {formatCurrency(day.moneyIn)}
                  </div>
                  <div className="text-right text-red-600 dark:text-red-400">
                    {formatCurrency(day.moneyOut)}
                  </div>
                  <div className={`text-right font-medium ${day.netRevenue >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(day.netRevenue)}
                  </div>
                </div>
              ))}
            </div>

            {/* Table Footer - Totals */}
            <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700 text-sm font-bold">
              <div className="text-neutral-900 dark:text-white">Total</div>
              <div className="text-right text-green-600 dark:text-green-400">
                {formatCurrency(activeStats?.moneyIn || 0)}
              </div>
              <div className="text-right text-red-600 dark:text-red-400">
                {formatCurrency(activeStats?.moneyOut || 0)}
              </div>
              <div className="text-right text-yellow-600 dark:text-yellow-400">
                {formatCurrency(netRevenue)}
              </div>
            </div>
          </div>
        )}

        {/* Machine Breakdown - Grouped by Hub with Collapsible Sections */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="font-semibold text-neutral-900 dark:text-white">Machine Breakdown</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {dateRangeMode === 'day'
                ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              }
              {hubs.length > 0 && ` • ${hubs.length} Pi Hubs`}
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
              {/* Hub-grouped sections */}
              {(() => {
                const { grouped, unmapped } = getMachinesByHub();
                const hubIds = Object.keys(grouped).sort();
                const hasHubGrouping = hubIds.length > 0;

                if (!hasHubGrouping) {
                  // No hub mapping - show flat list with limited display
                  return (
                    <>
                      {machineRevenue.slice(0, 10).map((machine) => (
                          <div key={machine.machineId} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                                  {machine.machineId}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-green-600 dark:text-green-400">{formatCurrency(machine.moneyIn)}</span>
                                <span className="text-red-600 dark:text-red-400">{formatCurrency(machine.moneyOut)}</span>
                                <span className={`font-bold ${machine.netRevenue >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {formatCurrency(machine.netRevenue)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      {machineRevenue.length > 10 && (
                        <div className="p-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
                          +{machineRevenue.length - 10} more machines
                        </div>
                      )}
                    </>
                  );
                }

                // Hub-grouped display
                return (
                  <>
                    {hubIds.map(hubId => {
                      const machines = grouped[hubId];
                      const hubStats = getHubStats(machines);
                      const isExpanded = expandedHubs.has(hubId);

                      return (
                        <div key={hubId}>
                          {/* Hub Header - Clickable */}
                          <button
                            onClick={() => toggleHubExpanded(hubId)}
                            className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              <div className="text-left">
                                <span className="font-medium text-neutral-900 dark:text-white">
                                  {getHubName(hubId)}
                                </span>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">
                                  {machines.length} machines
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-green-600 dark:text-green-400">{formatCurrency(hubStats.moneyIn)}</span>
                              <span className="text-red-600 dark:text-red-400">{formatCurrency(hubStats.moneyOut)}</span>
                              <span className={`font-bold ${hubStats.netRevenue >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatCurrency(hubStats.netRevenue)}
                              </span>
                            </div>
                          </button>

                          {/* Expanded Machine List */}
                          {isExpanded && (
                            <div className="bg-neutral-50/50 dark:bg-neutral-800/30 divide-y divide-neutral-100 dark:divide-neutral-800">
                              {machines.map((machine) => (
                                  <div key={machine.machineId} className="px-4 py-2 pl-11">
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                                        {machine.machineId}
                                      </span>
                                      <div className="flex items-center gap-3 text-xs">
                                        <span className="text-green-600 dark:text-green-400">{formatCurrency(machine.moneyIn)}</span>
                                        <span className="text-red-600 dark:text-red-400">{formatCurrency(machine.moneyOut)}</span>
                                        <span className={`font-bold min-w-[60px] text-right ${machine.netRevenue >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                          {formatCurrency(machine.netRevenue)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Unmapped machines section if any */}
                    {unmapped.length > 0 && (
                      <div>
                        <button
                          onClick={() => toggleHubExpanded('_unmapped')}
                          className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${expandedHubs.has('_unmapped') ? 'rotate-180' : ''}`} />
                            <div className="text-left">
                              <span className="font-medium text-neutral-500 dark:text-neutral-400">
                                Other Machines
                              </span>
                              <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">
                                {unmapped.length} machines
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-green-600 dark:text-green-400">{formatCurrency(getHubStats(unmapped).moneyIn)}</span>
                            <span className="text-red-600 dark:text-red-400">{formatCurrency(getHubStats(unmapped).moneyOut)}</span>
                            <span className={`font-bold ${getHubStats(unmapped).netRevenue >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(getHubStats(unmapped).netRevenue)}
                            </span>
                          </div>
                        </button>

                        {expandedHubs.has('_unmapped') && (
                          <div className="bg-neutral-50/50 dark:bg-neutral-800/30 divide-y divide-neutral-100 dark:divide-neutral-800">
                            {unmapped.map((machine) => (
                              <div key={machine.machineId} className="px-4 py-2 pl-11">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                                    {machine.machineId}
                                  </span>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-green-600 dark:text-green-400">{formatCurrency(machine.moneyIn)}</span>
                                    <span className="text-red-600 dark:text-red-400">{formatCurrency(machine.moneyOut)}</span>
                                    <span className={`font-bold min-w-[60px] text-right ${machine.netRevenue >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                      {formatCurrency(machine.netRevenue)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Totals Card */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-neutral-900 dark:text-white">Total</span>
                  <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    {formatCurrency(netRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <span className="text-neutral-500 dark:text-neutral-400">In: <span className="text-green-600 dark:text-green-400 font-bold">{formatCurrency(activeStats?.moneyIn || 0)}</span></span>
                    <span className="text-neutral-500 dark:text-neutral-400">Out: <span className="text-red-600 dark:text-red-400 font-bold">{formatCurrency(activeStats?.moneyOut || 0)}</span></span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-neutral-500 dark:text-neutral-400">Platform: <span className="text-purple-600 dark:text-purple-400 font-bold">{formatCurrency(storeFee)}</span></span>
                    <span className="text-neutral-500 dark:text-neutral-400">Venue: <span className="text-blue-600 dark:text-blue-400 font-bold">{formatCurrency(venueShare)}</span></span>
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

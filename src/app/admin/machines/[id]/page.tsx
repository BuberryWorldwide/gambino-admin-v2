// src/app/admin/machines/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, DollarSign, TrendingUp, Ticket } from 'lucide-react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import InlineEditableName from '@/components/InlineEditableName';
import MachineQRModal from '@/components/MachineQRModal';
import { QrCode } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Machine {
  _id: string;
  machineId: string;
  name?: string;
  storeId: string;
  hubId?: string;
  status?: 'active' | 'inactive' | 'maintenance';
  muthaGooseNumber?: number;
  store?: {
    storeName: string;
    city: string;
    state: string;
  };
}

interface Event {
  _id: string;
  eventType: 'money_in' | 'money_out' | 'voucher_print';
  amount?: number;
  timestamp: string | Date;
  metadata?: {
    voucherNumber?: string;
    confidenceNumber?: string;
    serialNumber?: string;
  };
}

interface TodayStats {
  moneyIn: number;
  moneyOut: number;
  voucherCount: number;
  voucherTotal: number;
  net: number;
  margin: number;
}

interface WeeklyStat {
  date: string;
  moneyIn: number;
  moneyOut: number;
  net: number;
}

export default function MachineDetailPage() {
  const params = useParams();
  const machineId = params?.id as string;

  const [machine, setMachine] = useState<Machine | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [todayStats, setTodayStats] = useState<TodayStats>({
    moneyIn: 0,
    moneyOut: 0,
    voucherCount: 0,
    voucherTotal: 0,
    net: 0,
    margin: 0
  });
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    if (machineId) {
      loadMachineData();
    }
  }, [machineId]);

  const loadMachineData = async () => {
    try {
      setLoading(true);

      // Load machine info
      const machineRes = await api.get(`/api/machines/${machineId}`);
      setMachine(machineRes.data.machine);

      // Load events for this machine
      const eventsRes = await api.get(`/api/admin/events/${machineId}`, {
        params: { limit: 100 }
      });

      if (eventsRes.data.success) {
        setEvents(eventsRes.data.events || []);
        
        // Set today's stats from API response
        const apiStats = eventsRes.data.stats || {};
        const stats: TodayStats = {
          moneyIn: apiStats.moneyIn || 0,
          moneyOut: apiStats.moneyOut || 0,
          voucherCount: apiStats.voucherCount || 0,
          voucherTotal: apiStats.voucherTotal || 0,
          net: (apiStats.moneyIn || 0) - (apiStats.moneyOut || 0),
          margin: 0
        };
        
        // Calculate profit margin
        if (stats.moneyIn > 0) {
          stats.margin = (stats.net / stats.moneyIn) * 100;
        }
        
        setTodayStats(stats);

        // Calculate weekly stats (last 7 days)
        const weeklyData: WeeklyStat[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);

          const dayEvents = eventsRes.data.events.filter((e: Event) => {
            const eventDate = new Date(e.timestamp);
            return eventDate >= date && eventDate < nextDate;
          });

          let dayMoneyIn = 0;
          let dayMoneyOut = 0;

          dayEvents.forEach((e: Event) => {
            if (e.eventType === 'money_in') {
              dayMoneyIn += e.amount || 0;
            } else if (e.eventType === 'money_out' || e.eventType === 'voucher_print') {
              dayMoneyOut += e.amount || 0;
            }
          });

          weeklyData.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            moneyIn: dayMoneyIn,
            moneyOut: dayMoneyOut,
            net: dayMoneyIn - dayMoneyOut
          });
        }

        setWeeklyStats(weeklyData);
      }

    } catch (err) {
      console.error('Failed to load machine:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'money_in':
        return <Badge className="bg-green-500/20 text-green-400">Money IN</Badge>;
      case 'money_out':
        return <Badge className="bg-red-500/20 text-red-400">Money OUT</Badge>;
      case 'voucher_print':
        return <Badge className="bg-purple-500/20 text-purple-400">Voucher</Badge>;
      default:
        return <Badge>{eventType}</Badge>;
    }
  };

  if (loading) {
    return (
      <AdminLayout user={null}>
        <div className="p-6 flex items-center justify-center min-h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  if (!machine) {
    return (
      <AdminLayout user={null}>
        <div className="p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Machine Not Found</h1>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </div>
        </div>
      </AdminLayout>
    );
  }


  return (
    <AdminLayout user={null}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <div className="text-3xl font-bold">
              <InlineEditableName
                machineId={machine.machineId}
                mongoId={machine._id}
                currentName={machine.name}
                fallbackName={machine.machineId}
                onUpdate={loadMachineData}
              />
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {machine.machineId} • {machine.store?.storeName}
            </p>
          </div>
          <Button onClick={loadMachineData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Machine Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
            <Badge className="mt-2">{machine.status || 'active'}</Badge>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Hub</div>
            <div className="font-mono text-sm mt-2">{machine.hubId || 'Not assigned'}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Mutha Goose #</div>
            <div className="text-lg font-bold mt-2">
              {machine.muthaGooseNumber ? `MG${machine.muthaGooseNumber}` : '-'}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Location</div>
            <div className="text-sm mt-2">
              {machine.store?.city}, {machine.store?.state}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Machine Binding</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Generate QR code for player account binding
              </p>
            </div>
            <Button onClick={() => setShowQRModal(true)}>
              <QrCode className="w-4 h-4 mr-2" />
              View QR Code
            </Button>
          </div>
        </div>

        {/* Today's Stats */}
        <div>
          <h2 className="text-xl font-bold mb-4">Today&apos;s Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-500" />
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Money IN</div>
                  <div className="text-2xl font-bold">{formatCurrency(todayStats.moneyIn)}</div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-red-500" />
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Money OUT</div>
                  <div className="text-2xl font-bold">{formatCurrency(todayStats.moneyOut)}</div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-blue-500" />
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Net Revenue</div>
                  <div className={`text-2xl font-bold ${todayStats.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(todayStats.net)}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <Ticket className="w-8 h-8 text-purple-500" />
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Vouchers</div>
                  <div className="text-2xl font-bold">{todayStats.voucherCount}</div>
                  <div className="text-xs text-gray-500">{formatCurrency(todayStats.voucherTotal)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">7-Day Revenue Trend</h2>
          <div className="space-y-2">
            {weeklyStats.map((day, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-20 text-sm text-gray-600">{day.date}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 bg-green-500 rounded"
                      style={{ width: `${Math.max(10, (day.moneyIn / 1000) * 100)}px` }}
                    ></div>
                    <span className="text-sm font-medium">{formatCurrency(day.moneyIn)}</span>
                  </div>
                </div>
                <div className="w-32 text-right">
                  <span className={`font-bold ${day.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(day.net)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-bold">Recent Activity</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    No events recorded
                  </TableCell>
                </TableRow>
              ) : (
                events.slice(0, 50).map((event) => (
                  <TableRow key={event._id}>
                    <TableCell>{getEventBadge(event.eventType)}</TableCell>
                    <TableCell className="font-mono">
                      {event.amount ? formatCurrency(event.amount) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(event.timestamp)}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {event.eventType === 'voucher_print' && event.metadata?.voucherNumber && (
                        <span>Voucher #{event.metadata.voucherNumber}</span>
                      )}
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
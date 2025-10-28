// src/app/admin/hubs/[hubId]/page.tsx
'use client';

import { use, useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Settings,
  Copy,
  Eye,
  EyeOff,
  QrCode
} from 'lucide-react';
import api from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import MachineQRModal from '@/components/MachineQRModal';

interface Hub {
  hubId: string;
  name: string;
  isOnline: boolean;
  storeId: string;
  store?: {
    storeName?: string;
    city?: string;
    state?: string;
  };
  lastHeartbeat?: string | Date;
  machineToken?: string;
  serialConfig?: {
    port: string;
  };
  health?: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    serialConnected: boolean;
  };
  stats?: {
    totalEventsProcessed: number;
    totalEventsSynced: number;
    uptime: number;
  };
}

interface Machine {
  _id: string;
  machineId: string;
  hubMachineId: string;
  name?: string;
  isRegistered: boolean;
  totalMoneyIn?: number;
  totalMoneyOut?: number;
  totalRevenue?: number;
  lastSeen?: string | Date;
}

interface Event {
  _id: string;
  eventType: string;
  gamingMachineId: string;
  machineName?: string;
  amount?: number;
  timestamp: string | Date;
}

export default function HubDetailsPage({ params }: { params: Promise<{ hubId: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const { hubId } = unwrappedParams;
  
  const [hub, setHub] = useState<Hub | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedMachineForQR, setSelectedMachineForQR] = useState<Machine | null>(null);

  useEffect(() => {
    loadHubDetails();
    loadEvents();
  }, [hubId]);

  const loadHubDetails = async () => {
    try {
      setLoading(true);
      
      // Load hub info
      const hubRes = await api.get(`/api/admin/hubs/${hubId}`);
      setHub(hubRes.data.hub);
      
      // Load machines with revenue data
      const machinesRes = await api.get(`/api/admin/hubs/${hubId}/discovered-machines`);
      setMachines(machinesRes.data.machines || []);
      
    } catch (err) {
      console.error('Failed to load hub:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const eventsRes = await api.get(`/api/admin/hubs/${hubId}/events?limit=20`);
      setEvents(eventsRes.data.events || []);
    } catch (err) {
      console.log('Failed to load events');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadHubDetails(), loadEvents()]);
    setRefreshing(false);
  };

  const handleCopyToken = () => {
    if (hub?.machineToken) {
      navigator.clipboard.writeText(hub.machineToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading || !hub) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  // Calculate hub totals
  const hubTotals = machines.reduce((acc, m) => ({
    moneyIn: acc.moneyIn + (m.totalMoneyIn || 0),
    moneyOut: acc.moneyOut + (m.totalMoneyOut || 0),
    revenue: acc.revenue + (m.totalRevenue || 0)
  }), { moneyIn: 0, moneyOut: 0, revenue: 0 });

  const profitMargin = hubTotals.moneyIn > 0 
    ? ((hubTotals.revenue / hubTotals.moneyIn) * 100).toFixed(1)
    : '0';

  const isOnline = hub.isOnline && hub.lastHeartbeat && 
    (new Date().getTime() - new Date(hub.lastHeartbeat).getTime()) < 120000;

  const lastSeen = hub.lastHeartbeat 
    ? formatTimeAgo(new Date(hub.lastHeartbeat))
    : 'Never';

  return (
    <AdminLayout>
      <div className="space-y-4 pb-20">
        {/* Header - Sticky on mobile */}
        <div className="sticky top-16 z-40 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 -mx-4 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="h-9 w-9 p-0 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold truncate">{hub.name}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {hub.store?.storeName || 'No store assigned'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-9 w-9 p-0 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`rounded-lg border p-4 ${
          isOnline 
            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  isOnline ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
                }`}>
                  {isOnline ? 'Online' : 'Offline'}
                </p>
                <p className={`text-xs ${
                  isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  Last seen {lastSeen}
                </p>
              </div>
            </div>
            {hub.health?.serialConnected ? (
              <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-300">
                Serial Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300">
                Serial Disconnected
              </Badge>
            )}
          </div>
        </div>

        {/* Revenue Overview Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Money In</span>
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${hubTotals.moneyIn.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {machines.length} machines
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Money Out</span>
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${hubTotals.moneyOut.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Vouchers paid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Net Revenue</span>
                <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${hubTotals.revenue.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {profitMargin}% margin
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Events Synced</span>
                <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {hub.stats?.totalEventsSynced?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {hub.stats?.totalEventsProcessed?.toLocaleString() || 0} processed
              </p>
            </CardContent>
          </Card>
        </div>



        {/* Machines */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Machines ({machines.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={loadHubDetails}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {machines.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No machines discovered yet
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {machines.map((machine) => (
                  <div key={machine.machineId} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">
                            {machine.name || machine.machineId}
                          </p>
                          {machine.isRegistered ? (
                            <Badge variant="outline" className="text-xs border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-300">
                              Registered
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-gray-500/20 bg-gray-500/10 text-gray-700 dark:text-gray-300">
                              Unregistered
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">IN</p>
                            <p className="font-medium text-green-600 dark:text-green-400">
                              ${(machine.totalMoneyIn || 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">OUT</p>
                            <p className="font-medium text-red-600 dark:text-red-400">
                              ${(machine.totalMoneyOut || 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">NET</p>
                            <p className="font-medium text-blue-600 dark:text-blue-400">
                              ${(machine.totalRevenue || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {machine.totalMoneyIn && machine.totalMoneyIn > 0 && (
                          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                            <span className="text-gray-500 dark:text-gray-400">Profit Margin</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {((machine.totalRevenue || 0) / machine.totalMoneyIn * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => router.push(`/admin/machines/${machine._id}`)}
                        >
                          <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                        </Button>
                        {!machine.isRegistered && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setSelectedMachineForQR(machine)}
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Events */}
        {events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {events.slice(0, 10).map((event) => (
                  <div key={event._id} className="p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <EventIcon eventType={event.eventType} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {event.machineName || event.gamingMachineId}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatEventType(event.eventType)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {event.amount && (
                          <p className="font-medium">
                            ${event.amount.toFixed(2)}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimeAgo(new Date(event.timestamp))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Auth Token - Collapsible */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Auth Token</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </CardHeader>
          {showToken && hub.machineToken && (
            <CardContent>
              <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 font-mono text-xs break-all">
                {hub.machineToken}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyToken}
                className="w-full mt-3"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copied ? 'Copied!' : 'Copy Token'}
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Hub ID</span>
              <span className="font-mono font-medium">{hub.hubId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Store ID</span>
              <span className="font-mono font-medium">{hub.storeId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Serial Port</span>
              <span className="font-mono font-medium">{hub.serialConfig?.port || '/dev/ttyUSB0'}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={() => router.push(`/admin/hubs/${hubId}/config`)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Configuration
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* QR Modal */}
      {selectedMachineForQR && (
        <MachineQRModal
          machine={selectedMachineForQR}
          storeId={hub.storeId}
          onClose={() => setSelectedMachineForQR(null)}
        />
      )}
    </AdminLayout>
  );
}

// Helper Components
function EventIcon({ eventType }: { eventType: string }) {
  switch (eventType) {
    case 'money_in':
      return <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
        <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
      </div>;
    case 'money_out':
    case 'voucher_print':
      return <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
        <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
      </div>;
    default:
      return <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-900/30 flex items-center justify-center shrink-0">
        <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </div>;
  }
}

// Helper Functions
function formatEventType(type: string): string {
  const types: Record<string, string> = {
    money_in: 'Money In',
    money_out: 'Money Out',
    voucher_print: 'Voucher Printed',
    collect: 'Collection',
    session_start: 'Session Started',
    session_end: 'Session Ended'
  };
  return types[type] || type;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
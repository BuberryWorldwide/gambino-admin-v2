// src/app/admin/hubs/[hubId]/page.tsx
'use client';

import { use, useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Key, ArrowLeft, AlertCircle, CheckCircle, Copy, Activity, Settings, Cpu, HardDrive, Zap } from 'lucide-react';
import api from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from 'axios';
import MachineQRModal from '@/components/MachineQRModal';
import { QrCode } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface User {
  firstName?: string;
  lastName?: string;
  role?: string;
}

interface Store {
  storeName?: string;
  city?: string;
  state?: string;
}

interface Hub {
  hubId: string;
  name: string;
  isOnline: boolean;
  storeId: string;
  store?: Store;
  lastHeartbeat?: string | Date;
  machineToken?: string;
  status?: string;
  serialConfig?: {
    port: string;
    baudRate: number;
  };
  config?: {
    reportingInterval: number;
    syncInterval: number;
    debugMode: boolean;
  };
  stats?: {
    totalEventsProcessed: number;
    totalEventsSynced: number;
    uptime: number;
  };
  health?: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    serialConnected: boolean;
  };
}

interface Machine {
  _id: string;
  machineId: string;
  hubMachineId: string;
  name?: string;
  storeId: string;
  hubId?: string;
  isRegistered: boolean;
  totalDays?: number;
  totalMoneyIn?: number;
  totalMoneyOut?: number;
  totalRevenue?: number;
  lastSeen?: string | Date;
}

interface Event {
  _id: string;
  eventType: string;
  machineId: string;
  amount?: number;
  timestamp: string | Date;
  hubId: string;
}

export default function HubDetailsPage({ params }: { params: Promise<{ hubId: string }> }) {
  const unwrappedParams = use(params);
  const { hubId } = unwrappedParams;
  
  const [user, setUser] = useState<User | null>(null);
  const [hub, setHub] = useState<Hub | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [discoveredMachines, setDiscoveredMachines] = useState<Machine[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [regeneratingToken, setRegeneratingToken] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [machineToken, setMachineToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMachineForQR, setSelectedMachineForQR] = useState<Machine | null>(null);

  // Configuration editing
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    name: '',
    serialPort: '',
    reportingInterval: 30,
    syncInterval: 30,
    debugMode: false,
  });


  const loadHubDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const hubRes = await api.get(`/api/admin/hubs/${hubId}`);
      const hubData = hubRes.data.hub;
      setHub(hubData);
      setMachines(hubData.machines || []);
      setMachineToken(hubData.machineToken || null);
      
      if (hubData.config) {
        setConfigForm({
          name: hubData.name || '',
          serialPort: hubData.serialConfig?.port || '',
          reportingInterval: hubData.config.reportingInterval || 30,
          syncInterval: hubData.config.syncInterval || 30,
          debugMode: hubData.config.debugMode || false,
        });
      }
            
      const machinesRes = await api.get(`/api/admin/hubs/${hubId}/discovered-machines`);
      setDiscoveredMachines(machinesRes.data.machines || []);
    } catch (err) {
      console.error('Failed to load hub:', err);
      setError('Failed to load hub details');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadUser();
    loadHubDetails();
  }, [hubId]);

  const loadUser = async () => {
    try {
      const res = await api.get('/api/users/profile');
      setUser(res.data.user);
    } catch (err) {
      console.log('Failed to load user profile');
      setUser(null);
    }
  };


  const loadEvents = async () => {
    try {
      // This endpoint would need to be created in backend
      const eventsRes = await api.get(`/api/admin/hubs/${hubId}/events?limit=50`);
      setEvents(eventsRes.data.events || []);
    } catch (err) {
      console.log('Failed to load events');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHubDetails();
    setRefreshing(false);
  };

  const handleRegenerateToken = async () => {
    if (!confirm('Regenerate authentication token? The Pi will need to be updated with the new token.')) {
      return;
    }

    try {
      setRegeneratingToken(true);
      const res = await api.post(`/api/admin/hubs/${hubId}/regenerate-token`);
      
      const newToken = res.data.machineToken;
      setMachineToken(newToken);
      setShowToken(true);
      
      await loadHubDetails();
    } catch (err: unknown) {
      console.error('Failed to regenerate token:', err);
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.error || 'Failed to regenerate token');
      } else {
        alert('Failed to regenerate token');
      }
    } finally {
      setRegeneratingToken(false);
    }
  };

  const handleCopyToken = () => {
    if (machineToken) {
      navigator.clipboard.writeText(machineToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveConfig = async () => {
    try {
      await api.put(`/api/admin/hubs/${hubId}`, {
        name: configForm.name,
        serialConfig: {
          port: configForm.serialPort,
        },
        config: {
          reportingInterval: configForm.reportingInterval,
          syncInterval: configForm.syncInterval,
          debugMode: configForm.debugMode,
        },
      });
      setEditingConfig(false);
      await loadHubDetails();
      alert('Configuration saved successfully');
    } catch (err) {
      console.error('Failed to save config:', err);
      alert('Failed to save configuration');
    }
  };

  const formatLastSeen = (date: string | Date | undefined) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <AdminLayout user={user}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="animate-pulse space-y-4">
            <div key="skeleton-1" className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div key="skeleton-2" className="h-32 bg-gray-200 rounded"></div>
            <div key="skeleton-3" className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !hub) {
    return (
      <AdminLayout user={user}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-red-600 mb-2" />
            <p className="text-red-800">{error || 'Hub not found'}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout user={user}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Section - Mobile Optimized */}
        <div className="flex flex-col gap-4">
          {/* Back button + Hub name row */}
          <div className="flex items-center gap-3">
            <Button
              key="back-btn"
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/admin/hubs'}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div key="hub-name" className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">
                {hub.name}
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                {hub.hubId}
              </p>
            </div>
          </div>

          {/* Status badge + Actions - Stack on mobile */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            {/* Status Badge */}
            <div key="status-badge" className="flex items-center gap-2">
              {hub.isOnline ? (
                <>
                  <Wifi key="wifi-icon" className="w-5 h-5 text-green-500" />
                  <Badge key="online-badge" variant="default" className="bg-green-500">
                    Online
                  </Badge>
                </>
              ) : (
                <>
                  <WifiOff key="wifi-off-icon" className="w-5 h-5 text-red-500" />
                  <Badge key="offline-badge" variant="destructive">
                    Offline
                  </Badge>
                </>
              )}
              {hub.lastHeartbeat && (
                <span key="last-seen" className="text-xs text-muted-foreground hidden sm:inline">
                  Last seen: {formatLastSeen(hub.lastHeartbeat)}
                </span>
              )}
            </div>

            {/* Action Buttons - Stack on small screens */}
            <div key="action-buttons" className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
              <Button
                key="refresh"
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                key="regenerate"
                onClick={handleRegenerateToken}
                disabled={regeneratingToken}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                <Key className="w-4 h-4 mr-2" />
                {regeneratingToken ? 'Generating...' : 'Regenerate Token'}
              </Button>
            </div>
          </div>

          {/* Last seen on mobile */}
          {hub.lastHeartbeat && (
            <span className="text-xs text-muted-foreground sm:hidden">
              Last seen: {formatLastSeen(hub.lastHeartbeat)}
            </span>
          )}
        </div>

        {/* Stats Cards - Responsive grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card key="machines">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Machines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">
                {machines.length}
              </div>
            </CardContent>
          </Card>

          <Card key="eventsProcessed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Events Processed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">
                {hub.stats?.totalEventsProcessed?.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>

          <Card key="eventsSynced">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Events Synced
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">
                {hub.stats?.totalEventsSynced?.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>

          <Card key="uptime">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">
                {hub.stats?.uptime ? Math.floor(hub.stats.uptime / 3600) : '0'}h
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs - Scrollable on mobile */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="overview" className="whitespace-nowrap">Overview</TabsTrigger>
            <TabsTrigger value="machines" className="whitespace-nowrap">Machines</TabsTrigger>
            <TabsTrigger value="events" className="whitespace-nowrap">Events</TabsTrigger>
            <TabsTrigger value="health" className="whitespace-nowrap">Health</TabsTrigger>
            <TabsTrigger value="config" className="whitespace-nowrap">Config</TabsTrigger>
            <TabsTrigger value="logs" className="whitespace-nowrap">Logs</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card key="hub-info">
              <CardHeader>
                <CardTitle>Hub Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div key="store">
                    <p className="text-sm font-medium text-muted-foreground">Store</p>
                    <p className="text-base font-semibold">
                      {hub.store?.storeName || 'Unknown'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {hub.store?.city}, {hub.store?.state}
                    </p>
                  </div>
                  <div key="serial">
                    <p className="text-sm font-medium text-muted-foreground">Serial Port</p>
                    <p className="text-base font-mono">
                      {hub.serialConfig?.port || 'Not configured'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Machine Token Card */}
            <Card key="machine-token">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle key="title">Machine Token</CardTitle>
                  <Button
                    key="toggle-btn"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowToken(!showToken)}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    {showToken ? 'Hide' : 'Show'}
                  </Button>
                </div>
                <CardDescription>
                  Authentication token for Pi device
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    key="token-input"
                    value={showToken ? (machineToken || 'No token generated') : '••••••••••••••••••••'}
                    readOnly
                    className="font-mono text-xs flex-1"
                  />
                  <Button
                    key="copy-btn"
                    size="sm"
                    onClick={handleCopyToken}
                    disabled={!machineToken}
                    className="w-full sm:w-auto"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Machines Tab - MOBILE FIRST REDESIGN */}
          {/* Machines Tab */}
          <TabsContent value="machines">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Discovered Machines</CardTitle>
                    <CardDescription>
                      Machines reporting data through this hub
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : discoveredMachines.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No machines discovered yet</p>
                    <p className="text-sm mt-1">Machines will appear here once they start reporting</p>
                  </div>
                ) : (
                  <>
                    {/* MOBILE VIEW - Cards */}
                    <div className="md:hidden space-y-4">
                      {discoveredMachines.map((machine) => {
                        const uniqueKey = machine._id || machine.machineId || machine.hubMachineId;
                        return (
                        <Card key={uniqueKey} className="border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            {/* Header with name and status */}
                            <div key={`${uniqueKey}-header`} className="flex items-start justify-between mb-3">
                              <div key={`${uniqueKey}-title`}>
                                <h3 className="font-semibold text-base">{machine.name || machine.machineId}</h3>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                  {machine.hubMachineId}
                                </p>
                              </div>
                              {machine.isRegistered ? (
                                <Badge key={`${uniqueKey}-badge`} variant="default" className="gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Registered
                                </Badge>
                              ) : (
                                <Badge key={`${uniqueKey}-badge-unknown`} variant="secondary">Unknown</Badge>
                              )}
                            </div>

                            {/* Revenue Grid */}
                            <div key={`${uniqueKey}-revenue`} className="grid grid-cols-2 gap-2 mb-3">
                              <div key={`${uniqueKey}-days`} className="bg-muted/50 rounded-lg p-2">
                                <span className="text-xs text-muted-foreground block">Days Active</span>
                                <p className="font-semibold text-sm">
                                  {machine.totalDays || 0}
                                </p>
                              </div>
                              <div key={`${uniqueKey}-netrev`} className="bg-muted/50 rounded-lg p-2">
                                <span className="text-xs text-muted-foreground block">Net Revenue</span>
                                <p className="font-semibold text-sm">
                                  ${(machine.totalRevenue || 0).toLocaleString()}
                                </p>
                              </div>
                              <div key={`${uniqueKey}-moneyIn`} className="bg-muted/50 rounded-lg p-2">
                                <span className="text-xs text-muted-foreground block">Money In</span>
                                <p className="font-semibold text-sm">
                                  ${(machine.totalMoneyIn || 0).toLocaleString()}
                                </p>
                              </div>
                              <div key={`${uniqueKey}-moneyOut`} className="bg-muted/50 rounded-lg p-2">
                                <span className="text-xs text-muted-foreground block">Money Out</span>
                                <p className="font-semibold text-sm">
                                  ${(machine.totalMoneyOut || 0).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {/* Last Seen */}
                            <div key={`${uniqueKey}-lastseen`} className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                              <Activity className="w-3 h-3" />
                              <span>Last seen: {machine.lastSeen ? new Date(machine.lastSeen).toLocaleDateString() : 'N/A'}</span>
                            </div>

                            {/* Action Buttons */}
                            <div key={`${uniqueKey}-actions`} className="flex gap-2">
                              <Button
                                key={`${uniqueKey}-qr`}
                                variant="outline"
                                size="sm"
                                className="flex-1 min-h-[44px]"
                                onClick={() => setSelectedMachineForQR(machine)}
                              >
                                <QrCode className="w-4 h-4 mr-2" />
                                QR Code
                              </Button>
                              <Button
                                key={`${uniqueKey}-view`}
                                size="sm"
                                className="flex-1 min-h-[44px]"
                                onClick={() => window.location.href = `/admin/machines/${machine.machineId}`}
                              >
                                View Details →
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        );
                      })}
                    </div>

                    {/* DESKTOP VIEW - Table */}
                                        {/* DESKTOP VIEW - Table */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Machine ID</TableHead>
                            <TableHead>Hub</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Days Active</TableHead>
                            <TableHead className="text-right">Money In</TableHead>
                            <TableHead className="text-right">Money Out</TableHead>
                            <TableHead className="text-right">Net Revenue</TableHead>
                            <TableHead>Last Seen</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {discoveredMachines.map((machine) => {
                            const uniqueKey = machine._id || machine.machineId || machine.hubMachineId;
                            return (
                              <TableRow key={uniqueKey} className="hover:bg-muted/50">
                              {/* Machine ID - Name with hubMachineId subtitle */}
                              <TableCell>
                                <div className="font-semibold">{machine.name || machine.machineId}</div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {machine.hubMachineId}
                                </div>
                              </TableCell>
                              
                              {/* Hub - Which Pi this is connected to */}
                              <TableCell className="font-mono text-sm text-muted-foreground">
                                {hubId}
                              </TableCell>
                              
                              {/* Status Badge */}
                              <TableCell>
                                {machine.isRegistered ? (
                                  <Badge variant="default" className="gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Registered
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Discovered</Badge>
                                )}
                              </TableCell>
                              
                              {/* Days Active */}
                              <TableCell className="text-right">
                                {machine.totalDays || 0}
                              </TableCell>
                              
                              {/* Money In */}
                              <TableCell className="text-right font-mono text-green-600">
                                ${(machine.totalMoneyIn || 0).toLocaleString()}
                              </TableCell>
                              
                              {/* Money Out */}
                              <TableCell className="text-right font-mono text-red-600">
                                ${(machine.totalMoneyOut || 0).toLocaleString()}
                              </TableCell>
                              
                              {/* Net Revenue */}
                              <TableCell className="text-right font-mono font-semibold">
                                ${(machine.totalRevenue || 0).toLocaleString()}
                              </TableCell>
                              
                              {/* Last Seen */}
                              <TableCell className="text-sm text-muted-foreground">
                                {machine.lastSeen ? new Date(machine.lastSeen).toLocaleDateString() : 'N/A'}
                              </TableCell>
                              
                              {/* Actions */}
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedMachineForQR(machine)}
                                    title="Generate QR Code"
                                  >
                                    <QrCode className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.location.href = `/admin/machines/${machine._id}`}
                                  >
                                    View →
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab - Placeholder */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Recent Events</CardTitle>
                <CardDescription>
                  Real-time event stream from this hub (last 50 events)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Event streaming to be implemented</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Health Tab */}
          <TabsContent value="health" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card key="cpu">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {hub.health?.cpuUsage?.toFixed(1) || '0'}%
                  </div>
                </CardContent>
              </Card>

              <Card key="memory">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {hub.health?.memoryUsage?.toFixed(1) || '0'}%
                  </div>
                </CardContent>
              </Card>

              <Card key="disk">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {hub.health?.diskUsage?.toFixed(1) || '0'}%
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card key="system-status">
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div key="serial" className="flex items-center justify-between">
                  <span className="text-sm font-medium">Serial Connection</span>
                  <Badge variant={hub.health?.serialConnected ? 'default' : 'destructive'}>
                    {hub.health?.serialConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div key="uptime" className="flex items-center justify-between">
                  <span className="text-sm font-medium">Uptime</span>
                  <span className="text-sm text-muted-foreground">
                    {hub.stats?.uptime ? Math.floor(hub.stats.uptime / 3600) + ' hours' : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="config">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div key="title">
                    <CardTitle>Hub Configuration</CardTitle>
                    <CardDescription>Manage hub settings and behavior</CardDescription>
                  </div>
                  {!editingConfig && (
                    <Button key="edit-btn" onClick={() => setEditingConfig(true)} variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div key="name-field" className="grid gap-2">
                    <Label htmlFor="name">Hub Name</Label>
                    <Input
                      id="name"
                      value={configForm.name}
                      onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                      disabled={!editingConfig}
                    />
                  </div>

                  <div key="serial-field" className="grid gap-2">
                    <Label htmlFor="serialPort">Serial Port</Label>
                    <Input
                      id="serialPort"
                      value={configForm.serialPort}
                      onChange={(e) => setConfigForm({ ...configForm, serialPort: e.target.value })}
                      disabled={!editingConfig}
                      className="font-mono"
                    />
                  </div>

                  <div key="reporting-field" className="grid gap-2">
                    <Label htmlFor="reportingInterval">Reporting Interval (seconds)</Label>
                    <Input
                      id="reportingInterval"
                      type="number"
                      value={configForm.reportingInterval}
                      onChange={(e) => setConfigForm({ ...configForm, reportingInterval: parseInt(e.target.value) })}
                      disabled={!editingConfig}
                    />
                  </div>

                  <div key="sync-field" className="grid gap-2">
                    <Label htmlFor="syncInterval">Sync Interval (seconds)</Label>
                    <Input
                      id="syncInterval"
                      type="number"
                      value={configForm.syncInterval}
                      onChange={(e) => setConfigForm({ ...configForm, syncInterval: parseInt(e.target.value) })}
                      disabled={!editingConfig}
                    />
                  </div>

                  <div key="debug-field" className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="debugMode">Debug Mode</Label>
                      <p className="text-sm text-muted-foreground">Enable verbose logging</p>
                    </div>
                    <Switch
                      id="debugMode"
                      checked={configForm.debugMode}
                      onCheckedChange={(checked) => setConfigForm({ ...configForm, debugMode: checked })}
                      disabled={!editingConfig}
                    />
                  </div>
                </div>

                {editingConfig && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button key="save" onClick={handleSaveConfig} className="flex-1">
                      Save Changes
                    </Button>
                    <Button
                      key="cancel"
                      variant="outline"
                      onClick={() => {
                        setEditingConfig(false);
                        // Reset form
                        setConfigForm({
                          name: hub.name || '',
                          serialPort: hub.serialConfig?.port || '/dev/ttyUSB0',
                          reportingInterval: hub.config?.reportingInterval || 30,
                          syncInterval: hub.config?.syncInterval || 30,
                          debugMode: hub.config?.debugMode || false,
                        });
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab - Placeholder */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>System Logs</CardTitle>
                <CardDescription>
                  Recent logs from the Pi device
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Log viewing to be implemented</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
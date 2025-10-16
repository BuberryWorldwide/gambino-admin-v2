// src/app/admin/hubs/[hubId]/page.tsx
'use client';

import { use, useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Key, ArrowLeft, AlertCircle, CheckCircle, Copy, Activity, Settings, FileText, Cpu, HardDrive, Zap } from 'lucide-react';
import api from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  machineId: string;
  isRegistered: boolean;
  lastSeen?: string | Date;
  totalDays?: number;
  totalMoneyIn?: number;
  totalMoneyOut?: number;
  totalRevenue?: number;
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
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [regeneratingToken, setRegeneratingToken] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [machineToken, setMachineToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Configuration editing
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    name: '',
    serialPort: '',
    reportingInterval: 30,
    syncInterval: 30,
    debugMode: false,
  });

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

  const loadHubDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const hubRes = await api.get(`/api/admin/hubs/${hubId}`);
      const hubData = hubRes.data.hub;
      setHub(hubData);
      setMachineToken(hubData.machineToken || null);

      // Set config form values
      setConfigForm({
        name: hubData.name || '',
        serialPort: hubData.serialConfig?.port || '/dev/ttyUSB0',
        reportingInterval: hubData.config?.reportingInterval || 30,
        syncInterval: hubData.config?.syncInterval || 30,
        debugMode: hubData.config?.debugMode || false,
      });

      const machinesRes = await api.get(`/api/admin/hubs/${hubId}/discovered-machines`);
      setMachines(machinesRes.data.machines || []);

      // Load recent events
      await loadEvents();
    } catch (err: any) {
      console.error('Failed to load hub details:', err);
      setError(err.response?.data?.error || 'Failed to load hub details');
    } finally {
      setLoading(false);
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
    } catch (err: any) {
      console.error('Failed to regenerate token:', err);
      alert(err.response?.data?.error || 'Failed to regenerate token');
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
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update configuration');
    }
  };

  if (loading) {
    return (
      <AdminLayout user={user}>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 dark:text-gray-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading hub details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !hub) {
    return (
      <AdminLayout user={user}>
        <Card className="max-w-md mx-auto mt-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Error Loading Hub
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error || 'Hub not found'}</p>
            <div className="flex gap-3">
              <Button onClick={() => window.location.href = '/admin/hubs'} variant="outline" className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Hubs
              </Button>
              <Button onClick={loadHubDetails} className="flex-1">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const registeredMachines = machines.filter(m => m.isRegistered);
  const unknownMachines = machines.filter(m => !m.isRegistered);

  return (
    <AdminLayout user={user}>
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.href = '/admin/hubs'}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{hub.name}</h1>
              <p className="text-sm text-muted-foreground">{hubId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={hub.isOnline ? "default" : "secondary"} className="gap-1">
              {hub.isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {hub.isOnline ? 'Online' : 'Offline'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Store</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hub.store?.storeName || hub.storeId}</div>
              {hub.store?.city && hub.store?.state && (
                <p className="text-xs text-muted-foreground">
                  {hub.store.city}, {hub.store.state}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Machines</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{machines.length}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{registeredMachines.length} registered</span>
                {unknownMachines.length > 0 && (
                  <span className="text-amber-600 ml-2">{unknownMachines.length} unknown</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events Processed</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {hub.stats?.totalEventsProcessed?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                {hub.stats?.totalEventsSynced?.toLocaleString() || '0'} synced
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Seen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {hub.lastHeartbeat ? new Date(hub.lastHeartbeat).toLocaleTimeString() : 'Never'}
              </div>
              <p className="text-xs text-muted-foreground">
                {hub.lastHeartbeat ? new Date(hub.lastHeartbeat).toLocaleDateString() : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="machines">Machines ({machines.length})</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="health">Health & Monitoring</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Hub Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Hub Details</CardTitle>
                  <CardDescription>Basic information about this hub</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Hub ID</Label>
                    <Input value={hub.hubId} readOnly className="font-mono" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Name</Label>
                    <Input value={hub.name} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Store ID</Label>
                    <Input value={hub.storeId} readOnly className="font-mono" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Serial Port</Label>
                    <Input value={hub.serialConfig?.port || '/dev/ttyUSB0'} readOnly className="font-mono" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={hub.status === 'online' ? 'default' : 'secondary'}>
                      {hub.status || 'offline'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Authentication Token Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Authentication</CardTitle>
                  <CardDescription>Manage Pi authentication token</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowToken(!showToken)}
                      className="flex-1"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      {showToken ? 'Hide Token' : 'View Token'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRegenerateToken}
                      disabled={regeneratingToken}
                      className="flex-1"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      {regeneratingToken ? 'Regenerating...' : 'Regenerate'}
                    </Button>
                  </div>

                  {showToken && machineToken && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Machine Token</Label>
                        <div className="relative">
                          <Textarea
                            value={machineToken}
                            readOnly
                            className="font-mono text-xs resize-none"
                            rows={4}
                          />
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCopyToken}
                          className="w-full"
                        >
                          {copied ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Token
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h4 className="font-semibold text-sm mb-2">Pi Setup Instructions</h4>
                        <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
                          <li>SSH into your Raspberry Pi</li>
                          <li>Edit: <code className="bg-muted px-1 rounded">~/gambino-pi-app/.env</code></li>
                          <li>Update: <code className="bg-muted px-1 rounded">MACHINE_TOKEN=&lt;paste_token&gt;</code></li>
                          <li>Restart: <code className="bg-muted px-1 rounded">sudo systemctl restart gambino-pi</code></li>
                        </ol>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Machines Tab */}
          <TabsContent value="machines">
            <Card>
              <CardHeader>
                <CardTitle>Discovered Machines</CardTitle>
                <CardDescription>
                  Machines reporting data through this hub
                </CardDescription>
              </CardHeader>
              <CardContent>
                {machines.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No machines discovered yet</p>
                    <p className="text-sm mt-1">Machines will appear here once they start reporting</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Machine ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Days Active</TableHead>
                        <TableHead className="text-right">Money In</TableHead>
                        <TableHead className="text-right">Money Out</TableHead>
                        <TableHead className="text-right">Net Revenue</TableHead>
                        <TableHead>Last Seen</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {machines.map((machine) => (
                        <TableRow key={machine.machineId}>
                          <TableCell className="font-mono font-medium">
                            {machine.machineId}
                          </TableCell>
                          <TableCell>
                            {machine.isRegistered ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Registered
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Unknown</Badge>
                            )}
                          </TableCell>
                          <TableCell>{machine.totalDays || 0}</TableCell>
                          <TableCell className="text-right font-mono">
                            ${(machine.totalMoneyIn || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${(machine.totalMoneyOut || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            ${(machine.totalRevenue || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {machine.lastSeen ? new Date(machine.lastSeen).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.location.href = `/admin/machines/${machine.machineId}`}
                            >
                              View →
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
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
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
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

              <Card>
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

              <Card>
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

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Serial Connection</span>
                  <Badge variant={hub.health?.serialConnected ? 'default' : 'destructive'}>
                    {hub.health?.serialConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
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
                  <div>
                    <CardTitle>Hub Configuration</CardTitle>
                    <CardDescription>Manage hub settings and behavior</CardDescription>
                  </div>
                  {!editingConfig && (
                    <Button onClick={() => setEditingConfig(true)} variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Hub Name</Label>
                    <Input
                      id="name"
                      value={configForm.name}
                      onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                      disabled={!editingConfig}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="serialPort">Serial Port</Label>
                    <Input
                      id="serialPort"
                      value={configForm.serialPort}
                      onChange={(e) => setConfigForm({ ...configForm, serialPort: e.target.value })}
                      disabled={!editingConfig}
                      className="font-mono"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="reportingInterval">Reporting Interval (seconds)</Label>
                    <Input
                      id="reportingInterval"
                      type="number"
                      value={configForm.reportingInterval}
                      onChange={(e) => setConfigForm({ ...configForm, reportingInterval: parseInt(e.target.value) })}
                      disabled={!editingConfig}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="syncInterval">Sync Interval (seconds)</Label>
                    <Input
                      id="syncInterval"
                      type="number"
                      value={configForm.syncInterval}
                      onChange={(e) => setConfigForm({ ...configForm, syncInterval: parseInt(e.target.value) })}
                      disabled={!editingConfig}
                    />
                  </div>

                  <div className="flex items-center justify-between">
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
                  <div className="flex gap-3">
                    <Button onClick={handleSaveConfig} className="flex-1">
                      Save Changes
                    </Button>
                    <Button
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

          {/* Logs Tab */}
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
    </AdminLayout>
  );
}
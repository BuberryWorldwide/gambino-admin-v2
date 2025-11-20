// src/app/admin/logs/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Activity, AlertCircle, Info, AlertTriangle, CheckCircle2, Filter } from 'lucide-react';
import api from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Event {
  _id: string;
  eventType: string;
  gamingMachineId: string;
  hubMachineId: string;
  amount?: number;
  timestamp: string | Date;
  rawData?: string;
  metadata?: {
    source?: string;
    isDailyReport?: boolean;
  };
}

interface Hub {
  hubId: string;
  name: string;
  storeId: string;
  isOnline: boolean;
  lastHeartbeat?: string;
}

export default function LiveLogsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [selectedHub, setSelectedHub] = useState<string>('all');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadHubs();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [selectedHub, selectedEventType]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadEvents();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, selectedHub, selectedEventType]);

const loadHubs = async () => {
    try {
      const res = await api.get('/api/admin/hubs');
      setHubs(res.data.hubs || []);

      // Auto-select first hub if available
      if (res.data.hubs && res.data.hubs.length > 0) {
        setSelectedHub(res.data.hubs[0].hubId);
      } else {
        setSelectedHub('pi-2-nimbus-1'); // Fallback to hub
      }
    } catch (err) {
      console.error('Failed to load hubs:', err);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);

      // Always use hub-specific endpoint (no global events endpoint)
      const url = selectedHub && selectedHub !== 'all'
        ? `/api/admin/hubs/${selectedHub}/events?limit=100`
        : hubs.length > 0
          ? `/api/admin/hubs/${hubs[0].hubId}/events?limit=100`
          : null;

      if (!url) {
        setLoading(false);
        return;
      }

      const res = await api.get(url);
      let fetchedEvents = res.data.events || [];

      // Filter by event type if selected
      if (selectedEventType !== 'all') {
        fetchedEvents = fetchedEvents.filter((e: Event) => e.eventType === selectedEventType);
      }

      setEvents(fetchedEvents);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'money_in':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'money_out':
      case 'voucher_print':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getEventBadgeColor = (eventType: string) => {
    switch (eventType) {
      case 'money_in':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'money_out':
      case 'voucher_print':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const formatEventType = (type: string): string => {
    const types: Record<string, string> = {
      money_in: 'Money In',
      money_out: 'Money Out',
      voucher_print: 'Voucher Print',
      collect: 'Collection',
      session_start: 'Session Start',
      session_end: 'Session End',
      error: 'Error'
    };
    return types[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimeAgo = (date: Date | string): string => {
    const d = new Date(date);
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const eventTypes = ['all', 'money_in', 'money_out', 'voucher_print', 'error'];
  const selectedHubData = hubs.find(h => h.hubId === selectedHub);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-4 pb-20">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Live Event Logs</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Real-time monitoring of system events
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="flex-1 sm:flex-none"
            >
              <Activity className={`w-4 h-4 mr-2 ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`} />
              {autoRefresh ? 'Auto' : 'Manual'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadEvents}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Filters - Mobile Optimized */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium mb-2 block">Hub</label>
                <Select value={selectedHub} onValueChange={setSelectedHub}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hubs.map(hub => (
                      <SelectItem key={hub.hubId} value={hub.hubId} className="text-sm">
                        {hub.name} {hub.isOnline && '🟢'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium mb-2 block">Event Type</label>
                <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map(type => (
                      <SelectItem key={type} value={type} className="text-sm">
                        {type === 'all' ? 'All Events' : formatEventType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <label className="text-xs sm:text-sm font-medium mb-2 block">Status</label>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 pt-2">
                  {events.length} events • Updated {formatTimeAgo(lastRefresh)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hub Status - Mobile Optimized */}
        {selectedHub !== 'all' && selectedHubData && (
          <div className={`rounded-lg border p-3 sm:p-4 ${
            selectedHubData.isOnline
              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <Activity className={`w-4 h-4 sm:w-5 sm:h-5 ${
                selectedHubData.isOnline ? 'text-green-600' : 'text-red-600'
              }`} />
              <div>
                <p className="text-sm sm:text-base font-medium">
                  {selectedHubData.name} is {selectedHubData.isOnline ? 'Online' : 'Offline'}
                </p>
                {selectedHubData.lastHeartbeat && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Last seen {formatTimeAgo(selectedHubData.lastHeartbeat)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Events List - Mobile Optimized */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">Recent Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading && events.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 text-sm sm:text-base text-gray-500">
                No events found
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
                {events.map((event) => (
                  <div key={event._id} className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="mt-1 shrink-0">{getEventIcon(event.eventType)}</div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge className={`text-xs ${getEventBadgeColor(event.eventType)}`}>
                            {formatEventType(event.eventType)}
                          </Badge>

                          {event.metadata?.isDailyReport && (
                            <Badge variant="outline" className="text-xs">
                              Daily Report
                            </Badge>
                          )}

                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimeAgo(event.timestamp)}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                          <span className="font-medium font-mono break-all">{event.gamingMachineId}</span>
                          {event.amount && (
                            <span className="text-gray-600 dark:text-gray-400">
                              ${event.amount.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {event.rawData && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {event.rawData}
                          </p>
                        )}
                      </div>

                      <div className="text-right text-xs text-gray-500 dark:text-gray-400 shrink-0 hidden sm:block">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

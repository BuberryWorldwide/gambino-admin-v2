// src/app/admin/hubs/[hubId]/page.tsx
'use client';

import { use, useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';
import MachineQRModal from '@/components/MachineQRModal';
import {
  ArrowLeft,
  RefreshCw,
  Settings,
  Key,
  Wifi,
  WifiOff,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Server,
  Cpu,
  HardDrive,
  Cable,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  QrCode
} from 'lucide-react';

// TypeScript Interfaces
interface Hub {
  _id?: string;
  hubId: string;
  name: string;
  storeId: string;
  isOnline?: boolean;
  status?: string;
  lastHeartbeat?: string | Date;
  lastSeen?: string | Date;

  // Old token system (deprecated but still supported)
  machineToken?: string;
  tokenGeneratedAt?: string | Date;
  tokenExpiresAt?: string | Date;

  // New token system (current)
  accessToken?: string;
  accessTokenExpiresAt?: string | Date;
  refreshToken?: string;
  refreshTokenExpiresAt?: string | Date;
  lastTokenRefresh?: string | Date;
  tokenVersion?: number;
  tokenRefreshCount?: number;

  serialConfig?: {
    port: string;
    baudRate?: number;
  };
  health?: {
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
    serialConnected?: boolean;
    apiConnected?: boolean;
  };
  stats?: {
    totalEventsProcessed?: number;
    totalEventsSynced?: number;
    totalEventsQueued?: number;
    uptime?: number;
  };
  store?: {
    storeName?: string;
    city?: string;
    state?: string;
  };
}

interface Machine {
  _id: string;
  machineId: string;
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

interface NewToken {
  token: string;
  expiresAt: string | Date;
}

function StatusBadge({ status = 'offline', isDark }: { status?: string; isDark: boolean }) {
  const s = (status || 'offline').toLowerCase();

  const styles = {
    online: isDark
      ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
      : 'border-emerald-600/40 text-emerald-700 bg-emerald-50',
    offline: isDark
      ? 'border-red-500/30 text-red-400 bg-red-500/10'
      : 'border-red-600/40 text-red-700 bg-red-50',
    restarting: isDark
      ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
      : 'border-yellow-600/40 text-yellow-700 bg-yellow-50',
    maintenance: isDark
      ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
      : 'border-amber-600/40 text-amber-700 bg-amber-50'
  };

  const dotStyles = {
    online: isDark ? 'bg-emerald-400' : 'bg-emerald-600',
    offline: isDark ? 'bg-red-400' : 'bg-red-600',
    restarting: isDark ? 'bg-yellow-400 animate-pulse' : 'bg-yellow-600 animate-pulse',
    maintenance: isDark ? 'bg-amber-400' : 'bg-amber-600'
  };

  const cls = styles[s as keyof typeof styles] || styles.offline;
  const dotCls = dotStyles[s as keyof typeof dotStyles] || dotStyles.offline;

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${cls} transition-colors`}>
      <span className={`h-2 w-2 rounded-full ${dotCls}`} />
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

// Edit Hub Modal
function EditHubModal({ isOpen, onClose, hub, onUpdate, isDark }: {
  isOpen: boolean;
  onClose: () => void;
  hub: Hub | null;
  onUpdate?: () => void;
  isDark: boolean;
}) {
  const [formData, setFormData] = useState<{ name: string; serialPort: string }>({
    name: '',
    serialPort: '/dev/ttyUSB0'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hub) {
      setFormData({
        name: hub.name || '',
        serialPort: hub.serialConfig?.port || '/dev/ttyUSB0'
      });
    }
  }, [hub]);

  const handleSave = async () => {
    if (!hub?.hubId) return;

    setSaving(true);
    try {
      const response = await api.put(`/api/admin/hubs/${hub.hubId}`, {
        name: formData.name,
        serialPort: formData.serialPort
      });

      if (response.data.success) {
        if (onUpdate) onUpdate();
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to update hub:', error);
      alert('Failed to update hub: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !hub) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl p-8 max-w-3xl w-full border max-h-[90vh] overflow-y-auto ${
        isDark
          ? 'bg-neutral-900 border-neutral-800'
          : 'bg-white border-neutral-200'
      }`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              Edit Hub Configuration
            </h2>
            <p className={`mt-1 font-mono text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              {hub.hubId}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`transition-colors ${isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`rounded-lg p-4 ${isDark ? 'bg-neutral-950/50' : 'bg-neutral-50'}`}>
            <label className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
              Hub ID
            </label>
            <div className={`font-mono mt-1 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              {hub.hubId}
            </div>
          </div>

          <div className={`rounded-lg p-4 ${isDark ? 'bg-neutral-950/50' : 'bg-neutral-50'}`}>
            <label className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
              Store ID
            </label>
            <div className={`font-mono mt-1 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              {hub.storeId}
            </div>
          </div>

          <div className={`rounded-lg p-4 col-span-2 ${isDark ? 'bg-neutral-950/50' : 'bg-neutral-50'}`}>
            <label className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
              Hub Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className={`w-full rounded-lg px-3 py-2 mt-2 border focus:outline-none focus:ring-2 transition-all ${
                isDark
                  ? 'bg-neutral-800 border-neutral-700 text-white focus:ring-yellow-500/30'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:ring-yellow-600/30'
              }`}
              placeholder="Casino 1 - Floor 2"
            />
          </div>

          <div className={`rounded-lg p-4 col-span-2 ${isDark ? 'bg-neutral-950/50' : 'bg-neutral-50'}`}>
            <label className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
              Serial Port
            </label>
            <select
              value={formData.serialPort}
              onChange={(e) => setFormData({...formData, serialPort: e.target.value})}
              className={`w-full rounded-lg px-3 py-2 mt-2 border focus:outline-none focus:ring-2 transition-all ${
                isDark
                  ? 'bg-neutral-800 border-neutral-700 text-white focus:ring-yellow-500/30'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:ring-yellow-600/30'
              }`}
            >
              <option value="/dev/ttyUSB0">/dev/ttyUSB0</option>
              <option value="/dev/ttyUSB1">/dev/ttyUSB1</option>
              <option value="/dev/ttyACM0">/dev/ttyACM0</option>
              <option value="/dev/ttyACM1">/dev/ttyACM1</option>
            </select>
            <p className={`text-xs mt-2 ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
              Common USB serial device paths
            </p>
          </div>
        </div>

        <div className={`flex items-center justify-between pt-6 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
          <button
            onClick={() => {
              onClose();
              setFormData({ name: hub.name || '', serialPort: hub.serialConfig?.port || '/dev/ttyUSB0' });
            }}
            className={`px-6 py-2.5 font-medium rounded-lg transition-colors ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-2.5 font-medium rounded-lg transition-colors flex items-center gap-2 ${
              isDark
                ? 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-600/50 text-black'
                : 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-700/50 text-white'
            }`}
          >
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Token Modal Component
function TokenModal({ isOpen, onClose, hub, onRefresh, isDark }: {
  isOpen: boolean;
  onClose: () => void;
  hub: Hub | null;
  onRefresh?: () => void;
  isDark: boolean;
}) {
  const [generatingToken, setGeneratingToken] = useState(false);
  const [newToken, setNewToken] = useState<NewToken | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  useEffect(() => {
    if (isOpen && hub) {
      console.log('🔑 TokenModal opened with hub:', {
        hubId: hub.hubId,
        name: hub.name,
        hasToken: !!hub.machineToken,
        tokenLength: hub.machineToken?.length || 0
      });
    }
  }, [isOpen, hub]);

  const handleGenerateToken = async () => {
    if (!hub?.hubId) {
      console.error('❌ No hubId available:', hub);
      alert('Error: Hub ID not found');
      return;
    }

    console.log('🔑 Generating token for hub:', hub.hubId);

    try {
      setGeneratingToken(true);
      console.log('🔑 Calling API: POST /api/admin/hubs/' + hub.hubId + '/regenerate-token');

      const res = await api.post(`/api/admin/hubs/${hub.hubId}/regenerate-token`);

      console.log('🔑 Token generation response:', res.data);

      setNewToken({
        token: res.data.machineToken,
        expiresAt: res.data.expiresAt
      });

      console.log('✅ Token set, refreshing hub data...');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('❌ Failed to generate token:', err);
      console.error('❌ Error response:', err.response?.data);
      alert('Failed to generate token: ' + (err.response?.data?.error || err.message));
    } finally {
      setGeneratingToken(false);
    }
  };

  const copyToken = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Copy failed:', err);
      }
      document.body.removeChild(textArea);
    }
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const getEnvBlock = () => {
    if (!hub) return '';
    const token = newToken ? newToken.token : (hub.accessToken || hub.machineToken);

    return `# Gambino Pi Configuration
MACHINE_ID=${hub.hubId}
STORE_ID=${hub.storeId}
API_ENDPOINT=https://api.gambino.gold

# Authentication
MACHINE_TOKEN=${token}

# Hardware Configuration
SERIAL_PORT=${hub.serialConfig?.port || '/dev/ttyUSB0'}

# Application Settings
LOG_LEVEL=info
NODE_ENV=production`;
  };

  if (!isOpen || !hub) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl p-8 max-w-3xl w-full border max-h-[90vh] overflow-y-auto ${
        isDark
          ? 'bg-neutral-900 border-neutral-800'
          : 'bg-white border-neutral-200'
      }`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              Authentication Token Management
            </h2>
            <p className={`mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              View and manage your hub's authentication token
            </p>
          </div>
          <button
            onClick={onClose}
            className={`transition-colors ${isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
          >
            ✕
          </button>
        </div>

        {/* Current Token Display */}
        {(hub.machineToken || hub.accessToken) && !newToken && (
          <div className={`rounded-lg p-4 mb-6 ${isDark ? 'bg-neutral-950/50' : 'bg-neutral-50'}`}>
            <div className="flex justify-between items-center mb-3">
              <label className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                {hub.accessToken ? 'Access Token' : 'Machine Token'}
                {hub.tokenVersion && ` (v${hub.tokenVersion})`}
              </label>
              {(hub.accessTokenExpiresAt || hub.tokenExpiresAt) && (
                <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Expires: {new Date((hub.accessTokenExpiresAt || hub.tokenExpiresAt) as string | Date).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className={`rounded p-3 mb-3 ${isDark ? 'bg-neutral-900' : 'bg-white border border-neutral-200'}`}>
              <textarea
                value={hub.accessToken || hub.machineToken}
                readOnly
                className={`w-full bg-transparent font-mono text-sm resize-none border-none focus:outline-none ${
                  isDark ? 'text-white' : 'text-neutral-900'
                }`}
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToken(hub.accessToken || hub.machineToken || '')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  tokenCopied
                    ? 'bg-green-600 text-white'
                    : isDark
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {tokenCopied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    Copy Token
                  </>
                )}
              </button>
              <button
                onClick={() => hub && copyToken(getEnvBlock())}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900'
                }`}
              >
                Copy Full .env
              </button>
            </div>

            {/* Show refresh token if available */}
            {hub.refreshToken && (
              <div className={`mt-4 pt-4 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
                <label className={`text-xs uppercase tracking-wider font-medium block mb-2 ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                  Refresh Token
                </label>
                <div className={`rounded p-3 ${isDark ? 'bg-neutral-900' : 'bg-white border border-neutral-200'}`}>
                  <input
                    type="text"
                    value={hub.refreshToken}
                    readOnly
                    className={`w-full bg-transparent font-mono text-xs border-none focus:outline-none ${
                      isDark ? 'text-white' : 'text-neutral-900'
                    }`}
                  />
                </div>
                <p className={`text-xs mt-2 ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                  Last refresh: {hub.lastTokenRefresh ? new Date(hub.lastTokenRefresh).toLocaleString() : 'Never'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* New Token Display */}
        {newToken && (
          <div className={`rounded-lg p-4 mb-6 border ${
            isDark
              ? 'bg-purple-900/20 border-purple-500/30'
              : 'bg-purple-50 border-purple-200'
          }`}>
            <div className="flex justify-between items-start mb-3">
              <h3 className={`font-semibold ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
                New Token Generated!
              </h3>
              <button
                onClick={() => setNewToken(null)}
                className={isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-900'}
              >
                ✕
              </button>
            </div>
            <div className={`rounded p-3 mb-3 ${isDark ? 'bg-neutral-950/50' : 'bg-white border border-neutral-200'}`}>
              <textarea
                value={newToken.token}
                readOnly
                className={`w-full bg-transparent font-mono text-sm resize-none border-none focus:outline-none ${
                  isDark ? 'text-white' : 'text-neutral-900'
                }`}
                rows={4}
              />
            </div>
            <div className={`rounded p-3 mb-3 ${isDark ? 'bg-neutral-950/50' : 'bg-white border border-neutral-200'}`}>
              <pre className={`text-xs overflow-x-auto ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                {getEnvBlock()}
              </pre>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                Copy configuration to your Pi and restart service
              </span>
              <button
                onClick={() => copyToken(getEnvBlock())}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  tokenCopied
                    ? 'bg-green-600 text-white'
                    : isDark
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {tokenCopied ? 'Copied!' : 'Copy .env Block'}
              </button>
            </div>

            {/* Setup Instructions */}
            <div className={`mt-4 rounded-lg p-4 border ${
              isDark
                ? 'bg-amber-900/20 border-amber-500/30'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                <AlertTriangle className="w-4 h-4" />
                Update Your Pi Now
              </h4>
              <ol className={`list-decimal list-inside space-y-1 text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-700'}`}>
                <li>SSH into your Pi: <code className={`px-1 rounded ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}>ssh gambino@your-pi-ip</code></li>
                <li>Edit .env: <code className={`px-1 rounded ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}>nano ~/gambino-pi-app/.env</code></li>
                <li>Update MACHINE_TOKEN with the new value</li>
                <li>Restart: <code className={`px-1 rounded ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}>sudo systemctl restart gambino-pi</code></li>
                <li>Verify: <code className={`px-1 rounded ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}>sudo systemctl status gambino-pi</code></li>
              </ol>
            </div>
          </div>
        )}

        {/* Generate New Token Button */}
        {!newToken && (
          <div className="space-y-4">
            <div className={`rounded-lg p-4 border ${
              isDark
                ? 'bg-blue-900/20 border-blue-500/30'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <h4 className={`font-semibold mb-2 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                ℹ Generate New Token
              </h4>
              <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-700'}`}>
                Generating a new token will invalidate the current token immediately.
                Make sure to update your Pi's .env file right away to maintain connectivity.
              </p>
            </div>
            <button
              onClick={() => {
                console.log('🔑 Generate Token button clicked!');
                handleGenerateToken();
              }}
              disabled={generatingToken}
              className={`w-full px-4 py-3 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                isDark
                  ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-700/50 text-white'
              }`}
            >
              {generatingToken ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating New Token...
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  Generate New Token
                </>
              )}
            </button>
          </div>
        )}

        <div className={`flex justify-end pt-6 border-t mt-6 ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
          <button
            onClick={onClose}
            className={`px-6 py-2.5 font-medium rounded-lg transition-colors ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Page Component
export default function HubDetailsPage({ params }: { params: Promise<{ hubId: string }> }) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  // State for resolved hubId
  const [hubId, setHubId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Use resolvedTheme only after mounted to avoid hydration mismatch
  const isDark = mounted ? (resolvedTheme === 'dark') : false;
  const [hub, setHub] = useState<Hub | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedMachineForQR, setSelectedMachineForQR] = useState<Machine | null>(null);

  // Restart states
  const [restarting, setRestarting] = useState(false);
  const [restartMessage, setRestartMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Resolve params on mount
  useEffect(() => {
    setMounted(true);
    params.then((resolvedParams) => {
      console.log('🔍 Params resolved:', resolvedParams);
      setHubId(resolvedParams.hubId);
    });
  }, [params]);

  const fetchHub = useCallback(async () => {
    if (!hubId) {
      console.error('❌ hubId is undefined, cannot fetch hub data');
      return;
    }

    try {
      setLoading(true);
      setErr('');

      console.log('🔍 Fetching hub with ID:', hubId);

      const hubRes = await api.get(`/api/admin/hubs/${hubId}`);
      console.log('🔍 Hub API Response:', hubRes.data);
      console.log('🔑 machineToken present?', !!hubRes.data.hub?.machineToken);
      console.log('🔑 machineToken value:', hubRes.data.hub?.machineToken ? 'EXISTS (hidden)' : 'MISSING');
      setHub(hubRes.data.hub);

      const machinesRes = await api.get(`/api/admin/hubs/${hubId}/discovered-machines`);
      setMachines(machinesRes.data.machines || []);

      const eventsRes = await api.get(`/api/admin/hubs/${hubId}/events?limit=20`);
      setEvents(eventsRes.data.events || []);

    } catch (error: any) {
      console.error('Failed to load hub:', error);
      setErr(error?.response?.data?.error || 'Failed to load hub');
    } finally {
      setLoading(false);
    }
  }, [hubId]);

  useEffect(() => {
    console.log('🔍 useEffect triggered, hubId:', hubId);
    if (hubId) {
      fetchHub();
    }
  }, [hubId, fetchHub]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchHub();
    setRefreshing(false);
  };

  const handleRestartHub = async () => {
    if (!hub?.hubId) return;

    const confirmed = window.confirm(
      `Are you sure you want to restart the Gambino service on ${hub.name || hub.hubId}?\n\n` +
      'The service will be offline for approximately 30 seconds while it restarts.'
    );

    if (!confirmed) return;

    try {
      setRestarting(true);
      setRestartMessage(null);

      console.log('🔄 Initiating service restart:', hub.hubId);

      const response = await api.post(`/api/admin/hubs/${hub.hubId}/restart`);

      console.log('✅ Restart response:', response.data);

      setRestartMessage({
        type: 'success',
        text: response.data.message || `Service restart initiated for ${hub.name || hub.hubId}`
      });

      // Auto-refresh after 5 seconds
      setTimeout(() => {
        handleRefresh();
      }, 5000);

      // Clear message after 15 seconds
      setTimeout(() => {
        setRestartMessage(null);
      }, 15000);

    } catch (error: any) {
      console.error('❌ Failed to restart service:', error);
      setRestartMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to restart service'
      });

      // Clear error after 10 seconds
      setTimeout(() => {
        setRestartMessage(null);
      }, 10000);
    } finally {
      // Keep restarting state for 30 seconds
      setTimeout(() => {
        setRestarting(false);
      }, 30000);
    }
  };

  // Memoized calculations
  const hubTotals = useMemo(() =>
    machines.reduce((acc, m) => ({
      moneyIn: acc.moneyIn + (m.totalMoneyIn || 0),
      moneyOut: acc.moneyOut + (m.totalMoneyOut || 0),
      revenue: acc.revenue + (m.totalRevenue || 0)
    }), { moneyIn: 0, moneyOut: 0, revenue: 0 }),
    [machines]
  );

  const profitMargin = useMemo(() =>
    hubTotals.moneyIn > 0
      ? ((hubTotals.revenue / hubTotals.moneyIn) * 100).toFixed(1)
      : '0',
    [hubTotals]
  );

  const isOnline = useMemo(() =>
    hub?.isOnline && hub.lastHeartbeat &&
    (new Date().getTime() - new Date(hub.lastHeartbeat).getTime()) < 120000,
    [hub?.isOnline, hub?.lastHeartbeat]
  );

  const lastSeen = useMemo(() => {
    if (!hub?.lastHeartbeat) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(hub.lastHeartbeat).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }, [hub?.lastHeartbeat]);

  const tokenExpiresSoon = useMemo(() => {
    if (!hub?.tokenExpiresAt) return false;
    const daysUntilExpiry = Math.floor(
      (new Date(hub.tokenExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry < 30;
  }, [hub?.tokenExpiresAt]);

  if (!mounted || loading || !hub || !hubId) {
    return (
      <AdminLayout>
        <div className={`min-h-screen transition-colors duration-300 ${
          isDark
            ? 'bg-black'
            : 'bg-neutral-50'
        }`}>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <RefreshCw className={`w-12 h-12 animate-spin mx-auto mb-4 ${
                isDark ? 'text-yellow-400' : 'text-yellow-600'
              }`} />
              <div className={`text-xl font-medium ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                {!hubId ? 'Loading parameters...' : 'Loading hub details...'}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={`transition-colors duration-300 ${
        isDark
          ? 'bg-transparent'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto">
          {/* Header - Mobile Optimized */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <button
                onClick={() => router.push('/admin/hubs')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all shrink-0 ${
                  isDark
                    ? 'bg-neutral-800/50 hover:bg-neutral-700/50 border-neutral-700 text-white'
                    : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-900'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  {hub.name || 'Hub Details'}
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                  <StatusBadge status={restarting ? 'restarting' : (isOnline ? 'online' : 'offline')} isDark={isDark} />
                  <span className={`text-xs sm:text-sm font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    ID: {hub.hubId}
                  </span>
                  <span className={`text-xs sm:text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    {lastSeen}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions - Mobile Optimized */}
            <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 lg:gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${
                  isDark
                    ? 'bg-neutral-800/80 hover:bg-neutral-700 disabled:bg-neutral-800 text-white border border-neutral-700'
                    : 'bg-white hover:bg-neutral-50 disabled:bg-neutral-100 text-neutral-900 border border-neutral-200'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>

              <button
                onClick={handleRestartHub}
                disabled={restarting || !isOnline}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
                  restarting
                    ? isDark
                      ? 'bg-yellow-600/50 text-yellow-200 cursor-wait'
                      : 'bg-yellow-500/50 text-yellow-700 cursor-wait'
                    : !isOnline
                    ? isDark
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    : isDark
                      ? 'bg-yellow-600/80 hover:bg-yellow-600 text-white'
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                }`}
                title={!isOnline ? 'Hub must be online to restart' : 'Restart Gambino service'}
              >
                <RefreshCw className={`w-4 h-4 ${restarting ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{restarting ? 'Restarting...' : 'Restart'}</span>
              </button>

              <button
                onClick={() => setShowEditModal(true)}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
                  isDark
                    ? 'bg-blue-600/80 hover:bg-blue-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>

              <button
                onClick={() => setShowTokenModal(true)}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
                  isDark
                    ? 'bg-purple-600/80 hover:bg-purple-600 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                <Key className="w-4 h-4" />
                <span className="hidden sm:inline">Token</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {err && (
            <div className={`mb-6 rounded-xl p-4 border ${
              isDark
                ? 'bg-red-900/30 border-red-500/30'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center">
                <XCircle className={`w-5 h-5 mr-3 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                <p className={`font-medium ${isDark ? 'text-red-200' : 'text-red-700'}`}>
                  {err}
                </p>
              </div>
            </div>
          )}

          {/* Restart Notification */}
          {restartMessage && (
            <div className={`mb-6 rounded-xl p-4 border ${
              restartMessage.type === 'success'
                ? isDark
                  ? 'bg-green-900/30 border-green-500/30'
                  : 'bg-green-50 border-green-200'
                : isDark
                  ? 'bg-red-900/30 border-red-500/30'
                  : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {restartMessage.type === 'success' ? (
                    <CheckCircle2 className={`w-5 h-5 mr-3 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  ) : (
                    <XCircle className={`w-5 h-5 mr-3 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                  )}
                  <div>
                    <p className={`font-medium ${
                      restartMessage.type === 'success'
                        ? isDark ? 'text-green-200' : 'text-green-700'
                        : isDark ? 'text-red-200' : 'text-red-700'
                    }`}>
                      {restartMessage.text}
                    </p>
                    {restartMessage.type === 'success' && (
                      <p className={`text-sm mt-1 ${isDark ? 'text-green-300' : 'text-green-600'}`}>
                        The service will be back online in approximately 30 seconds. Page will auto-refresh.
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setRestartMessage(null)}
                  className={isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-900'}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Token Expiry Warning */}
          {tokenExpiresSoon && (
            <div className={`mb-6 rounded-xl p-4 border ${
              isDark
                ? 'bg-amber-900/30 border-amber-500/30'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center">
                <AlertTriangle className={`w-5 h-5 mr-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <div>
                  <p className={`font-medium ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
                    Token Expiring Soon
                  </p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                    Your hub token will expire on {hub.tokenExpiresAt && new Date(hub.tokenExpiresAt).toLocaleDateString()}.
                    Generate a new token to maintain connectivity.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Revenue Overview Cards - Mobile Optimized */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            {/* Money In */}
            <div className={`rounded-2xl p-4 sm:p-6 border transition-all ${
              isDark
                ? 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                : 'bg-white border-neutral-200 hover:border-neutral-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs sm:text-sm font-medium ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Money In
                </span>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
                  isDark ? 'bg-green-500/10' : 'bg-green-50'
                }`}>
                  <TrendingUp className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                </div>
              </div>
              <div className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                ${hubTotals.moneyIn.toLocaleString()}
              </div>
              <div className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                {machines.length} machines
              </div>
            </div>

            {/* Money Out */}
            <div className={`rounded-2xl p-4 sm:p-6 border transition-all ${
              isDark
                ? 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                : 'bg-white border-neutral-200 hover:border-neutral-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs sm:text-sm font-medium ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Money Out
                </span>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
                  isDark ? 'bg-red-500/10' : 'bg-red-50'
                }`}>
                  <TrendingDown className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                </div>
              </div>
              <div className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                ${hubTotals.moneyOut.toLocaleString()}
              </div>
              <div className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                Vouchers paid
              </div>
            </div>

            {/* Net Revenue */}
            <div className={`rounded-2xl p-4 sm:p-6 border transition-all ${
              isDark
                ? 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                : 'bg-white border-neutral-200 hover:border-neutral-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs sm:text-sm font-medium ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Net Revenue
                </span>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
                  isDark ? 'bg-blue-500/10' : 'bg-blue-50'
                }`}>
                  <DollarSign className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
              </div>
              <div className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                ${hubTotals.revenue.toLocaleString()}
              </div>
              <div className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                {profitMargin}% margin
              </div>
            </div>

            {/* Events Synced */}
            <div className={`rounded-2xl p-4 sm:p-6 border transition-all ${
              isDark
                ? 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                : 'bg-white border-neutral-200 hover:border-neutral-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs sm:text-sm font-medium ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Events Synced
                </span>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
                  isDark ? 'bg-purple-500/10' : 'bg-purple-50'
                }`}>
                  <Activity className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
              </div>
              <div className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                {hub.stats?.totalEventsSynced?.toLocaleString() || 0}
              </div>
              <div className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                {hub.stats?.totalEventsProcessed?.toLocaleString() || 0} processed
              </div>
            </div>
          </div>

          {/* System Info - Mobile Optimized */}
          <div className={`rounded-2xl p-4 sm:p-6 border mb-6 sm:mb-8 ${
            isDark
              ? 'bg-neutral-900/50 border-neutral-800'
              : 'bg-white border-neutral-200'
          }`}>
            <h2 className={`text-lg sm:text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              System Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className={`text-sm font-medium ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                  Hub ID
                </span>
                <div className={`font-mono mt-1 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  {hub.hubId}
                </div>
              </div>
              <div>
                <span className={`text-sm font-medium ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                  Store ID
                </span>
                <div className={`font-mono mt-1 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  {hub.storeId}
                </div>
              </div>
              <div>
                <span className={`text-sm font-medium ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                  Serial Port
                </span>
                <div className={`font-mono mt-1 flex items-center gap-2 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  <Cable className="w-4 h-4" />
                  {hub.serialConfig?.port || '/dev/ttyUSB0'}
                </div>
              </div>
              <div>
                <span className={`text-sm font-medium ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                  Serial Status
                </span>
                <div className="mt-1">
                  <StatusBadge
                    status={hub.health?.serialConnected ? 'online' : 'offline'}
                    isDark={isDark}
                  />
                </div>
              </div>
              {hub.tokenGeneratedAt && (
                <div>
                  <span className={`text-sm font-medium ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                    Token Generated
                  </span>
                  <div className={`mt-1 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    {new Date(hub.tokenGeneratedAt).toLocaleDateString()}
                  </div>
                </div>
              )}
              {hub.tokenExpiresAt && (
                <div>
                  <span className={`text-sm font-medium ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                    Token Expires
                  </span>
                  <div className={`mt-1 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    {new Date(hub.tokenExpiresAt).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Machines */}
          <div className={`rounded-2xl p-6 border mb-8 ${
            isDark
              ? 'bg-neutral-900/50 border-neutral-800'
              : 'bg-white border-neutral-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                Machines ({machines.length})
              </h2>
              <Server className={`w-5 h-5 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`} />
            </div>
            {machines.length === 0 ? (
              <div className={`text-center py-8 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                No machines discovered yet
              </div>
            ) : (
              <div className="space-y-3">
                {machines.map((machine) => (
                  <div
                    key={machine.machineId}
                    className={`rounded-lg p-4 transition-all ${
                      isDark
                        ? 'bg-neutral-950/50 hover:bg-neutral-900/70'
                        : 'bg-neutral-50 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                            {machine.name || machine.machineId}
                          </p>
                          {machine.isRegistered ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${
                              isDark
                                ? 'border-emerald-600/30 text-emerald-300 bg-emerald-500/15'
                                : 'border-emerald-600/40 text-emerald-700 bg-emerald-50'
                            }`}>
                              Registered
                            </span>
                          ) : (
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${
                              isDark
                                ? 'border-neutral-600/30 text-neutral-300 bg-neutral-500/15'
                                : 'border-neutral-400/40 text-neutral-700 bg-neutral-100'
                            }`}>
                              Unregistered
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs mt-2">
                          <span className={isDark ? 'text-green-400' : 'text-green-600'}>
                            IN: ${(machine.totalMoneyIn || 0).toLocaleString()}
                          </span>
                          <span className={isDark ? 'text-red-400' : 'text-red-600'}>
                            OUT: ${(machine.totalMoneyOut || 0).toLocaleString()}
                          </span>
                          <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>
                            NET: ${(machine.totalRevenue || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMachineForQR(machine);
                          }}
                          className={`p-2 rounded-lg transition-all ${
                            isDark
                              ? 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-400'
                              : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                          }`}
                          title="Generate QR Code"
                        >
                          <QrCode className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/machines/${machine._id}`)}
                          className={`${isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Events */}
          {events.length > 0 && (
            <div className={`rounded-2xl p-6 border ${
              isDark
                ? 'bg-neutral-900/50 border-neutral-800'
                : 'bg-white border-neutral-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  Recent Activity
                </h2>
                <Activity className={`w-5 h-5 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`} />
              </div>
              <div className="space-y-2">
                {events.slice(0, 10).map((event) => (
                  <div
                    key={event._id}
                    className={`rounded-lg p-3 flex items-center justify-between ${
                      isDark
                        ? 'bg-neutral-950/50'
                        : 'bg-neutral-50'
                    }`}
                  >
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                        {event.machineName || event.gamingMachineId}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                        {event.eventType.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="text-right">
                      {event.amount && (
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                          ${event.amount.toFixed(2)}
                        </p>
                      )}
                      <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <EditHubModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        hub={hub}
        onUpdate={fetchHub}
        isDark={isDark}
      />

      <TokenModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        hub={hub}
        onRefresh={fetchHub}
        isDark={isDark}
      />

      {/* QR Code Modal */}
      {selectedMachineForQR && (
        <MachineQRModal
          machine={{
            _id: selectedMachineForQR._id,
            machineId: selectedMachineForQR.machineId,
            hubMachineId: hubId,
            name: selectedMachineForQR.name
          }}
          storeId={hub.storeId}
          onClose={() => setSelectedMachineForQR(null)}
        />
      )}
    </AdminLayout>
  );
}

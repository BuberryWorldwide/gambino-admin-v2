// src/app/admin/hubs/register/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Server, AlertCircle, CheckCircle2, Copy, QrCode, Download } from 'lucide-react';
import api from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RegisterResponse {
  success: boolean;
  hub: {
    hubId: string;
    name: string;
    storeId: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
  };
  machineToken?: string; // Legacy fallback
  message: string;
  setupInstructions?: {
    steps: string[];
    envConfig?: {
      MACHINE_ID: string;
      STORE_ID: string;
      API_ENDPOINT: string;
      MACHINE_TOKEN: string;
      REFRESH_TOKEN: string;
      SERIAL_PORT: string;
    };
  };
}

interface RegisteredHub {
  hubId: string;
  name: string;
  storeId: string;
  machineToken: string;
  refreshToken: string;
}

export default function RegisterHubPage() {
  const router = useRouter();
  const [hubId, setHubId] = useState('');
  const [hubName, setHubName] = useState('');
  const [storeId, setStoreId] = useState('');
  const [serialPort, setSerialPort] = useState('/dev/ttyUSB0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [registeredHub, setRegisteredHub] = useState<RegisteredHub | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Generate QR code when hub is registered
  useEffect(() => {
    if (registeredHub) {
      const envConfig = generateEnvConfig();
      // Use a simple QR code API or generate locally
      const qrData = encodeURIComponent(envConfig);
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`);
    }
  }, [registeredHub]);

  const generateEnvConfig = () => {
    if (!registeredHub) return '';
    return `# Gambino Pi Configuration
MACHINE_ID=${registeredHub.hubId}
STORE_ID=${registeredHub.storeId}
API_ENDPOINT=https://api.gambino.gold

# Authentication
MACHINE_TOKEN=${registeredHub.machineToken}
REFRESH_TOKEN=${registeredHub.refreshToken}

# Hardware Configuration
SERIAL_PORT=${serialPort}
PRINTER_PORT=/dev/ttyUSB1
ENABLE_SERIAL_LOGGING=true

# Application Settings
LOG_LEVEL=info
NODE_ENV=production
API_BASE_URL=https://api.gambino.gold/api`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<RegisterResponse>('/api/admin/hubs/register', {
        hubId: hubId.trim(),
        name: hubName.trim(),
        storeId: storeId.trim(),
        serialPort: serialPort.trim()
      });

      console.log('✅ Hub registration response:', response.data);

      if (response.data.success) {
        // Handle both new tokens object and legacy machineToken
        const accessToken = response.data.tokens?.accessToken || response.data.machineToken || '';
        const refreshToken = response.data.tokens?.refreshToken || '';

        const hubWithToken: RegisteredHub = {
          hubId: response.data.hub.hubId,
          name: response.data.hub.name,
          storeId: response.data.hub.storeId,
          machineToken: accessToken,
          refreshToken: refreshToken
        };

        console.log('✅ Registered hub with tokens:', {
          hubId: hubWithToken.hubId,
          hasAccessToken: !!hubWithToken.machineToken,
          hasRefreshToken: !!hubWithToken.refreshToken,
          tokenLength: hubWithToken.machineToken?.length
        });

        setSuccess(true);
        setRegisteredHub(hubWithToken);
      }
    } catch (err: any) {
      console.error('❌ Registration failed:', err);
      setError(err.response?.data?.error || 'Failed to register hub');
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (registeredHub?.machineToken) {
      navigator.clipboard.writeText(registeredHub.machineToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  const copyRefreshToken = () => {
    if (registeredHub?.refreshToken) {
      navigator.clipboard.writeText(registeredHub.refreshToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  const copyEnvBlock = () => {
    if (!registeredHub) return;
    navigator.clipboard.writeText(generateEnvConfig());
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const downloadEnvFile = () => {
    if (!registeredHub) return;
    const blob = new Blob([generateEnvConfig()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `.env.${registeredHub.hubId}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Success screen after registration
  if (success && registeredHub) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
              Hub Registered Successfully!
            </h1>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
              Your Pi hub has been registered. Copy the configuration below to your Raspberry Pi.
            </p>

            {/* Hub Details */}
            <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Hub Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400">Hub ID</Label>
                  <p className="font-mono text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {registeredHub.hubId}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400">Hub Name</Label>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {registeredHub.name}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400">Store ID</Label>
                  <p className="font-mono text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {registeredHub.storeId}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400">Serial Port</Label>
                  <p className="font-mono text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {serialPort}
                  </p>
                </div>
              </div>
            </div>

            {/* Authentication Tokens - CRITICAL SECTION */}
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-6 mb-6 border border-blue-200 dark:border-blue-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Authentication Tokens
              </h3>

              {/* Access Token */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">
                    Access Token (MACHINE_TOKEN) - Expires in 7 days
                  </Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyToken}
                    className="text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 p-3">
                  <code className="text-xs text-gray-900 dark:text-gray-100 break-all">
                    {registeredHub.machineToken || 'ERROR: Token not generated'}
                  </code>
                </div>
              </div>

              {/* Refresh Token */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">
                    Refresh Token (REFRESH_TOKEN) - Valid for 1 year
                  </Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyRefreshToken}
                    className="text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 p-3">
                  <code className="text-xs text-gray-900 dark:text-gray-100 break-all">
                    {registeredHub.refreshToken || 'No refresh token'}
                  </code>
                </div>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400">
                The Pi will automatically refresh the access token before it expires using the refresh token.
              </p>
            </div>

            {/* QR Code for Quick Setup */}
            {qrCodeUrl && (
              <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-6 mb-6 border border-purple-200 dark:border-purple-900">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <QrCode className="w-4 h-4 mr-2" />
                    Quick Setup QR Code
                  </h3>
                </div>
                <div className="flex flex-col items-center">
                  <img
                    src={qrCodeUrl}
                    alt="Configuration QR Code"
                    className="w-48 h-48 border rounded-lg bg-white p-2"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Scan this QR code with your phone to copy the .env configuration
                  </p>
                </div>
              </div>
            )}

            {/* Full .env Configuration */}
            <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Complete .env Configuration
                </Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadEnvFile}
                    className="text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyEnvBlock}
                    className="text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 p-4 overflow-x-auto">
                <pre className="text-xs text-gray-900 dark:text-gray-100">
                  {generateEnvConfig()}
                </pre>
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-6 mb-6 border border-yellow-200 dark:border-yellow-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                📋 Setup Instructions
              </h3>
              <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-decimal list-inside">
                <li>SSH into your Raspberry Pi: <code className="bg-white dark:bg-gray-900 px-2 py-0.5 rounded text-xs">ssh gambino@your-pi-ip</code></li>
                <li>Navigate to app directory: <code className="bg-white dark:bg-gray-900 px-2 py-0.5 rounded text-xs">cd ~/gambino-pi-app</code></li>
                <li>Create/edit .env file: <code className="bg-white dark:bg-gray-900 px-2 py-0.5 rounded text-xs">nano .env</code></li>
                <li>Paste the configuration above (use "Copy .env" button)</li>
                <li>Save and exit: <code className="bg-white dark:bg-gray-900 px-2 py-0.5 rounded text-xs">Ctrl+X, Y, Enter</code></li>
                <li>Restart service: <code className="bg-white dark:bg-gray-900 px-2 py-0.5 rounded text-xs">sudo systemctl restart gambino-pi</code></li>
                <li>Verify status: <code className="bg-white dark:bg-gray-900 px-2 py-0.5 rounded text-xs">sudo systemctl status gambino-pi</code></li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => router.push(`/admin/hubs/${registeredHub.hubId}`)}
                className="flex-1"
              >
                View Hub Details
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/admin/hubs')}
                className="flex-1"
              >
                Back to Hubs List
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Registration form
  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => router.push('/admin/hubs')}
          className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Hubs
        </button>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
              <Server className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Register New Hub
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Register a Raspberry Pi hub to connect machines
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                  Registration Failed
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="hubId">
                Hub ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hubId"
                type="text"
                value={hubId}
                onChange={(e) => setHubId(e.target.value)}
                placeholder="pi-6-rainesmkt-1"
                required
                className="mt-2"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Unique identifier for this hub (e.g., pi-1, pi-2-nimbus-1, pi-6-rainesmkt-1)
              </p>
            </div>

            <div>
              <Label htmlFor="hubName">
                Hub Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hubName"
                type="text"
                value={hubName}
                onChange={(e) => setHubName(e.target.value)}
                placeholder="Raines Market 1"
                required
                className="mt-2"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Descriptive name for this hub
              </p>
            </div>

            <div>
              <Label htmlFor="storeId">
                Store ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="storeId"
                type="text"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                placeholder="nashville_rainesmarket_557"
                required
                className="mt-2"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Store/venue this hub will be deployed at
              </p>
            </div>

            <div>
              <Label htmlFor="serialPort">Serial Port</Label>
              <select
                id="serialPort"
                value={serialPort}
                onChange={(e) => setSerialPort(e.target.value)}
                className="w-full mt-2 px-3 py-2 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="/dev/ttyUSB0">/dev/ttyUSB0 (Default)</option>
                <option value="/dev/ttyUSB1">/dev/ttyUSB1</option>
                <option value="/dev/ttyACM0">/dev/ttyACM0</option>
                <option value="/dev/ttyACM1">/dev/ttyACM1</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Serial port for Mutha Goose connection
              </p>
            </div>

            <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Registering Hub...' : 'Register Hub'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
// src/app/admin/hubs/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Server, AlertCircle, CheckCircle2, Copy } from 'lucide-react';
import api from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Store {
  _id: string;
  storeId: string;
  storeName: string;
  city?: string;
  state?: string;
}

interface RegisterResponse {
  success: boolean;
  hub: {
    hubId: string;
    name: string;
    storeId: string;
    machineToken: string;
  };
  message: string;
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
  const [registeredHub, setRegisteredHub] = useState<RegisterResponse['hub'] | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

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

      if (response.data.success) {
        setSuccess(true);
        setRegisteredHub(response.data.hub);
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
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

  const copyEnvBlock = () => {
    if (!registeredHub) return;
    
    const envBlock = `# Gambino Pi Configuration
MACHINE_ID=${registeredHub.hubId}
STORE_ID=${registeredHub.storeId}
API_ENDPOINT=https://api.gambino.gold

# Authentication
MACHINE_TOKEN=${registeredHub.machineToken}

# Hardware Configuration
SERIAL_PORT=${serialPort}

# Application Settings
LOG_LEVEL=info
NODE_ENV=production`;

    navigator.clipboard.writeText(envBlock);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

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

            {/* Authentication Token */}
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-6 mb-6 border border-blue-200 dark:border-blue-900">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Machine Token
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToken}
                  className="text-xs"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  {tokenCopied ? 'Copied!' : 'Copy Token'}
                </Button>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 p-3">
                <code className="text-xs text-gray-900 dark:text-gray-100 break-all">
                  {registeredHub.machineToken}
                </code>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                ⚠️ Save this token securely. You won't be able to see it again.
              </p>
            </div>

            {/* Full .env Configuration */}
            <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Complete .env Configuration
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyEnvBlock}
                  className="text-xs"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy .env
                </Button>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 p-4 overflow-x-auto">
                <pre className="text-xs text-gray-900 dark:text-gray-100">
{`# Gambino Pi Configuration
MACHINE_ID=${registeredHub.hubId}
STORE_ID=${registeredHub.storeId}
API_ENDPOINT=https://api.gambino.gold

# Authentication
MACHINE_TOKEN=${registeredHub.machineToken}

# Hardware Configuration
SERIAL_PORT=${serialPort}

# Application Settings
LOG_LEVEL=info
NODE_ENV=production`}
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
                <li>Paste the configuration above</li>
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
                placeholder="pi-1 or hub-location-name"
                required
                className="mt-2"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Unique identifier for this hub (e.g., pi-1, pi-2-nimbus-1)
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
                placeholder="Main Floor Hub"
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
                placeholder="store_12345"
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
                <option value="/dev/ttyUSB0">/dev/ttyUSB0</option>
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
                {loading ? 'Registering...' : 'Register Hub'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
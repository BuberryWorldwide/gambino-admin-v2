'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function HubDetailsPage({ params }) {
  // ✅ FIX: Unwrap params for Next.js 15+
  const unwrappedParams = use(params);
  const { hubId } = unwrappedParams;
  
  const router = useRouter();
  const [hub, setHub] = useState(null);
  const [store, setStore] = useState(null);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [regeneratingToken, setRegeneratingToken] = useState(false);

  useEffect(() => {
    loadHubDetails();
  }, [hubId]);

  const loadHubDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get hub details
      const hubRes = await api.get(`/api/admin/hubs/${hubId}`);
      setHub(hubRes.data.hub);
      setStore(hubRes.data.hub.store);

      // ✅ Discover machines by querying events that came through this hub
      // This shows ACTUAL machines reporting data, not just assigned ones
      const machinesRes = await api.get(`/api/admin/hubs/${hubId}/discovered-machines`);
      setMachines(machinesRes.data.machines || []);

    } catch (err) {
      console.error('Failed to load hub details:', err);
      setError(err.response?.data?.error || 'Failed to load hub details');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm('Regenerate authentication token? The Pi will need to be updated with the new token.')) {
      return;
    }

    try {
      setRegeneratingToken(true);
      const res = await api.post(`/api/admin/hubs/${hubId}/regenerate-token`);
      
      alert(`Token regenerated successfully!\n\nNew Token: ${res.data.machineToken}\n\nUpdate the Pi's .env file and restart the service.`);
      
      await loadHubDetails();
    } catch (err) {
      console.error('Failed to regenerate token:', err);
      alert(err.response?.data?.error || 'Failed to regenerate token');
    } finally {
      setRegeneratingToken(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">Loading hub details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/admin/hubs" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Hubs
          </Link>
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hub) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/admin/hubs" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Hubs
          </Link>
          <div className="text-center py-12">Hub not found</div>
        </div>
      </div>
    );
  }

  const isOnline = hub.isOnline;
  const lastSeen = hub.lastHeartbeat ? new Date(hub.lastHeartbeat).toLocaleString() : 'Never';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Link href="/admin/hubs" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
          ← Back to Hubs
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{hubId}</h1>
            <p className="text-gray-400">Hub Details & Management</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
            isOnline 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </div>
        </div>

        {/* Hub Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Store Card */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Store</h3>
            <p className="text-xl font-bold">{store?.storeName || hub.storeId}</p>
            {store?.city && store?.state && (
              <p className="text-sm text-gray-400 mt-1">{store.city}, {store.state}</p>
            )}
          </div>

          {/* Machines Card */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Connected Machines</h3>
            <p className="text-3xl font-bold">{machines.length}</p>
          </div>

          {/* Last Seen Card */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Last Seen</h3>
            <p className="text-lg font-semibold">{lastSeen}</p>
          </div>
        </div>

        {/* Connected Machines Section */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 mb-6">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold">Connected Machines</h2>
          </div>
          
          <div className="p-6">
            {machines.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No machines discovered yet. Machines will appear here once they start reporting events through this hub.
              </div>
            ) : (
              <div className="space-y-3">
                {machines.map((machine) => (
                  <div 
                    key={machine.machineId}
                    className="bg-gray-900 rounded-lg p-4 border border-gray-700 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">Machine {machine.machineId}</h3>
                      <div className="text-sm text-gray-400 mt-1">
                        <span>Last seen: {new Date(machine.lastSeen).toLocaleString()}</span>
                        <span className="mx-2">•</span>
                        <span>{machine.eventCount} events</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        machine.isRegistered
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {machine.isRegistered ? 'Registered' : 'Unknown'}
                      </span>
                      <Link
                        href={`/admin/machines/${machine.machineId}`}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={loadHubDetails}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Refresh Data
          </button>
          
          <button
            onClick={handleRegenerateToken}
            disabled={regeneratingToken}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            {regeneratingToken ? 'Regenerating...' : 'Regenerate Token'}
          </button>
        </div>
      </div>
    </div>
  );
}
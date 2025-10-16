'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function HubsPage() {
  const router = useRouter();
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [discoveredMachines, setDiscoveredMachines] = useState({});
  const [loadingDiscovery, setLoadingDiscovery] = useState({});

  useEffect(() => {
    loadHubs();
  }, []);

  const loadHubs = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get('/api/admin/hubs');
      const hubsList = res.data.hubs || [];
      setHubs(hubsList);

      // Auto-discover machines for each hub
      await discoverAllMachines(hubsList);
    } catch (err) {
      console.error('Failed to load hubs:', err);
      setError(err.response?.data?.error || 'Failed to load hubs');
    } finally {
      setLoading(false);
    }
  };

  const discoverAllMachines = async (hubsList) => {
    const discovered = {};
    
    // Discover machines for each hub in parallel
    await Promise.all(
      hubsList.map(async (hub) => {
        try {
          const res = await api.get(`/api/admin/hubs/${hub.hubId}/discovered-machines`);
          discovered[hub.hubId] = res.data.machines || [];
        } catch (err) {
          console.error(`Failed to discover machines for ${hub.hubId}:`, err);
          discovered[hub.hubId] = [];
        }
      })
    );

    setDiscoveredMachines(discovered);
  };

  const discoverMachinesForHub = async (hubId) => {
    try {
      setLoadingDiscovery({ ...loadingDiscovery, [hubId]: true });
      
      const res = await api.get(`/api/admin/hubs/${hubId}/discovered-machines`);
      setDiscoveredMachines({
        ...discoveredMachines,
        [hubId]: res.data.machines || []
      });
    } catch (err) {
      console.error(`Failed to discover machines for ${hubId}:`, err);
    } finally {
      setLoadingDiscovery({ ...loadingDiscovery, [hubId]: false });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">Loading hubs...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalHubs = hubs.length;
  const onlineHubs = hubs.filter(h => h.isOnline).length;
  const totalMachines = Object.values(discoveredMachines).reduce(
    (sum, machines) => sum + machines.length, 
    0
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Pi Hubs Management</h1>
            <p className="text-gray-400">Manage Raspberry Pi hubs and discover connected machines</p>
          </div>
          <Link
            href="/admin/hubs/register"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
          >
            + Register New Hub
          </Link>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Total Hubs</h3>
            <p className="text-3xl font-bold">{totalHubs}</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Online Hubs</h3>
            <p className="text-3xl font-bold text-green-400">{onlineHubs}</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Discovered Machines</h3>
            <p className="text-3xl font-bold text-blue-400">{totalMachines}</p>
          </div>
        </div>

        {/* Hubs List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">All Hubs</h2>
              <button
                onClick={loadHubs}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors"
              >
                Refresh All
              </button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-700">
            {hubs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No hubs registered yet. Click "Register New Hub" to add one.
              </div>
            ) : (
              hubs.map((hub) => {
                const machines = discoveredMachines[hub.hubId] || [];
                const registeredCount = machines.filter(m => m.isRegistered).length;
                const unregisteredCount = machines.length - registeredCount;
                const isDiscovering = loadingDiscovery[hub.hubId];

                return (
                  <div key={hub.hubId} className="p-6 hover:bg-gray-750 transition-colors">
                    <div className="flex items-start justify-between">
                      {/* Hub Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold">{hub.hubId}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            hub.isOnline
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {hub.isOnline ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </div>
                        
                        <p className="text-gray-400 mb-3">
                          {hub.store?.storeName || hub.storeId}
                          {hub.store?.city && ` • ${hub.store.city}, ${hub.store.state}`}
                        </p>

                        {/* Discovered Machines Summary */}
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">Total Machines:</span>
                            <span className="font-semibold text-blue-400">{machines.length}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">Registered:</span>
                            <span className="font-semibold text-green-400">{registeredCount}</span>
                          </div>
                          {unregisteredCount > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">Unknown:</span>
                              <span className="font-semibold text-yellow-400">{unregisteredCount}</span>
                            </div>
                          )}
                        </div>

                        {/* Machine List Preview */}
                        {machines.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {machines.slice(0, 10).map((machine) => (
                              <span
                                key={machine.machineId}
                                className={`px-3 py-1 rounded-lg text-xs font-mono ${
                                  machine.isRegistered
                                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                                    : 'bg-yellow-900/30 text-yellow-300 border border-yellow-700'
                                }`}
                              >
                                {machine.machineId}
                              </span>
                            ))}
                            {machines.length > 10 && (
                              <span className="px-3 py-1 rounded-lg text-xs text-gray-400">
                                +{machines.length - 10} more
                              </span>
                            )}
                          </div>
                        )}

                        {machines.length === 0 && (
                          <div className="mt-3 text-sm text-gray-500 italic">
                            No machines discovered yet
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 ml-6">
                        <Link
                          href={`/admin/hubs/${hub.hubId}`}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-center transition-colors"
                        >
                          View Details
                        </Link>
                        
                        <button
                          onClick={() => discoverMachinesForHub(hub.hubId)}
                          disabled={isDiscovering}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
                        >
                          {isDiscovering ? 'Scanning...' : 'Scan Machines'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
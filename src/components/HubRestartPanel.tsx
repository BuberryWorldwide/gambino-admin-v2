import React, { useState } from 'react';
import { useHubStatus } from '../hooks/useHubStatus';
import { AdminAPI } from '../app/api/admin';
import { HubCard } from './HubCard';

export const HubRestartPanel: React.FC = () => {
  const { hubs, loading, error, refetch } = useHubStatus();
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleRestartHub = async (hubId: string) => {
    try {
      const response = await AdminAPI.restartHub(hubId);
      if (response.success) {
        showNotification('success', response.message);
        await refetch();
      } else {
        showNotification('error', response.message);
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Restart failed');
    }
  };

  if (loading && !hubs.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800 font-medium">Error</div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
            notification.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hub Management</h2>
          <p className="text-gray-600 mt-1">
            {hubs.length} {hubs.length === 1 ? 'hub' : 'hubs'} configured
          </p>
        </div>
        <button
          onClick={refetch}
          className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {hubs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No hubs configured</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hubs.map((hub) => (
            <HubCard key={hub.hubId} hub={hub} onRestart={handleRestartHub} />
          ))}
        </div>
      )}
    </div>
  );
};
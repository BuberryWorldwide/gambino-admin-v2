import React from 'react';
import { HubStatus } from '../types/index';
import { StatusBadge } from './StatusBadge';
import { RestartButton } from './RestartButton';

interface HubCardProps {
  hub: HubStatus;
  onRestart: (hubId: string) => Promise<void>;
}

export const HubCard: React.FC<HubCardProps> = ({ hub, onRestart }) => {
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatLastSeen = (lastHeartbeat: string | null): string => {
    if (!lastHeartbeat) return 'Never';
    
    const diff = Date.now() - new Date(lastHeartbeat).getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const isOnline = hub.lastHeartbeat && 
    (Date.now() - new Date(hub.lastHeartbeat).getTime()) < 120000;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{hub.name || hub.hubId}</h3>
          <p className="text-xs text-gray-500">{hub.hubId}</p>
        </div>
        <StatusBadge status={hub.status} />
      </div>
      
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Store:</span>
          <span className="font-medium text-gray-900">{hub.storeId}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Uptime:</span>
          <span className="font-medium text-gray-900">{formatUptime(hub.uptime)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Last Seen:</span>
          <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
            {formatLastSeen(hub.lastHeartbeat)}
          </span>
        </div>
        
        {hub.version && (
          <div className="flex justify-between">
            <span className="text-gray-600">Version:</span>
            <span className="font-medium text-gray-900">{hub.version.appVersion}</span>
          </div>
        )}
      </div>
      
      <RestartButton
        onRestart={() => onRestart(hub.hubId)}
        disabled={hub.status === 'restarting' || hub.status === 'offline'}
      />
    </div>
  );
};
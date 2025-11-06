import React from 'react';

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'restarting' | 'error';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles: Record<string, string> = {
    online: 'bg-green-100 text-green-800',
    offline: 'bg-gray-100 text-gray-800',
    restarting: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
  };

  const labels: Record<string, string> = {
    online: 'ONLINE',
    offline: 'OFFLINE',
    restarting: 'RESTARTING',
    error: 'ERROR',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};
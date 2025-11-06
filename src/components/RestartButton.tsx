import React, { useState } from 'react';

interface RestartButtonProps {
  onRestart: () => Promise<void>;
  disabled: boolean;
}

export const RestartButton: React.FC<RestartButtonProps> = ({ onRestart, disabled }) => {
  const [isRestarting, setIsRestarting] = useState(false);

  const handleClick = async () => {
    if (disabled || isRestarting) return;

    const confirmed = window.confirm(
      'Are you sure you want to restart this hub? The hub will be offline for approximately 2 minutes.'
    );
    
    if (!confirmed) return;

    setIsRestarting(true);
    try {
      await onRestart();
    } finally {
      setTimeout(() => setIsRestarting(false), 120000);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isRestarting}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        disabled || isRestarting
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {isRestarting ? 'Restarting...' : 'Restart Hub'}
    </button>
  );
};
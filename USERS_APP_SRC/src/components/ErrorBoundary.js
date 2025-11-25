// src/components/ErrorBoundary.js
'use client';
import { useEffect } from 'react';

export default function ErrorBoundary({ children }) {
  useEffect(() => {
    // Prevent window.ethereum errors on mobile
    const handleError = (event) => {
      if (event.error && event.error.message) {
        const message = event.error.message.toLowerCase();
        if (message.includes('ethereum') || 
            message.includes('selectedaddress') || 
            message.includes('window.ethereum')) {
          console.warn('Wallet-related error suppressed:', event.error.message);
          event.preventDefault();
          return false;
        }
      }
    };

    const handleUnhandledRejection = (event) => {
      if (event.reason && typeof event.reason === 'string') {
        const reason = event.reason.toLowerCase();
        if (reason.includes('ethereum') || reason.includes('wallet')) {
          console.warn('Wallet-related promise rejection suppressed:', event.reason);
          event.preventDefault();
          return false;
        }
      }
    };

    // Add global error handlers
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Override problematic objects safely
    try {
      // Create a safe proxy for window.ethereum if it doesn't exist
      if (typeof window !== 'undefined' && !window.ethereum) {
        window.ethereum = new Proxy({}, {
          get(target, prop) {
            console.warn(`Attempted to access window.ethereum.${String(prop)} - not available on this device`);
            return undefined;
          },
          set(target, prop, value) {
            console.warn(`Attempted to set window.ethereum.${String(prop)} - not available on this device`);
            return true;
          }
        });
      }
    } catch (error) {
      console.warn('Could not setup ethereum proxy:', error);
    }

    // Cleanup
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return <>{children}</>;
}
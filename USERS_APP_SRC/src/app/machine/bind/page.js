'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { getToken } from '@/lib/auth';

function BindPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [binding, setBinding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [machine, setMachine] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // Check if user is logged in
  useEffect(() => {
    const authToken = getToken();
    const storedUser = localStorage.getItem('gambino_user');

    if (authToken && storedUser) {
      setIsLoggedIn(true);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
  }, []);

  // Validate the binding token and get machine info
  useEffect(() => {
    if (!token) {
      setError('No machine token provided. Please scan a valid QR code.');
      setLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.post('/api/machines/validate-binding', { token });

      if (response.data.success && response.data.machine) {
        setMachine(response.data.machine);
      } else {
        setError(response.data.error || 'Invalid or expired QR code. Please try scanning again.');
      }
    } catch (err) {
      console.error('Validation error:', err);
      setError(err.response?.data?.error || 'Failed to validate machine. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleBind = async () => {
    if (!isLoggedIn) {
      // Store the current URL to redirect back after login
      localStorage.setItem('gambino_redirect', window.location.href);
      router.push('/login');
      return;
    }

    try {
      setBinding(true);
      setError('');

      const response = await api.post('/api/machines/bind', {
        token,
        machineId: machine.machineId,
        storeId: machine.storeId
      });

      if (response.data.success) {
        setSuccess(`You're now mining on ${machine.name || machine.machineId}!`);

        // Store active session info
        localStorage.setItem('gambino_active_session', JSON.stringify(response.data.session));

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        // Handle specific error cases
        if (response.data.error?.includes('active session')) {
          setError(`${response.data.error} Go to your dashboard to end it first.`);
        } else if (response.data.error?.includes('in use')) {
          setError('This machine is currently in use by another player. Please try a different machine.');
        } else {
          setError(response.data.error || 'Failed to connect to machine.');
        }
      }
    } catch (err) {
      console.error('Binding error:', err);
      const errorMsg = err.response?.data?.error || 'Failed to connect to machine. Please try again.';
      if (errorMsg.includes('active session')) {
        setError(`${errorMsg} Go to your dashboard to end it first.`);
      } else {
        setError(errorMsg);
      }
    } finally {
      setBinding(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Validating machine...</p>
        </div>
      </div>
    );
  }

  // Error state (no token or invalid)
  if (error && !machine) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-4">
        <div className="max-w-md mx-auto pt-20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-yellow-500 mb-2">GAMBINO</h1>
            <p className="text-gray-400">Machine Connection</p>
          </div>

          <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 text-center">
            <span className="text-4xl mb-4 block">⚠️</span>
            <h2 className="text-xl font-bold text-red-400 mb-2">Connection Failed</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-4">
        <div className="max-w-md mx-auto pt-20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-yellow-500 mb-2">GAMBINO</h1>
          </div>

          <div className="bg-green-900/20 border border-green-500/50 rounded-xl p-6 text-center">
            <span className="text-6xl mb-4 block">🎰</span>
            <h2 className="text-2xl font-bold text-green-400 mb-2">Connected!</h2>
            <p className="text-gray-300 mb-4">{success}</p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Main machine info and bind UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-yellow-500 mb-2">GAMBINO</h1>
          <p className="text-gray-400">Connect to Machine</p>
        </div>

        {/* Machine Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
          {/* Machine Header */}
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 p-6 text-black">
            <div className="flex items-center justify-center mb-2">
              <span className="text-5xl">🎰</span>
            </div>
            <h2 className="text-2xl font-bold text-center">
              {machine?.name || machine?.machineId}
            </h2>
            <p className="text-center opacity-80">{machine?.gameType || 'Gaming Machine'}</p>
          </div>

          {/* Machine Details */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-lg p-3">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Store</p>
                <p className="text-white font-semibold truncate">{machine?.storeName}</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-3">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Location</p>
                <p className="text-white font-semibold truncate">{machine?.location || 'Main Floor'}</p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-3">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Machine ID</p>
              <p className="text-white font-mono">{machine?.machineId}</p>
            </div>

            {/* Status indicator */}
            <div className="flex items-center justify-center space-x-2 py-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-green-400 text-sm">Machine Available</span>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* User status */}
            {!isLoggedIn && (
              <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                <p className="text-blue-300 text-sm text-center">
                  You'll need to log in or create an account to connect.
                </p>
              </div>
            )}

            {isLoggedIn && user && (
              <div className="bg-gray-900 rounded-lg p-3 flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold">
                  {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-white font-semibold">{user.firstName} {user.lastName}</p>
                  <p className="text-gray-500 text-xs">{user.email}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="p-6 pt-0">
            <button
              onClick={handleBind}
              disabled={binding}
              className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {binding ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                  Connecting...
                </span>
              ) : isLoggedIn ? (
                'Start Mining'
              ) : (
                'Login to Connect'
              )}
            </button>

            {!isLoggedIn && (
              <p className="text-center text-gray-500 text-sm mt-4">
                Don't have an account?{' '}
                <Link href="/onboard" className="text-yellow-500 hover:text-yellow-400">
                  Sign up
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-yellow-500 font-semibold mb-2">How Mining Works</h3>
          <ul className="text-gray-400 text-sm space-y-2">
            <li className="flex items-start">
              <span className="mr-2">1.</span>
              Connect your account to this machine
            </li>
            <li className="flex items-start">
              <span className="mr-2">2.</span>
              Play normally - your activity generates entropy
            </li>
            <li className="flex items-start">
              <span className="mr-2">3.</span>
              Rare statistical events = GG token discoveries!
            </li>
          </ul>
        </div>

        {/* Back link */}
        <div className="text-center mt-8">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function BindPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <BindPageContent />
    </Suspense>
  );
}

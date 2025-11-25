'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { setToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const [walletAccount, setWalletAccount] = useState('');
  const [walletError, setWalletError] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);
  const [showWallet, setShowWallet] = useState(false);

  const connectWallet = async () => {
    setWalletLoading(true);
    setWalletError('');
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAccount(accounts?.[0] || '');
      } else if (typeof window !== 'undefined' && window.solana?.isPhantom) {
        const resp = await window.solana.connect();
        setWalletAccount(resp?.publicKey?.toString() || '');
      } else {
        setWalletError('No wallet detected. Use MetaMask/Phantom or open this in the wallet\'s in‑app browser.');
      }
    } catch (e) {
      setWalletError(e?.message || 'Wallet connection failed');
    } finally {
      setWalletLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      setToken(data.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-8">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Floating particles */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-yellow-400/30 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1.5 h-1.5 bg-amber-300/40 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 right-10 w-2 h-2 bg-yellow-500/30 rounded-full animate-pulse delay-2000"></div>
        <div className="absolute bottom-20 left-20 w-1.5 h-1.5 bg-yellow-400/40 rounded-full animate-pulse delay-500"></div>
        
        {/* Background gradients */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-yellow-500/8 to-amber-600/5 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-amber-600/10 to-yellow-500/5 rounded-full blur-3xl transform -translate-x-24 translate-y-24"></div>
      </div>

      <div className="w-full max-w-md mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/50 px-4 py-2 text-sm text-neutral-300 mb-6">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            Member Login
          </div>
          
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
              GAMBINO
            </span>
          </h1>
          <p className="text-neutral-400 text-sm">
            Sign in to access your dashboard and wallet
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={onSubmit} className="card space-y-6">
          <div className="space-y-4">
            {/* Email Input - Fixed positioning */}
            <div>
              <label className="label block mb-2">Email Address</label>
              <input 
                className="input" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="you@example.com" 
                required
              />
            </div>
            
            {/* Password Input - Fixed positioning */}
            <div>
              <label className="label block mb-2">Password</label>
              <input 
                className="input" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-300 p-3 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          <button 
            disabled={loading} 
            className="btn btn-gold w-full"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-r-transparent"></div>
                Signing In...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In
              </div>
            )}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-neutral-950 px-2 text-neutral-500">Or connect with</span>
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="space-y-4">
            {!showWallet ? (
              <button 
                type="button"
                onClick={() => setShowWallet(true)}
                className="btn btn-ghost w-full"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Connect Wallet
                </div>
              </button>
            ) : (
              <div className="space-y-3">
                <button 
                  type="button"
                  onClick={connectWallet} 
                  disabled={walletLoading} 
                  className="btn btn-ghost w-full"
                >
                  {walletLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-r-transparent"></div>
                      Connecting...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Connect MetaMask / Phantom
                    </div>
                  )}
                </button>
                
                {walletAccount && (
                  <div className="bg-green-900/20 border border-green-500 text-green-300 p-3 rounded-lg text-sm">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <div className="font-medium">Wallet Connected</div>
                        <div className="break-all text-xs opacity-90">{walletAccount}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {walletError && (
                  <div className="bg-red-900/20 border border-red-500 text-red-300 p-3 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {walletError}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Footer Links */}
        <div className="text-center mt-6 space-y-4">
          <p className="text-sm text-neutral-400">
            Don't have an account?{' '}
            <Link href="/onboard" className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors">
              Create one here
            </Link>
          </p>
          
          <div className="flex items-center justify-center gap-4 text-xs text-neutral-500">
            <Link href="https://gambino.gold/legal/terms" className="hover:text-neutral-400 transition-colors">
              Terms
            </Link>
            <span>•</span>
            <Link href="https://gambino.gold/legal/privacy" className="hover:text-neutral-400 transition-colors">
              Privacy
            </Link>
            <span>•</span>
            <Link href="https://gambino.gold/support" className="hover:text-neutral-400 transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

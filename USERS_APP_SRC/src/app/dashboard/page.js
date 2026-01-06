'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import api from '@/lib/api';
import ProofsSection from '@/components/ProofsSection';

// StatBox component matching homepage style
function StatBox({ label, value, sub }) {
  return (
    <div className="stat-box">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="text-xs text-neutral-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const pollerRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState(null);
  const [balances, setBalances] = useState(null);
  const [qr, setQr] = useState(null);
  const [error, setError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Transfer form state
  const [transferForm, setTransferForm] = useState({
    recipientAddress: '',
    amount: '',
    tokenType: 'SOL'
  });
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showTransferModal) {
      document.body.classList.add('modal-open');

      // Add escape key listener
      const handleEscape = (e) => {
        if (e.key === 'Escape' && !transferLoading) {
          setShowTransferModal(false);
          setTransferError('');
          setTransferSuccess('');
        }
      };

      document.addEventListener('keydown', handleEscape);

      return () => {
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [showTransferModal, transferLoading]);

  useEffect(() => {
    setMounted(true);
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    if (!mounted || !getToken()) return;

    let cancelled = false;
    const fetchAll = async () => {
      try {
        const profileRes = await api.get('/api/users/profile');
        const profileData = profileRes.data?.user;
        
        if (!cancelled) {
          setProfile(profileData);
          setError('');

          const addr = profileData?.walletAddress;
          if (addr) {
            const [balRes, qrRes] = await Promise.allSettled([
              api.get(`/api/wallet/balance/${addr}`),
              api.get(`/api/wallet/qrcode/${addr}`)
            ]);

            if (balRes.status === 'fulfilled') {
              setBalances(balRes.value.data?.balances ?? null);
            } else {
              setBalances(null);
            }

            if (qrRes.status === 'fulfilled') {
              setQr(qrRes.value.data?.qr ?? null);
            } else {
              setQr(null);
            }
          } else {
            setBalances(null);
            setQr(null);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.error || 'Failed to load profile');
        }
      }
    };

    fetchAll();
    pollerRef.current = setInterval(fetchAll, 30000);

    return () => {
      cancelled = true;
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, [mounted, router]);

  const handleGenerateWallet = async () => {
    try {
      setError('');
      const { data } = await api.post('/api/wallet/generate');
      const addr = data?.walletAddress;

      setProfile((prev) => ({ ...(prev || {}), walletAddress: addr }));

      if (addr) {
        const [balRes, qrRes] = await Promise.allSettled([
          api.get(`/api/wallet/balance/${addr}`),
          api.get(`/api/wallet/qrcode/${addr}`)
        ]);
        if (balRes.status === 'fulfilled') setBalances(balRes.value.data?.balances ?? null);
        if (qrRes.status === 'fulfilled') setQr(qrRes.value.data?.qr ?? null);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to generate wallet');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    try {
      await api.post('/api/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      setPasswordSuccess('Password updated successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowChangePassword(false);
    } catch (e) {
      setPasswordError(e?.response?.data?.error || 'Failed to change password');
    }
  };

  const handleRevealPrivateKey = async () => {
    try {
      setError('');
      const { data } = await api.get('/api/wallet/private-key');
      setProfile((prev) => ({ ...prev, privateKey: data.privateKey }));
      setShowPrivateKey(true);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to retrieve private key');
    }
  };

  const copyToClipboard = async (text, event) => {
    if (!text) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);

        // Visual feedback
        if (event?.currentTarget) {
          const button = event.currentTarget;
          const originalText = button.textContent;
          button.textContent = 'Copied!';
          button.classList.add('copy-success');

          setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copy-success');
          }, 2000);
        }
      } catch (err) {
        // Fallback for mobile devices
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setTransferError('');
    setTransferSuccess('');

    // Validation
    if (!transferForm.recipientAddress || !transferForm.amount) {
      setTransferError('Please fill in all fields');
      return;
    }

    const amount = parseFloat(transferForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setTransferError('Please enter a valid amount greater than 0');
      return;
    }

    // Check if user has sufficient balance
    const currentBalance = Number(balances?.[transferForm.tokenType] ?? 0);
    if (amount > currentBalance) {
      setTransferError(`Insufficient ${transferForm.tokenType} balance. You have ${currentBalance.toLocaleString()}`);
      return;
    }

    // Basic Solana address validation (should be 32-44 characters)
    if (transferForm.recipientAddress.length < 32 || transferForm.recipientAddress.length > 44) {
      setTransferError('Invalid Solana wallet address');
      return;
    }

    try {
      setTransferLoading(true);
      await api.post('/api/wallet/transfer', {
        fromAddress: profile.walletAddress,
        toAddress: transferForm.recipientAddress,
        amount: amount,
        tokenType: transferForm.tokenType
      });

      setTransferSuccess(`Successfully sent ${amount} ${transferForm.tokenType} to ${transferForm.recipientAddress.slice(0, 8)}...${transferForm.recipientAddress.slice(-6)}`);

      // Reset form
      setTransferForm({
        recipientAddress: '',
        amount: '',
        tokenType: 'SOL'
      });

      // Refresh balances
      if (profile?.walletAddress) {
        const balRes = await api.get(`/api/wallet/balance/${profile.walletAddress}`);
        if (balRes.data?.balances) {
          setBalances(balRes.data.balances);
        }
      }

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowTransferModal(false);
        setTransferSuccess('');
      }, 2000);
    } catch (e) {
      setTransferError(e?.response?.data?.error || 'Failed to transfer tokens. Please try again.');
    } finally {
      setTransferLoading(false);
    }
  };

  // avoid hydration flashes
  if (!mounted) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="loading-spinner text-yellow-400"></div>
    </div>
  );

  const gBal = Number(profile?.gambinoBalance ?? 0);
  const gluck = Number(profile?.gluckScore ?? 0);
  const tier = gluck < 100 ? 'Bronze' : gluck < 500 ? 'Silver' : gluck < 1000 ? 'Gold' : 'Diamond';
  
  const jackMajor = Number(profile?.jackpotsMajor ?? 0);
  const jackMinor = Number(profile?.jackpotsMinor ?? 0);
  const jackTotal = jackMajor + jackMinor;

  const sol = Number(balances?.SOL ?? 0);
  const gg = Number(balances?.GG ?? 0);
  const usdc = Number(balances?.USDC ?? 0);

  return (
    <div className="min-h-screen relative">
      {/* Minimal background particles for mobile performance */}
      <div className="hidden md:block fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-3 h-3 bg-yellow-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-2 h-2 bg-yellow-300/30 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 right-10 w-3 h-3 bg-yellow-500/20 rounded-full animate-pulse delay-3000"></div>
        <div className="absolute bottom-20 left-20 w-2 h-2 bg-yellow-400/30 rounded-full animate-pulse delay-500"></div>
      </div>

      {/* Mobile-optimized background shapes */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40 md:opacity-60">
        <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-gradient-to-br from-yellow-500/8 to-amber-600/5 rounded-full blur-3xl transform translate-x-16 -translate-y-16 md:translate-x-32 md:-translate-y-32"></div>
        <div className="absolute bottom-0 left-0 w-56 h-56 md:w-80 md:h-80 bg-gradient-to-tr from-amber-600/10 to-yellow-500/5 rounded-full blur-3xl transform -translate-x-12 translate-y-12 md:-translate-x-24 md:translate-y-24"></div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 md:py-8 relative z-10">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Welcome back, <span className="text-gradient-gold">{profile?.email || 'Member'}</span>
          </h1>
          <p className="text-neutral-400 text-sm md:text-base">
            Manage your account, track your progress, and monitor your wallet.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-300 p-3 md:p-4 rounded-lg mb-4 md:mb-6 backdrop-blur-sm text-sm">
            {error}
          </div>
        )}

        {/* Account Management */}
        <div className="card mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-4">
            <h2 className="text-lg md:text-xl font-bold text-white">Account Settings</h2>
            <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-400">
              <div className="status-live h-2 w-2"></div>
              Account Active
            </div>
          </div>
          
          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            <div>
              <div className="label mb-2">Email Address</div>
              <div className="bg-neutral-800/50 p-3 rounded border border-neutral-700 text-neutral-300 text-sm md:text-base break-all">
                {profile?.email || 'Loading...'}
              </div>
            </div>
            
            <div>
              <div className="label mb-2">Account Actions</div>
              <button 
                onClick={() => setShowChangePassword(!showChangePassword)}
                className="btn btn-ghost w-full text-sm"
              >
                Change Password
              </button>
            </div>
          </div>

          {/* Password Change Form */}
          {showChangePassword && (
            <div className="mt-4 md:mt-6 p-4 border border-neutral-700 rounded-lg bg-neutral-900/50">
              <h3 className="text-base md:text-lg font-semibold mb-4 text-white">Change Password</h3>
              
              {passwordError && (
                <div className="bg-red-900/20 border border-red-500 text-red-300 p-3 rounded mb-4 text-sm">
                  {passwordError}
                </div>
              )}
              
              {passwordSuccess && (
                <div className="bg-green-900/20 border border-green-500 text-green-300 p-3 rounded mb-4 text-sm">
                  {passwordSuccess}
                </div>
              )}
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="label">Current Password</label>
                  <input 
                    type="password" 
                    className="input mt-1"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({...prev, currentPassword: e.target.value}))}
                    required
                  />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input 
                    type="password" 
                    className="input mt-1"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({...prev, newPassword: e.target.value}))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input 
                    type="password" 
                    className="input mt-1"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({...prev, confirmPassword: e.target.value}))}
                    required
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button type="submit" className="btn btn-gold">Update Password</button>
                  <button type="button" onClick={() => setShowChangePassword(false)} className="btn btn-ghost">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Stats Grid - Mobile optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <StatBox 
            label="GAMBINO Balance" 
            value={gBal.toLocaleString()} 
            sub={profile?.walletAddress ? 'Wallet Connected' : 'No Wallet Yet'} 
          />
          <StatBox 
            label="Glück Score" 
            value={gluck.toLocaleString()} 
            sub={`Tier: ${tier}`} 
          />
          <StatBox 
            label="Jackpots Won" 
            value={jackTotal} 
            sub={`Major ${jackMajor} • Minor ${jackMinor}`} 
          />
        </div>

        {/* Machines Played - Mobile friendly */}
        <div className="card mb-6 md:mb-8">
          <div className="text-neutral-400 text-sm mb-3">Machines Played</div>
          <div className="flex flex-wrap gap-2">
            {profile?.machinesPlayed?.length
              ? profile.machinesPlayed.map((m) => (
                  <span key={m} className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-medium">
                    {m}
                  </span>
                ))
              : <span className="text-neutral-500 text-sm">No machines played yet</span>}
          </div>
        </div>

        {/* Entropy Proofs Section */}
        {profile?._id && (
          <div className="mb-6 md:mb-8">
            <ProofsSection userId={profile._id} />
          </div>
        )}

        {/* Wallet Section - Mobile optimized */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-4">
            <h2 className="text-lg md:text-xl font-bold text-white">Wallet Management</h2>
            {profile?.walletAddress && (
              <div className="flex items-center gap-2 text-xs md:text-sm text-green-400">
                <div className="status-live h-2 w-2"></div>
                Wallet Active
              </div>
            )}
          </div>
          
          {!profile?.walletAddress ? (
            <div className="text-center py-8 md:py-12">
              <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-yellow-500/50"></div>
              </div>
              <p className="text-neutral-400 mb-4 md:mb-6 text-sm md:text-base">No wallet generated yet</p>
              <button onClick={handleGenerateWallet} className="btn btn-gold">
                Generate Wallet
              </button>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {/* Wallet Address - Mobile friendly */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                  <p className="label">Wallet Address</p>
                  <button
                    onClick={(e) => copyToClipboard(profile.walletAddress, e)}
                    className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors self-start sm:self-auto px-3 py-1.5 rounded hover:bg-yellow-400/10"
                  >
                    Copy Address
                  </button>
                </div>
                <p className="wallet-address text-xs md:text-sm">
                  {profile.walletAddress}
                </p>
              </div>

              {/* Private Key Section - Mobile friendly */}
              <div className="private-key-warning">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                  <p className="text-sm text-red-400 font-semibold">⚠️ Private Key (Keep Secret!)</p>
                  {!showPrivateKey ? (
                    <button 
                      onClick={handleRevealPrivateKey}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors self-start sm:self-auto"
                    >
                      Reveal Private Key
                    </button>
                  ) : null}
                </div>
                
                <div className="min-h-[60px] flex items-center">
                  {showPrivateKey && profile.privateKey ? (
                    <div className="w-full">
                      <p className="font-mono text-xs md:text-sm break-all text-red-300 bg-neutral-900/70 p-3 rounded border border-red-600/50 backdrop-blur-sm">
                        {profile.privateKey}
                      </p>
                      <p className="text-xs text-red-400 mt-2">
                        Never share this with anyone! Anyone with this key can access your wallet.
                      </p>
                    </div>
                  ) : showPrivateKey ? (
                    <p className="text-red-400 text-sm">Private key not available</p>
                  ) : (
                    <p className="text-neutral-500 text-sm">Click "Reveal Private Key" to show your wallet's private key</p>
                  )}
                </div>
              </div>

              {/* Balances and QR - Mobile optimized layout */}
              <div className="flex flex-col lg:flex-row items-start gap-4 md:gap-6">
                {qr && (
                  <div className="text-center w-full lg:w-auto">
                    <p className="label mb-3">Wallet QR Code</p>
                    <div className="p-3 bg-white rounded-lg inline-block shadow-lg">
                      <img src={qr} alt="Wallet QR" className="w-32 h-32 md:w-40 md:h-40" />
                    </div>
                    <p className="text-xs text-neutral-500 mt-2">Scan to receive tokens</p>
                  </div>
                )}
                
                <div className="flex-1 w-full">
                  <p className="label mb-3 md:mb-4">Current Balances</p>
                  <div className="balance-grid">
                    <div className="balance-item">
                      <p className="text-xs text-neutral-400 uppercase tracking-wider">SOL</p>
                      <p className="text-lg md:text-2xl font-bold text-white mt-1">{sol.toLocaleString()}</p>
                    </div>
                    <div className="balance-item">
                      <p className="text-xs text-neutral-400 uppercase tracking-wider">GAMBINO</p>
                      <p className="text-lg md:text-2xl font-bold text-yellow-500 mt-1">{gg.toLocaleString()}</p>
                    </div>
                    <div className="balance-item">
                      <p className="text-xs text-neutral-400 uppercase tracking-wider">USDC</p>
                      <p className="text-lg md:text-2xl font-bold text-white mt-1">{usdc.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Actions - Mobile friendly */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 pt-4 md:pt-6 border-t border-neutral-700">
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="btn btn-gold flex-1 sm:flex-none"
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Tokens
                </button>
                <button className="btn btn-ghost flex-1 sm:flex-none">
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Transaction History
                </button>
                <button
                  onClick={() => copyToClipboard(profile.privateKey || '')}
                  className="btn btn-ghost flex-1 sm:flex-none"
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Export Wallet
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Transfer Token Modal - Mobile optimized */}
        {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-neutral-700">
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Tokens
                </h2>
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferError('');
                    setTransferSuccess('');
                  }}
                  className="text-neutral-400 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleTransfer} className="p-4 md:p-6 space-y-4">
                {/* Current Balance Display */}
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
                  <p className="text-xs text-neutral-400 mb-2 uppercase tracking-wider">Your Balance</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className={`p-2 rounded ${transferForm.tokenType === 'SOL' ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-neutral-800'}`}>
                      <p className="text-xs text-neutral-400">SOL</p>
                      <p className="text-sm md:text-base font-bold text-white">{sol.toLocaleString()}</p>
                    </div>
                    <div className={`p-2 rounded ${transferForm.tokenType === 'GG' ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-neutral-800'}`}>
                      <p className="text-xs text-neutral-400">GAMBINO</p>
                      <p className="text-sm md:text-base font-bold text-yellow-500">{gg.toLocaleString()}</p>
                    </div>
                    <div className={`p-2 rounded ${transferForm.tokenType === 'USDC' ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-neutral-800'}`}>
                      <p className="text-xs text-neutral-400">USDC</p>
                      <p className="text-sm md:text-base font-bold text-white">{usdc.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Token Type Selection */}
                <div>
                  <label className="label mb-2">Select Token</label>
                  <select
                    className="input"
                    value={transferForm.tokenType}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, tokenType: e.target.value }))}
                    required
                  >
                    <option value="SOL">SOL</option>
                    <option value="GG">GAMBINO (GG)</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>

                {/* Recipient Address */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label">Recipient Address</label>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) {
                            setTransferForm(prev => ({ ...prev, recipientAddress: text.trim() }));
                          }
                        } catch (err) {
                          // Clipboard read failed - show input focus
                          console.log('Clipboard access denied');
                        }
                      }}
                      className="text-xs text-yellow-400 hover:text-yellow-300 px-2 py-1 rounded hover:bg-yellow-400/10 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Paste
                    </button>
                  </div>
                  <input
                    type="text"
                    className="input font-mono text-xs md:text-sm"
                    placeholder="Enter Solana wallet address"
                    value={transferForm.recipientAddress}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, recipientAddress: e.target.value }))}
                    required
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Must be a valid Solana wallet address (32-44 characters)
                  </p>
                </div>

                {/* Amount */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label">Amount</label>
                    <button
                      type="button"
                      onClick={() => {
                        const maxBalance = Number(balances?.[transferForm.tokenType] ?? 0);
                        setTransferForm(prev => ({ ...prev, amount: maxBalance.toString() }));
                      }}
                      className="text-xs text-yellow-400 hover:text-yellow-300 px-2 py-1 rounded hover:bg-yellow-400/10 transition-colors"
                    >
                      Use Max
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.000001"
                      min="0"
                      className="input pr-20"
                      placeholder="0.00"
                      value={transferForm.amount}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-semibold">
                      {transferForm.tokenType}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Available: {Number(balances?.[transferForm.tokenType] ?? 0).toLocaleString()} {transferForm.tokenType}
                  </p>
                </div>

                {/* Error/Success Messages */}
                {transferError && (
                  <div className="bg-red-900/20 border border-red-500 text-red-300 p-3 rounded-lg text-sm">
                    {transferError}
                  </div>
                )}

                {transferSuccess && (
                  <div className="bg-green-900/20 border border-green-500 text-green-300 p-3 rounded-lg text-sm">
                    {transferSuccess}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={transferLoading}
                    className="btn btn-gold flex-1"
                  >
                    {transferLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                        Sending...
                      </div>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Send {transferForm.tokenType}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTransferModal(false);
                      setTransferError('');
                      setTransferSuccess('');
                    }}
                    disabled={transferLoading}
                    className="btn btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                </div>

                {/* Warning */}
                <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-3 text-xs text-yellow-300">
                  <strong className="flex items-center gap-1 mb-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Important
                  </strong>
                  Double-check the recipient address. Transactions on the blockchain are irreversible.
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
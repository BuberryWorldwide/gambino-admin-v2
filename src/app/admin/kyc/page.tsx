// src/app/admin/kyc/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import {
  Search, Shield, CheckCircle, XCircle, Clock, RefreshCw,
  AlertCircle, UserCheck, Building, ChevronRight, X
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import AdminLayout from '@/components/layout/AdminLayout';

interface PendingUser {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  walletAddress?: string;
  createdAt?: string;
  hasPendingReferral?: boolean;
  referralId?: string;
  kycStatus?: string;
  gambinoBalance?: number;
  referralStatus?: string;
  acquisitionSource?: string; // 'direct', 'link', 'qr', 'social', 'referral'
  referrerName?: string;
  referralVenueId?: string;
}

interface Venue {
  id: string;
  name: string;
  location?: string;
}

interface KycStats {
  overall: {
    totalVerifications: number;
    totalRewardsAmount: number;
    distributedCount: number;
    pendingCount: number;
    withReferrals: number;
  };
  pendingKycCount: number;
}

interface HistoryItem {
  _id: string;
  userId: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  verifiedBy: {
    firstName?: string;
    lastName?: string;
  };
  venueId: string;
  rewardAmount: number;
  hasLinkedReferral: boolean;
  createdAt: string;
}

export default function KycPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<KycStats | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Verify modal state
  const [verifyModal, setVerifyModal] = useState<{
    open: boolean;
    user: PendingUser | null;
    notes: string;
    documentType: string;
    venueId: string;
    submitting: boolean;
  }>({
    open: false,
    user: null,
    notes: '',
    documentType: 'id',
    venueId: '',
    submitting: false,
  });

  useEffect(() => {
    setMounted(true);
    // Fetch venues on mount
    loadVenues();
  }, []);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadVenues = async () => {
    try {
      const res = await api.get('/api/kyc/venues');
      setVenues(res.data.venues || []);
    } catch (err) {
      console.error('Failed to load venues:', err);
    }
  };

  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);

      if (activeTab === 'pending') {
        const [pendingRes, statsRes] = await Promise.all([
          api.get('/api/kyc/pending'),
          api.get('/api/kyc/stats'),
        ]);
        setPendingUsers(pendingRes.data.data?.users || []);
        setStats(statsRes.data.data || null);
      } else {
        const historyRes = await api.get('/api/kyc/history?limit=50');
        setHistory(historyRes.data.data?.history || []);
      }
    } catch (err) {
      console.error('Failed to load KYC data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyModal.user) return;

    if (!verifyModal.venueId) {
      alert('Please select a venue');
      return;
    }

    setVerifyModal(prev => ({ ...prev, submitting: true }));

    try {
      const res = await api.post('/api/kyc/verify', {
        userId: verifyModal.user._id,
        documentType: verifyModal.documentType,
        notes: verifyModal.notes,
        venueId: verifyModal.venueId,
      });

      // Show success message
      const userBonus = res.data.userKycBonus || 25;
      alert(`✅ KYC Verified! User received ${userBonus} GG bonus.`);

      // Close modal and refresh
      setVerifyModal({
        open: false,
        user: null,
        notes: '',
        documentType: 'id',
        venueId: '',
        submitting: false,
      });

      // Refresh data
      loadData();
    } catch (err: any) {
      console.error('Verification failed:', err);
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Verification failed';
      alert(`❌ ${errorMsg}`);

      // If already verified, close modal and refresh to update UI
      if (err?.response?.data?.error?.includes('already')) {
        setVerifyModal({
          open: false,
          user: null,
          notes: '',
          documentType: 'id',
          venueId: '',
          submitting: false,
        });
        loadData();
      } else {
        setVerifyModal(prev => ({ ...prev, submitting: false }));
      }
    }
  };

  const openVerifyModal = (user: PendingUser) => {
    // Default to first venue if available
    const defaultVenueId = venues.length > 0 ? venues[0].id : '';
    setVerifyModal({
      open: true,
      user,
      notes: '',
      documentType: 'id',
      venueId: defaultVenueId,
      submitting: false,
    });
  };

  // Filter pending users
  const filteredPending = useMemo(() => {
    return pendingUsers.filter(user =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.walletAddress?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pendingUsers, searchTerm]);

  if (loading && !mounted) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-4" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading KYC data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">KYC Verification</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Verify user identities in person
            </p>
          </div>
          <Button
            onClick={loadData}
            size="sm"
            variant="outline"
            className="border-neutral-200 dark:border-neutral-800"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Pending KYC"
              value={stats.pendingKycCount}
              icon={<Clock className="w-4 h-4" />}
              color="yellow"
            />
            <StatCard
              label="Verified"
              value={stats.overall?.totalVerifications || 0}
              icon={<CheckCircle className="w-4 h-4" />}
              color="green"
            />
            <StatCard
              label="With Referrals"
              value={stats.overall?.withReferrals || 0}
              icon={<UserCheck className="w-4 h-4" />}
              color="purple"
            />
            <StatCard
              label="Rewards Paid"
              value={`${(stats.overall?.totalRewardsAmount || 0).toLocaleString()} GG`}
              icon={<Shield className="w-4 h-4" />}
              color="blue"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'pending'
                ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            Pending ({stats?.pendingKycCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'history'
                ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            History
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder={activeTab === 'pending' ? 'Search pending users...' : 'Search history...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Content */}
        {activeTab === 'pending' ? (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin mx-auto" />
              </div>
            ) : filteredPending.length === 0 ? (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-neutral-500 dark:text-neutral-400">
                  {searchTerm ? 'No users found matching your search' : 'No pending KYC verifications'}
                </p>
              </div>
            ) : (
              filteredPending.map((user) => (
                <div
                  key={user._id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-neutral-900 font-semibold text-sm flex-shrink-0">
                      {user.firstName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-neutral-900 dark:text-white truncate">
                          {user.firstName || user.lastName
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : 'No name'}
                        </span>
                        {/* KYC Status Badge */}
                        <Badge className={`text-xs ${
                          user.kycStatus === 'verified'
                            ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                            : user.kycStatus === 'rejected'
                              ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
                              : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                        }`}>
                          {user.kycStatus === 'verified' ? '✓ KYC\'d' : user.kycStatus === 'rejected' ? '✗ Rejected' : '○ Pending'}
                        </Badge>
                        {/* Acquisition Source Badge */}
                        <Badge className={`text-xs ${
                          user.acquisitionSource === 'direct'
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            : user.acquisitionSource === 'qr'
                              ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                              : 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
                        }`}>
                          {user.acquisitionSource === 'direct' ? 'Direct signup' :
                           user.acquisitionSource === 'qr' ? 'QR code' :
                           user.acquisitionSource === 'link' ? 'Referral link' :
                           user.acquisitionSource === 'social' ? 'Social share' : 'Referred'}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                        {user.email}
                      </p>
                      {/* Referrer info */}
                      {user.referrerName && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                          Referred by: {user.referrerName}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                        <span>{user.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'No wallet'}</span>
                        <span>•</span>
                        <span className="text-yellow-600 dark:text-yellow-500 font-medium">{user.gambinoBalance?.toLocaleString() || 0} GG</span>
                        <span>•</span>
                        <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>

                    {/* Verify Button - only show if not already verified */}
                    {user.kycStatus !== 'verified' ? (
                      <Button
                        onClick={() => openVerifyModal(user)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Verify
                      </Button>
                    ) : (
                      <Badge className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 flex-shrink-0">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin mx-auto" />
              </div>
            ) : history.length === 0 ? (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center">
                <p className="text-neutral-500 dark:text-neutral-400">No verification history</p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item._id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-neutral-900 dark:text-white truncate">
                          {item.userId?.firstName || item.userId?.lastName
                            ? `${item.userId?.firstName || ''} ${item.userId?.lastName || ''}`.trim()
                            : item.userId?.email || 'Unknown'}
                        </span>
                        {item.hasLinkedReferral && (
                          <Badge className="bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-xs">
                            +Referral
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Verified by {item.verifiedBy?.firstName || 'Staff'} at {item.venueId || 'Unknown venue'}
                      </p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        {new Date(item.createdAt).toLocaleDateString()} - {item.rewardAmount} GG reward
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Verify Modal */}
      {verifyModal.open && verifyModal.user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Verify KYC
              </h2>
              <button
                onClick={() => setVerifyModal(prev => ({ ...prev, open: false, venueId: '' }))}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* User info */}
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                <p className="font-medium text-neutral-900 dark:text-white">
                  {verifyModal.user.firstName || verifyModal.user.lastName
                    ? `${verifyModal.user.firstName || ''} ${verifyModal.user.lastName || ''}`.trim()
                    : 'No name'}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {verifyModal.user.email}
                </p>
                {verifyModal.user.hasPendingReferral && (
                  <Badge className="mt-2 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                    Has Pending Referral - Will be verified!
                  </Badge>
                )}
              </div>

              {/* Venue selector */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  <Building className="w-4 h-4 inline mr-1" />
                  Verification Location *
                </label>
                <select
                  value={verifyModal.venueId}
                  onChange={(e) => setVerifyModal(prev => ({ ...prev, venueId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  required
                >
                  <option value="">Select venue...</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}{venue.location ? ` - ${venue.location}` : ''}
                    </option>
                  ))}
                </select>
                {venues.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Loading venues...
                  </p>
                )}
              </div>

              {/* Document type */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Document Type
                </label>
                <select
                  value={verifyModal.documentType}
                  onChange={(e) => setVerifyModal(prev => ({ ...prev, documentType: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  <option value="id">State ID</option>
                  <option value="license">Driver's License</option>
                  <option value="passport">Passport</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Notes (optional)
                </label>
                <Textarea
                  value={verifyModal.notes}
                  onChange={(e) => setVerifyModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g., TN Driver's License verified"
                  className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  rows={2}
                />
              </div>

              {/* Rewards info */}
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                  Rewards on verification:
                </p>
                <ul className="text-xs text-green-600 dark:text-green-500 space-y-0.5">
                  <li>• User receives: 25 GG welcome bonus</li>
                  <li>• Venue receives: 25 GG</li>
                  {verifyModal.user?.hasPendingReferral && (
                    <li>• Referral bonus: +100 GG to user, +350 GG to referrer</li>
                  )}
                </ul>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  By clicking Verify, you confirm that you have physically checked this user's ID
                  and verified they are who they claim to be and are 18+ years old.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-neutral-200 dark:border-neutral-800">
              <Button
                onClick={() => setVerifyModal(prev => ({ ...prev, open: false, venueId: '' }))}
                variant="outline"
                className="flex-1 border-neutral-200 dark:border-neutral-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerify}
                disabled={verifyModal.submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {verifyModal.submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verify KYC
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'purple' | 'green' | 'blue' | 'yellow';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    purple: 'bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400',
    green: 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-600 dark:text-yellow-400',
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{label}</p>
          <p className="text-lg font-bold text-neutral-900 dark:text-white truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}

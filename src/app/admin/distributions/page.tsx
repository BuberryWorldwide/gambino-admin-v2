'use client';

import { useState, useEffect } from 'react';
import { ArrowUpRight, TrendingUp, History, DollarSign, Wallet, Send, ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { getToken } from '@/lib/auth';

interface TreasuryAccount {
  name: string;
  address: string;
  balance: number;
  type: string;
}

interface Distribution {
  _id: string;
  venueId: string;
  venueName?: string;
  recipient: string;
  amount: number;
  signature: string;
  status: 'pending' | 'confirmed' | 'failed';
  sourceAccount: string;
  staffEmail?: string;
  metadata?: {
    reason?: string;
    notes?: string;
  };
  createdAt: string;
}

interface Stats {
  totalDistributed: number;
  transactionCount: number;
  averageAmount: number;
  period: string;
}

interface User {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

// Define role permissions (matches AdminLayout)
const rolePermissions: Record<string, string[]> = {
  super_admin: ['view_users', 'manage_users', 'view_all_stores', 'manage_all_stores', 'view_machines', 'manage_machines', 'process_cashouts', 'view_cashout_history', 'reverse_cashouts', 'system_admin'],
  gambino_ops: ['view_users', 'view_all_stores', 'manage_all_stores', 'view_machines', 'manage_machines', 'process_cashouts', 'view_cashout_history'],
  venue_manager: ['view_assigned_stores', 'manage_assigned_stores', 'view_machines', 'view_store_metrics', 'process_cashouts', 'view_cashout_history'],
  venue_staff: ['view_assigned_stores', 'view_machines', 'view_store_metrics', 'process_cashouts', 'view_cashout_history'],
};

export default function DistributionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [balances, setBalances] = useState<TreasuryAccount[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [selectedAccount, setSelectedAccount] = useState('mining');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [venueId, setVenueId] = useState('');
  const [venueName, setVenueName] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; signature?: string } | null>(null);

  // Check authentication and permissions on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getToken();
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await api.get('/api/users/profile');
        const userData = res.data.user;
        setUser(userData);

        // Check if user has system_admin permission
        const userPermissions = rolePermissions[userData.role || 'venue_staff'] || [];
        if (!userPermissions.includes('system_admin')) {
          // User doesn't have permission - keep authLoading true to show access denied
          setAuthLoading(false);
          return;
        }

        setAuthLoading(false);
      } catch (err) {
        console.error('Failed to check auth:', err);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      // Check permission again before fetching data
      const userPermissions = rolePermissions[user.role || 'venue_staff'] || [];
      if (userPermissions.includes('system_admin')) {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
      }
    }
  }, [authLoading, user]);

  const fetchData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);

    try {
      const [balancesRes, distributionsRes, statsRes] = await Promise.all([
        api.get('/api/distribution/balances'),
        api.get('/api/distribution/history?limit=10'),
        api.get('/api/distribution/stats?period=daily')
      ]);

      setBalances(balancesRes.data.balances);
      setDistributions(distributionsRes.data.distributions || []);
      setStats(statsRes.data.stats);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLoading(false);
    } finally {
      if (showRefreshIndicator) setRefreshing(false);
    }
  };

  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await api.post('/api/distribution/distribute', {
        venueId,
        venueName,
        recipient,
        amount: parseFloat(amount),
        sourceAccount: selectedAccount,
        metadata: { reason, notes }
      });

      const data = response.data;

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Successfully distributed ${formatNumber(parseFloat(amount))} GAMBINO!`,
          signature: data.signature
        });
        // Reset form
        setRecipient('');
        setAmount('');
        setVenueId('');
        setVenueName('');
        setReason('');
        setNotes('');
        fetchData(); // Refresh data
      } else {
        setMessage({ type: 'error', text: data.error || 'Distribution failed' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Network error occurred' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatNumber = (num: number) => {
    if (!num) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    }
    return num.toLocaleString();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const getAccountColor = (type: string) => {
    switch (type) {
      case 'mining': return 'bg-blue-500';
      case 'founder': return 'bg-green-500';
      case 'operations': return 'bg-amber-500';
      case 'community': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getAccountLabel = (type: string) => {
    const account = balances.find(acc => acc.type === type);
    return account ? account.name : type;
  };

  // Check if user has permission
  const hasPermission = user && rolePermissions[user.role || 'venue_staff']?.includes('system_admin');

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-gray-900 dark:text-gray-100">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  // Access denied for users without system_admin permission
  if (!hasPermission) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md">
            <CardHeader>
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <ShieldAlert className="w-8 h-8" />
                <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">Access Denied</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                You don't have permission to access the Token Distributions system.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This page requires <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">system_admin</span> permission.
                {user && (
                  <span className="block mt-2">
                    Your role: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded capitalize text-gray-900 dark:text-gray-100">{user.role?.replace('_', ' ')}</span>
                  </span>
                )}
              </p>
              <Button onClick={() => router.push('/admin/dashboard')} className="w-full">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-gray-900 dark:text-gray-100">Loading distributions...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Token Distributions</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage GAMBINO token distributions across treasury accounts</p>
          </div>
          <Button onClick={() => fetchData(true)} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Treasury Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {balances.map((account) => (
            <Card key={account.type} className="border-l-4" style={{ borderLeftColor: getAccountColor(account.type).replace('bg-', '#') }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {account.name}
                  </CardTitle>
                  <Wallet className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1 text-gray-900 dark:text-gray-100">{formatNumber(account.balance)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
                  {account.address.slice(0, 8)}...{account.address.slice(-6)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Distributed Today</CardTitle>
                  <TrendingUp className="w-5 h-5 text-green-500 dark:text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(stats.totalDistributed)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Transactions</CardTitle>
                  <ArrowUpRight className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.transactionCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Amount</CardTitle>
                  <DollarSign className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(stats.averageAmount)}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Distribution Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Send className="w-5 h-5" />
              Send Tokens
            </CardTitle>
            <CardDescription className="dark:text-gray-400">Distribute GAMBINO tokens from treasury to recipients</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDistribute} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Source Account</label>
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  >
                    {balances.map((account) => (
                      <option key={account.type} value={account.type}>
                        {account.name} ({formatNumber(account.balance)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Amount (GAMBINO)</label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1000"
                    min="0.000001"
                    step="0.000001"
                    required
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Recipient Wallet Address</label>
                <Input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="font-mono text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  placeholder="Solana wallet address (e.g., 8VegmY...)"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Venue ID</label>
                  <Input
                    type="text"
                    value={venueId}
                    onChange={(e) => setVenueId(e.target.value)}
                    placeholder="venue_123"
                    required
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Venue Name</label>
                  <Input
                    type="text"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="The Spot Casino"
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Reason</label>
                  <Input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Weekly mining rewards"
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Notes</label>
                  <Input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes"
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
                  <p className="font-medium">{message.text}</p>
                  {message.signature && (
                    <a
                      href={`https://explorer.solana.com/tx/${message.signature}?cluster=mainnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline mt-1 inline-flex items-center gap-1 hover:opacity-80"
                    >
                      View on Solana Explorer
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? 'Sending...' : 'Send Tokens'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Distributions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5" />
                <CardTitle className="text-gray-900 dark:text-gray-100">Recent Distributions</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Venue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Recipient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Transaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {distributions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No distributions yet. Send your first tokens above!
                      </td>
                    </tr>
                  ) : (
                    distributions.map((dist) => (
                      <tr key={dist._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{formatDate(dist.createdAt)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{dist.venueName || dist.venueId}</td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-700 dark:text-gray-300">
                          {dist.recipient.slice(0, 8)}...{dist.recipient.slice(-6)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-gray-100">{formatNumber(dist.amount)}</td>
                        <td className="px-6 py-4 text-sm">
                          <Badge className={getAccountColor(dist.sourceAccount)}>
                            {getAccountLabel(dist.sourceAccount)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Badge variant={
                            dist.status === 'confirmed' ? 'default' :
                            dist.status === 'failed' ? 'destructive' :
                            'secondary'
                          }>
                            {dist.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {dist.signature && (
                            <a
                              href={`https://explorer.solana.com/tx/${dist.signature}?cluster=mainnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                            >
                              View
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

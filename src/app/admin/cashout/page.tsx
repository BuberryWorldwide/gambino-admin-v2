'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, DollarSign, AlertCircle, CheckCircle2, X, Receipt, Wallet } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { getUser as getCachedUser } from '@/lib/auth';

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  username?: string;
  walletAddress?: string;
  balance: number;
  lastActivity?: string;
}

interface ExchangeRate {
  tokensPerDollar: number;
  minCashout: number;
  maxCashoutPerTransaction: number;
  dailyLimitPerCustomer: number;
  venueCommissionPercent: number;
}

interface Transaction {
  transactionId: string;
  customerName: string;
  customerEmail: string;
  tokensConverted: number;
  cashAmount: number;
  cashToCustomer: number;
  venueCommission: number;
  balanceAfter: number;
  createdAt: string;
}

export default function CashoutPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [tokensToConvert, setTokensToConvert] = useState('');
  const [notes, setNotes] = useState('');
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load exchange rate on mount
  useEffect(() => {
    loadExchangeRate();
  }, []);

  const loadExchangeRate = async () => {
    try {
      const res = await api.get('/api/cashout/exchange-rate');
      setExchangeRate(res.data.exchangeRate);
    } catch (err) {
      console.error('Failed to load exchange rate:', err);
    }
  };

  // Real-time search as user types (with 300ms delay)
  useEffect(() => {
    if (!selectedCustomer && searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchCustomers();
      }, 300);
      return () => clearTimeout(timer);
    } else if (searchQuery.length < 2) {
      setCustomers([]);
    }
  }, [searchQuery, selectedCustomer]);

  const searchCustomers = async () => {
    if (searchQuery.length < 2) {
      setCustomers([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const res = await api.get(`/api/cashout/customers/search?q=${encodeURIComponent(searchQuery)}`);
      setCustomers(res.data.customers || []);

      if (res.data.customers.length === 0) {
        setError('No customers found matching your search');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to search customers');
      setCustomers([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomers([]);
    setSearchQuery('');
    setError(null);
  };

  const calculateCashAmount = () => {
    if (!exchangeRate || !tokensToConvert) return 0;
    const tokens = parseFloat(tokensToConvert);
    return tokens / exchangeRate.tokensPerDollar;
  };

  const calculateCommission = () => {
    if (!exchangeRate) return 0;
    const cashAmount = calculateCashAmount();
    return cashAmount * (exchangeRate.venueCommissionPercent / 100);
  };

  const handlePreview = () => {
    setError(null);

    const tokens = parseFloat(tokensToConvert);

    if (!tokens || tokens <= 0) {
      setError('Please enter a valid token amount');
      return;
    }

    if (!selectedCustomer) {
      setError('Please select a customer');
      return;
    }

    if (tokens > selectedCustomer.balance) {
      setError(`Customer only has ${selectedCustomer.balance} tokens available`);
      return;
    }

    if (exchangeRate) {
      const cashAmount = calculateCashAmount();
      if (cashAmount < exchangeRate.minCashout) {
        setError(`Minimum cashout is $${exchangeRate.minCashout}`);
        return;
      }

      if (cashAmount > exchangeRate.maxCashoutPerTransaction) {
        setError(`Maximum cashout is $${exchangeRate.maxCashoutPerTransaction}`);
        return;
      }
    }

    setShowPreview(true);
  };

  const processCashout = async () => {
    if (!selectedCustomer) return;

    setLoading(true);
    setError(null);

    try {
      // Get user profile (try cache first, then API)
      let user = getCachedUser();
      if (!user) {
        const profileRes = await api.get('/api/users/profile');
        user = profileRes.data.user;
      }

      // Determine storeId based on user role
      let storeId;
      
      if (user.role === 'super_admin' || user.role === 'gambino_ops') {
        // Admins can use any venue - get first available store
        const storesRes = await api.get('/api/admin/stores');
        const stores = storesRes.data.stores || [];
        
        if (stores.length === 0) {
          throw new Error('No venues found in system. Please create a venue first.');
        }
        
        storeId = stores[0].storeId;
      } else {
        // Venue managers/staff need assigned venues
        const assignedVenues = user.assignedVenues || [];
        
        if (assignedVenues.length === 0) {
          throw new Error('No assigned venue found. Please contact administrator.');
        }
        
        storeId = assignedVenues[0];
      }

      // Process the cashout
      const res = await api.post(`/api/cashout/venues/${storeId}/process`, {
        customerId: selectedCustomer._id,
        tokensToConvert: parseFloat(tokensToConvert),
        notes
      });

      if (res.data.success) {
        setCompletedTransaction(res.data.transaction);
        setShowPreview(false);
        setSelectedCustomer(null);
        setTokensToConvert('');
        setNotes('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process cashout');
      setShowPreview(false);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setTokensToConvert('');
    setNotes('');
    setError(null);
    setShowPreview(false);
    setCompletedTransaction(null);
  };

  // Receipt Modal
  if (completedTransaction) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">Cashout Successful!</CardTitle>
              <CardDescription>Transaction completed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Transaction ID:</span>
                  <span className="font-mono font-semibold">{completedTransaction.transactionId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                  <span className="font-semibold">{completedTransaction.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tokens Converted:</span>
                  <span className="font-semibold">{completedTransaction.tokensConverted.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-green-600 dark:text-green-400 pt-2 border-t">
                  <span>Cash to Pay:</span>
                  <span>${completedTransaction.cashToCustomer.toFixed(2)}</span>
                </div>
                {completedTransaction.venueCommission > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Venue Earnings:</span>
                    <span>${completedTransaction.venueCommission.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-gray-600 dark:text-gray-400">New Balance:</span>
                  <span className="font-semibold">{completedTransaction.balanceAfter.toLocaleString()} tokens</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  className="flex-1"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Print Receipt
                </Button>
                <Button
                  onClick={resetForm}
                  className="flex-1"
                >
                  New Cashout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  // Preview Modal
  if (showPreview && selectedCustomer && exchangeRate) {
    const cashAmount = calculateCashAmount();
    const commission = calculateCommission();
    const cashToCustomer = cashAmount - commission;
    const newBalance = selectedCustomer.balance - parseFloat(tokensToConvert);

    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirm Cashout</CardTitle>
              <CardDescription>Please review the details before proceeding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                  <span className="font-semibold">{selectedCustomer.fullName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Current Balance:</span>
                  <span className="font-semibold">{selectedCustomer.balance.toLocaleString()} tokens</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tokens to Convert:</span>
                  <span className="font-semibold">{parseFloat(tokensToConvert).toLocaleString()} tokens</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Exchange Rate:</span>
                  <span className="font-semibold">{exchangeRate.tokensPerDollar} tokens = $1</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-green-600 dark:text-green-400 pt-2 border-t">
                  <span>Cash Amount:</span>
                  <span>${cashToCustomer.toFixed(2)}</span>
                </div>
                {commission > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Venue Earnings ({exchangeRate.venueCommissionPercent}%):</span>
                    <span>${commission.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-gray-600 dark:text-gray-400">New Balance:</span>
                  <span className="font-semibold">{newBalance.toLocaleString()} tokens</span>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ This action cannot be undone. Please verify all details before confirming.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowPreview(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={processCashout}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : `Pay $${cashToCustomer.toFixed(2)}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  // Main Cashout Form
  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Token Cashout</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Process customer token to cash conversions
          </p>
        </div>

        {error && !showPreview && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 dark:text-red-100">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-5 h-5 text-red-600" />
            </button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 1: Find Customer</CardTitle>
            <CardDescription>
              Search by name, email, phone, username, or wallet address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Start typing to search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
                disabled={!!selectedCustomer}
                autoFocus
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
                </div>
              )}
            </div>

            {/* Real-time Search Results */}
            {customers.length > 0 && !selectedCustomer && (
              <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {customers.map((customer) => (
                  <div
                    key={customer._id}
                    onClick={() => selectCustomer(customer)}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{customer.fullName}</p>
                        <div className="space-y-0.5 mt-1">
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            ✉️ {customer.email}
                          </p>
                          {customer.phone && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              📞 {customer.phone}
                            </p>
                          )}
                          {customer.username && (
                            <p className="text-sm text-gray-500">
                              @{customer.username}
                            </p>
                          )}
                          {customer.walletAddress && customer.walletAddress !== 'No wallet' && (
                            <p className="text-xs text-gray-500 font-mono truncate flex items-center gap-1">
                              <Wallet className="w-3 h-3" />
                              {customer.walletAddress.slice(0, 8)}...{customer.walletAddress.slice(-6)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 whitespace-nowrap">
                          {customer.balance.toLocaleString()} tokens
                        </Badge>
                        {customer.lastActivity && (
                          <p className="text-xs text-gray-500 mt-1">
                            Last seen: {new Date(customer.lastActivity).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Customer Display */}
            {selectedCustomer && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">{selectedCustomer.fullName}</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">{selectedCustomer.email}</p>
                    {selectedCustomer.phone && (
                      <p className="text-sm text-blue-700 dark:text-blue-300">📞 {selectedCustomer.phone}</p>
                    )}
                    {selectedCustomer.walletAddress && selectedCustomer.walletAddress !== 'No wallet' && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-mono mt-1 flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        {selectedCustomer.walletAddress.slice(0, 12)}...{selectedCustomer.walletAddress.slice(-8)}
                      </p>
                    )}
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-2 font-semibold">
                      Balance: {selectedCustomer.balance.toLocaleString()} tokens
                    </p>
                  </div>
                  <Button
                    onClick={resetForm}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedCustomer && exchangeRate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 2: Enter Amount</CardTitle>
              <CardDescription>
                Exchange rate: {exchangeRate.tokensPerDollar} tokens = $1.00
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tokens to Convert
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0"
                    value={tokensToConvert}
                    onChange={(e) => setTokensToConvert(e.target.value)}
                    className="text-lg pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    tokens
                  </span>
                </div>
                {tokensToConvert && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    = ${calculateCashAmount().toFixed(2)} USD
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes (Optional)
                </label>
                <Input
                  placeholder="Add any notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button
                onClick={handlePreview}
                className="w-full"
                size="lg"
                disabled={!tokensToConvert || parseFloat(tokensToConvert) <= 0}
              >
                <DollarSign className="w-5 h-5 mr-2" />
                Review Cashout
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
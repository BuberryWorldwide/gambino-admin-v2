'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import AdminLayout from '@/components/layout/AdminLayout';
import api from '@/lib/api';
import { anonymizeTransactions } from '@/lib/demoAnonymizer';
import { getUser as getCachedUser } from '@/lib/auth';
import { User } from '@/types';
import { SortableHeader, useSort, sortData } from '@/components/ui/sortable-header';

interface Transaction {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  type: string;
  amount: number;
  usdAmount: number;
  status: string;
  txHash: string;
  createdAt: string;
  metadata?: {
    storeId?: string;
    staffMemberId?: string;
    exchangeRate?: number;
    cashToCustomer?: number;
    venueCommission?: number;
    transactionId?: string;
    notes?: string;
    reversed?: boolean;
    reversedAt?: string;
    reversalReason?: string;
  };
}

interface Summary {
  totalTransactions: number;
  totalTokensConverted: number;
  totalCashPaid: number;
  totalCommission: number;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

export default function TransactionsPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = mounted ? resolvedTheme === 'dark' : false;

  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sorting
  const { sortConfig, handleSort } = useSort('createdAt', 'desc');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('completed');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load user profile (try cache first)
  useEffect(() => {
    const loadUser = async () => {
      // Try cached user first (no API call)
      const cachedUser = getCachedUser();
      if (cachedUser) {
        setUser(cachedUser);
        return;
      }

      try {
        const res = await api.get('/api/users/profile');
        setUser(res.data.user);
      } catch (err: any) {
        setError('Failed to load user profile');
        console.error('Load user error:', err);
      }
    };
    loadUser();
  }, []);

  // Load transactions
  useEffect(() => {
    if (!user) return;

    const loadTransactions = async () => {
      try {
        setLoading(true);
        setError('');

        // Get first assigned venue
        const storeId = user.assignedVenues?.[0];
        if (!storeId) {
          setError('No venue assigned to your account');
          setLoading(false);
          return;
        }

        // Build query params
        const params: any = {
          limit,
          offset: (currentPage - 1) * limit,
          status
        };

        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const res = await api.get(`/api/cashout/venues/${storeId}/history`, { params });

        // Anonymize transaction user data in demo mode
        const txnData = anonymizeTransactions(res.data.transactions);
        setTransactions(txnData);
        setSummary(res.data.summary);
        setPagination(res.data.pagination);
      } catch (err: any) {
        console.error('Load transactions error:', err);
        setError(err.response?.data?.error || 'Failed to load transaction history');
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [user, currentPage, limit, status, startDate, endDate]);

  // Filter and sort transactions (client-side)
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(txn => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const fullName = `${txn.userId.firstName} ${txn.userId.lastName}`.toLowerCase();
      const email = txn.userId.email?.toLowerCase() || '';
      const phone = txn.userId.phone?.toLowerCase() || '';
      const transactionId = txn.metadata?.transactionId?.toLowerCase() || '';

      return (
        fullName.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        transactionId.includes(query)
      );
    });

    // Custom comparators
    const customComparators: Record<string, (a: Transaction, b: Transaction) => number> = {
      'transactionId': (a, b) => {
        const aId = a.metadata?.transactionId || a.txHash;
        const bId = b.metadata?.transactionId || b.txHash;
        return aId.localeCompare(bId);
      },
      'customer': (a, b) => {
        const aName = `${a.userId.firstName} ${a.userId.lastName}`;
        const bName = `${b.userId.firstName} ${b.userId.lastName}`;
        return aName.localeCompare(bName);
      },
      'createdAt': (a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      },
      'amount': (a, b) => a.amount - b.amount,
      'usdAmount': (a, b) => a.usdAmount - b.usdAmount,
      'status': (a, b) => {
        const statusOrder: Record<string, number> = { completed: 0, pending: 1, failed: 2 };
        const aStatus = a.metadata?.reversed ? 3 : (statusOrder[a.status] ?? 4);
        const bStatus = b.metadata?.reversed ? 3 : (statusOrder[b.status] ?? 4);
        return aStatus - bStatus;
      },
    };

    return sortData(filtered, sortConfig, customComparators);
  }, [transactions, searchQuery, sortConfig]);

  // Export to CSV
  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('No transactions to export');
      return;
    }

    const headers = [
      'Transaction ID',
      'Date',
      'Customer Name',
      'Customer Email',
      'Tokens Converted',
      'Cash Amount',
      'Venue Earnings',
      'Exchange Rate',
      'Status',
      'Notes'
    ];

    const rows = filteredTransactions.map(txn => [
      txn.metadata?.transactionId || txn.txHash,
      new Date(txn.createdAt).toLocaleString(),
      `${txn.userId.firstName} ${txn.userId.lastName}`,
      txn.userId.email,
      txn.amount,
      txn.usdAmount.toFixed(2),
      (txn.metadata?.venueCommission || 0).toFixed(2),
      txn.metadata?.exchangeRate || 0,
      txn.status,
      txn.metadata?.notes || ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashout-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Set default date range (last 7 days)
  useEffect(() => {
    if (!startDate) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
    }
    if (!endDate) {
      setEndDate(new Date().toISOString().split('T')[0]);
    }
  }, []);

  return (
    <AdminLayout user={user}>
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Transaction History</h1>
            <p className="text-sm text-gray-600 mt-1">View and export cashout transactions</p>
          </div>

          <button
            onClick={exportToCSV}
            disabled={filteredTransactions.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg shadow p-4 sm:p-5">
              <p className="text-xs sm:text-sm text-gray-600">Total Transactions</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                {summary.totalTransactions}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 sm:p-5">
              <p className="text-xs sm:text-sm text-gray-600">Tokens Converted</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">
                {summary.totalTokensConverted.toLocaleString()}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 sm:p-5">
              <p className="text-xs sm:text-sm text-gray-600">Cash Paid Out</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">
                ${summary.totalCashPaid.toFixed(2)}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 sm:p-5">
              <p className="text-xs sm:text-sm text-gray-600">Venue Earnings</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600 mt-1">
                ${summary.totalCommission.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Filters</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="all">All</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Name, email, phone, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
              <p className="text-sm text-gray-600 mt-2">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-600 mt-2">No transactions found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <SortableHeader
                          label="Transaction ID"
                          sortKey="transactionId"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                          className="text-xs uppercase tracking-wider"
                        />
                      </th>
                      <th className="px-6 py-3 text-left">
                        <SortableHeader
                          label="Date"
                          sortKey="createdAt"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                          className="text-xs uppercase tracking-wider"
                        />
                      </th>
                      <th className="px-6 py-3 text-left">
                        <SortableHeader
                          label="Customer"
                          sortKey="customer"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                          className="text-xs uppercase tracking-wider"
                        />
                      </th>
                      <th className="px-6 py-3 text-left">
                        <SortableHeader
                          label="Tokens"
                          sortKey="amount"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                          className="text-xs uppercase tracking-wider"
                        />
                      </th>
                      <th className="px-6 py-3 text-left">
                        <SortableHeader
                          label="Cash Amount"
                          sortKey="usdAmount"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                          className="text-xs uppercase tracking-wider"
                        />
                      </th>
                      <th className="px-6 py-3 text-left">
                        <SortableHeader
                          label="Status"
                          sortKey="status"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          isDark={isDark}
                          className="text-xs uppercase tracking-wider"
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTransactions.map((txn) => (
                      <tr key={txn._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {txn.metadata?.transactionId || txn.txHash.slice(0, 12)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(txn.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {txn.userId.firstName} {txn.userId.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{txn.userId.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {txn.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ${txn.usdAmount.toFixed(2)}
                          </div>
                          {txn.metadata?.venueCommission ? (
                            <div className="text-xs text-gray-500">
                              Venue Earnings: ${txn.metadata.venueCommission.toFixed(2)}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {txn.metadata?.reversed ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Reversed
                            </span>
                          ) : txn.status === 'completed' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {txn.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-gray-200">
                {filteredTransactions.map((txn) => (
                  <div key={txn._id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {txn.userId.firstName} {txn.userId.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{txn.userId.email}</p>
                      </div>
                      {txn.metadata?.reversed ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Reversed
                        </span>
                      ) : txn.status === 'completed' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {txn.status}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Transaction ID:</span>
                        <p className="font-mono text-gray-900">
                          {txn.metadata?.transactionId || txn.txHash.slice(0, 12)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <p className="text-gray-900">
                          {new Date(txn.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Tokens:</span>
                        <p className="text-gray-900">{txn.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Cash:</span>
                        <p className="font-medium text-gray-900">${txn.usdAmount.toFixed(2)}</p>
                      </div>
                    </div>

                    {txn.metadata?.notes && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Notes:</span> {txn.metadata.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * limit, pagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.total}</span> results
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>

                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 border rounded-md text-sm font-medium ${
                                currentPage === page
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === pagination.pages}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

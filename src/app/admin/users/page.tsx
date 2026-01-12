// src/app/admin/users/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Search, UserPlus, Shield, Building, DollarSign, Calendar, RefreshCw, Users, AlertCircle, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { anonymizeUsers } from '@/lib/demoAnonymizer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/layout/AdminLayout';
import { SortableHeader, useSort, sortData } from '@/components/ui/sortable-header';

interface User {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive?: boolean;
  assignedVenues?: string[];
  gambinoBalance?: number;
  cachedGambinoBalance?: number;
  createdAt?: string;
}

export default function UsersPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = mounted ? resolvedTheme === 'dark' : false;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting
  const { sortConfig, handleSort } = useSort('createdAt', 'desc');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setError(null);
      const { data } = await api.get('/api/admin/users');
      // Anonymize user data in demo mode
      const userData = anonymizeUsers(data.users || []);
      setUsers(userData);
    } catch (err) {
      console.error('Failed to load users:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let filtered = users.filter(user =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Custom comparators
    const customComparators: Record<string, (a: User, b: User) => number> = {
      'name': (a, b) => {
        const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email;
        const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email;
        return aName.localeCompare(bName);
      },
      'role': (a, b) => {
        const roleOrder: Record<string, number> = { super_admin: 0, gambino_ops: 1, venue_manager: 2, venue_staff: 3, user: 4 };
        return (roleOrder[a.role] ?? 5) - (roleOrder[b.role] ?? 5);
      },
      'balance': (a, b) => {
        const aBalance = a.cachedGambinoBalance || a.gambinoBalance || 0;
        const bBalance = b.cachedGambinoBalance || b.gambinoBalance || 0;
        return aBalance - bBalance;
      },
      'createdAt': (a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aDate - bDate;
      },
    };

    return sortData(filtered, sortConfig, customComparators);
  }, [users, searchTerm, sortConfig]);

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300',
      gambino_ops: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300',
      venue_manager: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300',
      venue_staff: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300',
      user: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
    };
    return colors[role] || colors.user;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      gambino_ops: 'Operations',
      venue_manager: 'Manager',
      venue_staff: 'Staff',
      user: 'User',
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-4" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading users...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="max-w-md mx-auto mt-12 px-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Failed to Load Users</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">{error}</p>
            <Button onClick={loadUsers} className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900">
              Try Again
            </Button>
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
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Users</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {filteredUsers.length} total
            </p>
          </div>
          <Button
            onClick={() => router.push('/admin/users/new')}
            size="sm"
            className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Create</span>
          </Button>
        </div>

        {/* Stats - 2x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Admins"
            value={users.filter((u: User) => ['super_admin', 'gambino_ops'].includes(u.role)).length}
            icon={<Shield className="w-4 h-4" />}
            color="purple"
          />
          <StatCard
            label="Managers"
            value={users.filter((u: User) => u.role === 'venue_manager').length}
            icon={<Building className="w-4 h-4" />}
            color="green"
          />
          <StatCard
            label="Active"
            value={users.filter((u: User) => u.isActive !== false).length}
            icon={<Users className="w-4 h-4" />}
            color="blue"
          />
          <StatCard
            label="Balance"
            value={users.reduce((sum: number, u: User) => sum + (u.cachedGambinoBalance || u.gambinoBalance || 0), 0).toLocaleString()}
            icon={<DollarSign className="w-4 h-4" />}
            color="yellow"
          />
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
            />
          </div>
          {/* Sort options */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">Sort:</span>
            <SortableHeader
              label="Name"
              sortKey="name"
              currentSort={sortConfig}
              onSort={handleSort}
              isDark={isDark}
              className="text-xs"
            />
            <SortableHeader
              label="Role"
              sortKey="role"
              currentSort={sortConfig}
              onSort={handleSort}
              isDark={isDark}
              className="text-xs"
            />
            <SortableHeader
              label="Balance"
              sortKey="balance"
              currentSort={sortConfig}
              onSort={handleSort}
              isDark={isDark}
              className="text-xs"
            />
            <SortableHeader
              label="Created"
              sortKey="createdAt"
              currentSort={sortConfig}
              onSort={handleSort}
              isDark={isDark}
              className="text-xs"
            />
          </div>
        </div>

        {/* User Cards - Mobile First */}
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center">
              <p className="text-neutral-500 dark:text-neutral-400">
                {searchTerm ? 'No users found matching your search' : 'No users found'}
              </p>
            </div>
          ) : (
            filteredUsers.map((user: User) => (
              <button
                key={user._id}
                onClick={() => router.push(`/admin/users/${user._id}`)}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 text-left hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-neutral-900 font-semibold text-sm flex-shrink-0">
                    {user.firstName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-neutral-900 dark:text-white truncate">
                        {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'No name'}
                      </span>
                      <Badge className={`${getRoleBadgeColor(user.role)} text-xs px-1.5 py-0 flex-shrink-0`}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                      {user.email}
                    </p>
                    {/* Stats row */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className={user.isActive !== false ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {user.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                      {(user.cachedGambinoBalance || user.gambinoBalance) ? (
                        <span className="font-mono">
                          {(user.cachedGambinoBalance || user.gambinoBalance || 0).toLocaleString()} tokens
                        </span>
                      ) : null}
                      {user.assignedVenues && user.assignedVenues.length > 0 && (
                        <span>{user.assignedVenues.length} venue{user.assignedVenues.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
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

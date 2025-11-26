// src/app/admin/users/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, Mail, Shield, Building, DollarSign, Edit, Calendar, RefreshCw, Users, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AdminLayout from '@/components/layout/AdminLayout';

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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setError(null);
      const { data } = await api.get('/api/admin/users');
      const loadedUsers = data.users || [];
      loadedUsers.sort((a: User, b: User) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setUsers(loadedUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortByOldest = () => {
    const sorted = [...users].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    });
    setUsers(sorted);
    setSortOrder('oldest');
  };

  const sortByNewest = () => {
    const sorted = [...users].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    setUsers(sorted);
    setSortOrder('newest');
  };

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
      venue_manager: 'Venue Manager',
      venue_staff: 'Venue Staff',
      user: 'User',
    };
    return labels[role] || role;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'gambino_ops':
        return <Shield className="w-3 h-3" />;
      case 'venue_manager':
      case 'venue_staff':
        return <Building className="w-3 h-3" />;
      default:
        return null;
    }
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
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Users</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {filteredUsers.length} total user{filteredUsers.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            onClick={() => router.push('/admin/users/new')}
            className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Admins"
            value={users.filter((u: User) => ['super_admin', 'gambino_ops'].includes(u.role)).length}
            icon={<Shield className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            label="Managers"
            value={users.filter((u: User) => u.role === 'venue_manager').length}
            icon={<Building className="w-5 h-5" />}
            color="green"
          />
          <StatCard
            label="Active Users"
            value={users.filter((u: User) => u.isActive !== false).length}
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="Total Balance"
            value={users.reduce((sum: number, u: User) => sum + (u.cachedGambinoBalance || u.gambinoBalance || 0), 0).toLocaleString()}
            icon={<DollarSign className="w-5 h-5" />}
            color="yellow"
          />
        </div>

        {/* Search & Sort */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search by name, email, or role..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={sortByNewest}
                className={`h-10 border-neutral-200 dark:border-neutral-700 ${
                  sortOrder === 'newest'
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Calendar className="w-4 h-4 mr-1.5" />
                Newest
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={sortByOldest}
                className={`h-10 border-neutral-200 dark:border-neutral-700 ${
                  sortOrder === 'oldest'
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Calendar className="w-4 h-4 mr-1.5" />
                Oldest
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                  <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium">User</TableHead>
                  <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium">Role</TableHead>
                  <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium hidden md:table-cell">Venues</TableHead>
                  <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium hidden lg:table-cell">Joined</TableHead>
                  <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium">Status</TableHead>
                  <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium hidden sm:table-cell">Balance</TableHead>
                  <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="text-neutral-500 dark:text-neutral-400">
                        {searchTerm ? 'No users found matching your search' : 'No users found'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user: User) => (
                    <TableRow
                      key={user._id}
                      className="border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-neutral-900 font-semibold text-sm">
                            {user.firstName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-neutral-900 dark:text-white font-medium truncate">
                              {user.firstName || user.lastName ? `${user.firstName} ${user.lastName}`.trim() : '—'}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getRoleBadgeColor(user.role)} text-xs font-medium px-2 py-0.5`}>
                          <span className="flex items-center gap-1">
                            {getRoleIcon(user.role)}
                            {getRoleLabel(user.role)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {user.assignedVenues && user.assignedVenues.length > 0 ? (
                          <span className="text-neutral-700 dark:text-neutral-300 text-sm font-medium">
                            {user.assignedVenues.length}
                          </span>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-500">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {user.createdAt ? (
                          <div className="text-sm">
                            <div className="text-neutral-700 dark:text-neutral-300">
                              {new Date(user.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-500">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          user.isActive !== false
                            ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                        }`}>
                          {user.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-neutral-900 dark:text-white font-mono text-sm">
                          {(user.cachedGambinoBalance || user.gambinoBalance || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => router.push(`/admin/users/${user._id}`)}
                          variant="outline"
                          size="sm"
                          className="h-8 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1.5" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium">{label}</p>
          <p className="text-xl font-bold text-neutral-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

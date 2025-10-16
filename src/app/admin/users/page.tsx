// src/app/admin/users/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  UserPlus,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Download,
  Mail,
  Shield,
  Store as StoreIcon,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import type { User, Store } from '@/types';
import { UserDialog } from './components/UserDialog';
import { BulkActionsBar } from './components/BulkActionsBar';

export default function UsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Load current user client-side only to avoid hydration issues
  useEffect(() => {
    setCurrentUser(getUser());
  }, []);

  // Load data
  useEffect(() => {
    loadUsers();
    loadStores();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/admin/users');
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const { data } = await api.get('/api/admin/stores');
      setStores(data.stores || []);
    } catch (err) {
      console.error('Failed to load stores:', err);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        false;

      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.isActive !== false) ||
        (statusFilter === 'inactive' && user.isActive === false);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.isActive !== false).length,
      admins: users.filter((u) =>
        ['super_admin', 'gambino_ops'].includes(u.role)
      ).length,
      venueManagers: users.filter((u) => u.role === 'venue_manager').length,
      venueStaff: users.filter((u) => u.role === 'venue_staff').length,
      players: users.filter((u) => u.role === 'user').length,
    };
  }, [users]);

  // Handlers
  const handleCreateUser = () => {
    setEditingUser(null);
    setIsCreating(true);
    setShowUserDialog(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsCreating(false);
    setShowUserDialog(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.delete(`/api/admin/users/${userId}`);
      setUsers(users.filter((u) => {
        const uId = u._id || u.id;
        return uId !== userId;
      }));
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Failed to delete user');
    }
  };

  const handleToggleStatus = async (user: User) => {
    const userId = user._id || user.id;
    if (!userId) return;

    try {
      // Backend uses PUT, not PATCH
      await api.put(`/api/admin/users/${userId}`, {
        isActive: !(user.isActive !== false),
      });
      setUsers(
        users.map((u) => {
          const uId = u._id || u.id;
          return uId === userId
            ? { ...u, isActive: !(user.isActive !== false) }
            : u;
        })
      );
    } catch (err) {
      console.error('Failed to toggle user status:', err);
      alert('Failed to update user status');
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(
        filteredUsers
          .map((u) => u._id || u.id)
          .filter((id): id is string => !!id)
      );
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) return;

    try {
      if (action === 'activate') {
        await api.post('/api/admin/users/bulk-activate', {
          userIds: selectedUsers,
        });
        setUsers(
          users.map((u) => {
            const uId = u._id || u.id;
            return uId && selectedUsers.includes(uId) 
              ? { ...u, isActive: true } 
              : u;
          })
        );
      } else if (action === 'deactivate') {
        await api.post('/api/admin/users/bulk-deactivate', {
          userIds: selectedUsers,
        });
        setUsers(
          users.map((u) => {
            const uId = u._id || u.id;
            return uId && selectedUsers.includes(uId)
              ? { ...u, isActive: false }
              : u;
          })
        );
      } else if (action === 'delete') {
        if (!confirm(`Delete ${selectedUsers.length} users?`)) return;
        await api.post('/api/admin/users/bulk-delete', {
          userIds: selectedUsers,
        });
        setUsers(
          users.filter((u) => {
            const uId = u._id || u.id;
            return !uId || !selectedUsers.includes(uId);
          })
        );
      }

      setSelectedUsers([]);
    } catch (err) {
      console.error('Bulk action failed:', err);
      alert('Failed to perform bulk action');
    }
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Email', 'Role', 'Status', 'Venues', 'Created'].join(','),
      ...filteredUsers.map((u) =>
        [
          `"${u.firstName || ''} ${u.lastName || ''}"`,
          u.email || '',
          u.role || 'user',
          u.isActive !== false ? 'Active' : 'Inactive',
          u.assignedVenues?.length || 0,
          u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Helper functions
  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      gambino_ops: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      venue_manager: 'bg-green-500/10 text-green-400 border-green-500/20',
      venue_staff: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      user: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    };
    return colors[role] || colors.user;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      gambino_ops: 'Operations',
      venue_manager: 'Venue Manager',
      venue_staff: 'Venue Staff',
      user: 'Player',
    };
    return labels[role] || role;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <AdminLayout user={currentUser}>
        <div className="flex items-center justify-center h-screen">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout user={currentUser}>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Users Management</h1>
            <p className="text-gray-400 mt-1">
              Manage user accounts, roles, and venue access
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadUsers}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button onClick={handleCreateUser} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Create User
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {stats.active}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">
                Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">
                {stats.admins}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">
                Managers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                {stats.venueManagers}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">
                Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                {stats.venueStaff}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">
                Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-400">
                {stats.players}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="gambino_ops">Operations</SelectItem>
                  <SelectItem value="venue_manager">Venue Manager</SelectItem>
                  <SelectItem value="venue_staff">Venue Staff</SelectItem>
                  <SelectItem value="user">Player</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions Bar */}
        {selectedUsers.length > 0 && (
          <BulkActionsBar
            selectedCount={selectedUsers.length}
            onAction={handleBulkAction}
            onClear={() => setSelectedUsers([])}
          />
        )}

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedUsers.length === filteredUsers.length &&
                        filteredUsers.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Venues</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-gray-400">
                        No users found matching your filters
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const userId = user._id || user.id || '';
                    return (
                      <TableRow key={userId}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.includes(userId)}
                            onCheckedChange={() => handleSelectUser(userId)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
                              {user.firstName?.charAt(0) || ''}
                              {user.lastName?.charAt(0) || ''}
                            </div>
                            <div>
                              <div className="font-medium">
                                {user.firstName || ''} {user.lastName || ''}
                              </div>
                              <div className="text-sm text-gray-400">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getRoleBadgeColor(user.role)}
                          >
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.isActive !== false ? (
                            <Badge
                              variant="outline"
                              className="bg-green-500/10 text-green-400 border-green-500/20"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-gray-500/10 text-gray-400 border-gray-500/20"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.assignedVenues && user.assignedVenues.length > 0 ? (
                            <div className="flex items-center gap-1 text-sm">
                              <StoreIcon className="w-3 h-3 text-gray-400" />
                              <span>{user.assignedVenues.length} venues</span>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">
                            {(
                              user.cachedGambinoBalance ||
                              user.gambinoBalance ||
                              0
                            ).toLocaleString()}{' '}
                            <span className="text-gray-500">GG</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-400">
                          {user.createdAt ? formatDate(user.createdAt) : '—'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(user)}
                              >
                                {user.isActive !== false ? (
                                  <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(`mailto:${user.email}`)
                                }
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteUser(userId)}
                                className="text-red-400"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="text-sm text-gray-400 text-center">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* User Dialog */}
      {showUserDialog && (
        <UserDialog
          user={editingUser}
          stores={stores}
          isOpen={showUserDialog}
          onClose={() => {
            setShowUserDialog(false);
            setEditingUser(null);
          }}
          onSave={() => {
            loadUsers();
            setShowUserDialog(false);
            setEditingUser(null);
          }}
          isCreating={isCreating}
        />
      )}
    </AdminLayout>
  );
}
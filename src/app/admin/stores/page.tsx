// src/app/admin/stores/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Mail,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  TrendingUp,
  DollarSign,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import api from '@/lib/api';
import type { Store } from '@/types';
import { StoreDialog } from './components/StoreDialog';

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch stores
  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/stores');
      setStores(response.data.stores || []);
      setFilteredStores(response.data.stores || []);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  // Filter stores
  useEffect(() => {
    let result = [...stores];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (store) =>
          store.storeName?.toLowerCase().includes(query) ||
          store.city?.toLowerCase().includes(query) ||
          store.state?.toLowerCase().includes(query) ||
          store.storeId?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((store) => store.status === statusFilter);
    }

    // State filter
    if (stateFilter !== 'all') {
      result = result.filter((store) => store.state === stateFilter);
    }

    setFilteredStores(result);
  }, [searchQuery, statusFilter, stateFilter, stores]);

  // Get unique states - filter out undefined/null values
  const uniqueStates = Array.from(
    new Set(stores.map((store) => store.state).filter((state): state is string => !!state))
  ).sort();

  // Open create dialog
  const handleCreate = () => {
    setSelectedStore(null);
    setIsCreating(true);
    setDialogOpen(true);
  };

  // Open edit dialog
  const handleEdit = (store: Store) => {
    setSelectedStore(store);
    setIsCreating(false);
    setDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async (storeId: string) => {
    if (!confirm('Are you sure you want to delete this venue?')) return;

    try {
      await api.delete(`/api/admin/stores/${storeId}`);
      fetchStores();
    } catch (error) {
      console.error('Failed to delete store:', error);
      alert('Failed to delete venue. It may have associated machines.');
    }
  };

  // Close dialog and refresh
  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedStore(null);
  };

  const handleSave = () => {
    setDialogOpen(false);
    setSelectedStore(null);
    fetchStores();
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-500/10 text-green-400 border-green-500/20',
      inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          styles[status as keyof typeof styles] || styles.inactive
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Stats
  const stats = {
    total: stores.length,
    active: stores.filter((s) => s.status === 'active').length,
    inactive: stores.filter((s) => s.status === 'inactive').length,
    pending: stores.filter((s) => s.status === 'pending').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Venues</h1>
          <p className="text-gray-400 mt-1">
            Manage venue locations and settings
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Venue
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Venues</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active</p>
              <p className="text-2xl font-bold mt-1 text-green-400">
                {stats.active}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pending</p>
              <p className="text-2xl font-bold mt-1 text-yellow-400">
                {stats.pending}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Inactive</p>
              <p className="text-2xl font-bold mt-1 text-gray-400">
                {stats.inactive}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-500/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by state" />
            </SelectTrigger>
                              <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {uniqueStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            Loading venues...
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No venues found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Fee %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredStores.map((store) => (
                  <tr
                    key={store.storeId}
                    className="hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{store.storeName}</div>
                        <div className="text-sm text-gray-400 font-mono">
                          {store.storeId}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          {store.address && (
                            <div className="text-gray-300">{store.address}</div>
                          )}
                          <div className="text-gray-400">
                            {store.city}, {store.state} {store.zipCode}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        {store.contactName && (
                          <div className="text-gray-300">{store.contactName}</div>
                        )}
                        {store.contactPhone && (
                          <div className="flex items-center gap-1 text-gray-400">
                            <Phone className="w-3 h-3" />
                            {store.contactPhone}
                          </div>
                        )}
                        {!store.contactPhone && store.phone && (
                          <div className="flex items-center gap-1 text-gray-400">
                            <Phone className="w-3 h-3" />
                            {store.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">
                        {(store.feePercentage ?? 5).toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(store.status || 'active')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(store)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(store.storeId)}
                            className="text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Store Dialog */}
      <StoreDialog
        store={selectedStore}
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        onSave={handleSave}
        isCreating={isCreating}
      />
    </div>
  );
}
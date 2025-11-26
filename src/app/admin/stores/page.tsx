// src/app/admin/stores/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Store as StoreIcon, MapPin, Activity, DollarSign, Eye, RefreshCw, AlertCircle } from 'lucide-react';
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

interface Store {
  _id: string;
  storeId: string;
  storeName: string;
  city: string;
  state: string;
  status: 'active' | 'inactive' | 'pending';
  hubsCount?: number;
  machinesCount?: number;
  totalRevenue?: number;
  address?: string;
}

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setError(null);
      const { data } = await api.get('/api/admin/stores');
      setStores(data.stores || []);
    } catch (err) {
      console.error('Failed to load stores:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load stores';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = stores.filter(store =>
    store.storeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.storeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.state?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300';
      case 'inactive':
        return 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300';
      default:
        return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-4" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading venues...</p>
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
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Failed to Load Venues</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">{error}</p>
            <Button onClick={loadStores} className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900">
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
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Venues</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {filteredStores.length} total venue{filteredStores.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={loadStores}
            className="border-neutral-200 dark:border-neutral-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active"
            value={stores.filter(s => s.status === 'active').length}
            icon={<Activity className="w-5 h-5" />}
            color="green"
          />
          <StatCard
            label="Inactive"
            value={stores.filter(s => s.status === 'inactive').length}
            icon={<Activity className="w-5 h-5" />}
            color="red"
          />
          <StatCard
            label="Pending"
            value={stores.filter(s => s.status === 'pending').length}
            icon={<Activity className="w-5 h-5" />}
            color="yellow"
          />
          <StatCard
            label="Total Revenue"
            value={`$${stores.reduce((sum, s) => sum + (s.totalRevenue || 0), 0).toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5" />}
            color="blue"
          />
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search venues by name, ID, city, or state..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                  <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium">Venue</TableHead>
                  <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium hidden sm:table-cell">ID</TableHead>
                  <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium">Location</TableHead>
                  <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium">Status</TableHead>
                  <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium hidden md:table-cell">Hubs</TableHead>
                  <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium hidden lg:table-cell">Machines</TableHead>
                  <TableHead className="text-neutral-600 dark:text-neutral-300 font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="text-neutral-500 dark:text-neutral-400">
                        {searchTerm ? 'No venues found matching your search' : 'No venues found'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStores.map((store) => (
                    <TableRow
                      key={store._id}
                      className="border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-neutral-900">
                            <StoreIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-neutral-900 dark:text-white font-medium truncate">
                              {store.storeName}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="font-mono text-sm text-neutral-600 dark:text-neutral-400">
                          {store.storeId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="truncate">
                            {store.city && store.state
                              ? `${store.city}, ${store.state}`
                              : store.city || store.state || '—'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(store.status)} text-xs font-medium px-2 py-0.5`}>
                          {getStatusLabel(store.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {store.hubsCount !== undefined ? (
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">{store.hubsCount}</span>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-500">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {store.machinesCount !== undefined ? (
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">{store.machinesCount}</span>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-500">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => router.push(`/admin/stores/${store.storeId}`)}
                          variant="outline"
                          size="sm"
                          className="h-8 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          View
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
  color: 'green' | 'red' | 'yellow' | 'blue';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400',
    red: 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-600 dark:text-yellow-400',
    blue: 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
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

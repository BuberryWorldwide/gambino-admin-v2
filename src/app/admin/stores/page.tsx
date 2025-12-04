// src/app/admin/stores/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Search, Store as StoreIcon, MapPin, Activity, DollarSign, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/layout/AdminLayout';
import { SortableHeader, useSort, sortData, SortConfig } from '@/components/ui/sortable-header';

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
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = mounted ? resolvedTheme === 'dark' : false;

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting
  const { sortConfig, handleSort } = useSort('storeName', 'asc');

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Filter and sort stores
  const filteredStores = useMemo(() => {
    let filtered = stores.filter(store =>
      store.storeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.storeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.state?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Custom comparators
    const customComparators: Record<string, (a: Store, b: Store) => number> = {
      'location': (a, b) => {
        const aLoc = `${a.city || ''}, ${a.state || ''}`.trim();
        const bLoc = `${b.city || ''}, ${b.state || ''}`.trim();
        return aLoc.localeCompare(bLoc);
      },
      'status': (a, b) => {
        const statusOrder = { active: 0, pending: 1, inactive: 2 };
        return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
      },
    };

    return sortData(filtered, sortConfig, customComparators);
  }, [stores, searchTerm, sortConfig]);

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
      <div className="p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Venues</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {filteredStores.length} total
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadStores}
            className="border-neutral-200 dark:border-neutral-800"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats - 2x2 grid on mobile */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Active"
            value={stores.filter(s => s.status === 'active').length}
            icon={<Activity className="w-4 h-4" />}
            color="green"
          />
          <StatCard
            label="Inactive"
            value={stores.filter(s => s.status === 'inactive').length}
            icon={<Activity className="w-4 h-4" />}
            color="red"
          />
          <StatCard
            label="Pending"
            value={stores.filter(s => s.status === 'pending').length}
            icon={<Activity className="w-4 h-4" />}
            color="yellow"
          />
          <StatCard
            label="Revenue"
            value={`$${stores.reduce((sum, s) => sum + (s.totalRevenue || 0), 0).toLocaleString()}`}
            icon={<DollarSign className="w-4 h-4" />}
            color="blue"
          />
        </div>

        {/* Search and Sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search venues..."
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
              sortKey="storeName"
              currentSort={sortConfig}
              onSort={handleSort}
              isDark={isDark}
              className="text-xs"
            />
            <SortableHeader
              label="Location"
              sortKey="location"
              currentSort={sortConfig}
              onSort={handleSort}
              isDark={isDark}
              className="text-xs"
            />
            <SortableHeader
              label="Status"
              sortKey="status"
              currentSort={sortConfig}
              onSort={handleSort}
              isDark={isDark}
              className="text-xs"
            />
            <SortableHeader
              label="Revenue"
              sortKey="totalRevenue"
              currentSort={sortConfig}
              onSort={handleSort}
              isDark={isDark}
              className="text-xs"
            />
          </div>
        </div>

        {/* Venue Cards - Mobile First */}
        <div className="space-y-3">
          {filteredStores.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center">
              <p className="text-neutral-500 dark:text-neutral-400">
                {searchTerm ? 'No venues found matching your search' : 'No venues found'}
              </p>
            </div>
          ) : (
            filteredStores.map((store) => (
              <button
                key={store._id}
                onClick={() => router.push(`/admin/stores/${store.storeId}`)}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 text-left hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-neutral-900 flex-shrink-0">
                    <StoreIcon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-neutral-900 dark:text-white truncate">
                        {store.storeName}
                      </span>
                      <Badge className={`${getStatusColor(store.status)} text-xs px-1.5 py-0 flex-shrink-0`}>
                        {getStatusLabel(store.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        {store.city && store.state
                          ? `${store.city}, ${store.state}`
                          : store.city || store.state || 'No location'}
                      </span>
                    </div>
                    {/* Stats row */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {store.hubsCount !== undefined && (
                        <span>{store.hubsCount} hub{store.hubsCount !== 1 ? 's' : ''}</span>
                      )}
                      {store.machinesCount !== undefined && (
                        <span>{store.machinesCount} machine{store.machinesCount !== 1 ? 's' : ''}</span>
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

'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Store {
  _id: string;
  storeId: string;
  storeName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  feePercentage: number;
  ownerUserId?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export default function StoreEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const storeId = id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [store, setStore] = useState<Store | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    storeName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    feePercentage: 5,
    ownerUserId: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
  });

  // Load store data
  useEffect(() => {
    loadStore();
  }, [storeId]);

  const loadStore = async () => {
    try {
      setLoading(true);
      setError('');

      const { data } = await api.get(`/api/admin/stores/${storeId}`);
      const storeData = data.store;

      setStore(storeData);
      setFormData({
        storeName: storeData.storeName || '',
        address: storeData.address || '',
        city: storeData.city || '',
        state: storeData.state || '',
        zipCode: storeData.zipCode || '',
        phone: storeData.phone || '',
        feePercentage: storeData.feePercentage || 5,
        ownerUserId: storeData.ownerUserId || '',
        status: storeData.status || 'active',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load store';
      setError(errorMessage);
      console.error('Load store error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saving) return;

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      // Prepare payload with only allowed fields
      const payload = {
        storeName: formData.storeName.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim(),
        phone: formData.phone.trim(),
        feePercentage: Math.max(0, Math.min(100, Number(formData.feePercentage))),
        ownerUserId: formData.ownerUserId?.trim() || undefined,
        status: formData.status,
      };

      const { data } = await api.put(`/api/admin/stores/${storeId}`, payload);

      if (data.success) {
        setSuccessMessage('Venue updated successfully!');
        setStore(data.store);

        // Redirect back to store details after 1.5 seconds
        setTimeout(() => {
          router.push(`/admin/stores/${storeId}`);
        }, 1500);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update store';
      setError(errorMessage);
      console.error('Update store error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-4" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading venue...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !store) {
    return (
      <AdminLayout>
        <div className="max-w-md mx-auto mt-12 px-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Failed to Load Venue</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={loadStore} className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-2 mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Venue
          </button>

          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-1">
            Edit Venue
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Store ID: <span className="font-mono text-neutral-700 dark:text-neutral-300">{storeId}</span>
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="text-green-600 dark:text-green-400 w-5 h-5 flex-shrink-0" />
            <span className="text-green-700 dark:text-green-300 text-sm">{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 w-5 h-5 flex-shrink-0" />
            <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Store Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Venue Name *
              </label>
              <Input
                type="text"
                value={formData.storeName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('storeName', e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                required
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Address
              </label>
              <Input
                type="text"
                value={formData.address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('address', e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                placeholder="123 Main Street"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                City *
              </label>
              <Input
                type="text"
                value={formData.city}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('city', e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                required
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                State *
              </label>
              <Input
                type="text"
                value={formData.state}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('state', e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                placeholder="TN"
                maxLength={2}
                required
              />
            </div>

            {/* ZIP Code */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                ZIP Code
              </label>
              <Input
                type="text"
                value={formData.zipCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('zipCode', e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                placeholder="37203"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Phone
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('phone', e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                placeholder="(615) 555-0123"
              />
            </div>

            {/* Revenue Split */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Platform Share (%)
              </label>
              <Input
                type="number"
                value={formData.feePercentage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('feePercentage', e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                min="0"
                max="100"
                step="0.1"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Venue Share: {100 - Number(formData.feePercentage)}% of revenue
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Owner User ID (optional) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Owner User ID (Optional)
              </label>
              <Input
                type="text"
                value={formData.ownerUserId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('ownerUserId', e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-mono text-sm"
                placeholder="MongoDB ObjectId"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Leave empty if no specific owner is assigned
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
              className="border-neutral-200 dark:border-neutral-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>

        {/* Metadata */}
        {store && (
          <div className="mt-6 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-3">Venue Metadata</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-neutral-500 dark:text-neutral-500">Created:</span>
                <span className="ml-2 text-neutral-700 dark:text-neutral-300">
                  {new Date(store.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-500">Last Updated:</span>
                <span className="ml-2 text-neutral-700 dark:text-neutral-300">
                  {new Date(store.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

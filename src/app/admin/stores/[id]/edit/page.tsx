'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

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
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch(
        `https://api.gambino.gold/api/admin/stores/${storeId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load store: ${response.statusText}`);
      }

      const data = await response.json();
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
    } catch (err: any) {
      setError(err.message || 'Failed to load store');
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
      const token = localStorage.getItem('adminToken');
      
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

      const response = await fetch(
        `https://api.gambino.gold/api/admin/stores/${storeId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update store');
      }

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Store updated successfully!');
        setStore(data.store);
        
        // Redirect back to store details after 1.5 seconds
        setTimeout(() => {
          router.push(`/admin/stores/${storeId}`);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update store');
      console.error('Update store error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-400">Loading store...</div>
      </div>
    );
  }

  if (error && !store) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-400 w-5 h-5" />
            <span className="text-red-400">{error}</span>
          </div>
          <button
            onClick={() => router.back()}
            className="mt-4 text-gray-400 hover:text-white flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </button>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            Edit Venue
          </h1>
          <p className="text-gray-400">
            Store ID: <span className="text-gray-300 font-mono">{storeId}</span>
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-900/20 border border-green-700/30 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="text-green-400 w-5 h-5" />
            <span className="text-green-400">{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-700/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-400 w-5 h-5" />
            <span className="text-red-400">{error}</span>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Store Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Store Name *
              </label>
              <input
                type="text"
                value={formData.storeName}
                onChange={(e) => handleInputChange('storeName', e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-600"
                required
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-600"
                placeholder="123 Main Street"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                City *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-600"
                required
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                State *
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-600"
                placeholder="TN"
                maxLength={2}
                required
              />
            </div>

            {/* ZIP Code */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-600"
                placeholder="37203"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-600"
                placeholder="(615) 555-0123"
              />
            </div>

            {/* Fee Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Gambino Fee (%)
              </label>
              <input
                type="number"
                value={formData.feePercentage}
                onChange={(e) => handleInputChange('feePercentage', e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-600"
                min="0"
                max="100"
                step="0.1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Venue keeps {100 - Number(formData.feePercentage)}% of revenue
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-600"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Owner User ID (optional) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Owner User ID (Optional)
              </label>
              <input
                type="text"
                value={formData.ownerUserId}
                onChange={(e) => handleInputChange('ownerUserId', e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-600 font-mono text-sm"
                placeholder="MongoDB ObjectId"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty if no specific owner is assigned
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-800">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-black font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Metadata */}
        {store && (
          <div className="mt-6 bg-gray-900/30 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Store Metadata</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Created:</span>
                <span className="ml-2 text-gray-300">
                  {new Date(store.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Last Updated:</span>
                <span className="ml-2 text-gray-300">
                  {new Date(store.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
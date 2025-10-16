// src/app/admin/stores/components/StoreDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import type { Store } from '@/types';

interface StoreDialogProps {
  store: Store | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isCreating: boolean;
}

export function StoreDialog({
  store,
  isOpen,
  onClose,
  onSave,
  isCreating,
}: StoreDialogProps) {
  const [formData, setFormData] = useState({
    storeId: '',
    storeName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    contactName: '',
    contactPhone: '',
    feePercentage: 5,
    status: 'active' as string,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // US States
  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  useEffect(() => {
    if (store) {
      setFormData({
        storeId: store.storeId || '',
        storeName: store.storeName || '',
        address: store.address || '',
        city: store.city || '',
        state: store.state || '',
        zipCode: store.zipCode || '',
        phone: store.phone || '',
        contactName: store.contactName || '',
        contactPhone: store.contactPhone || '',
        feePercentage: store.feePercentage || 5,
        status: store.status || 'active',
      });
    } else {
      setFormData({
        storeId: '',
        storeName: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        contactName: '',
        contactPhone: '',
        feePercentage: 5,
        status: 'active',
      });
    }
    setError('');
  }, [store, isOpen]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const generateStoreId = () => {
    const city = formData.city.toLowerCase().replace(/[^a-z0-9]/g, '');
    const name = formData.storeName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
    const random = Math.random().toString(36).substring(2, 6);
    return `store_${city}_${name}_${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.storeName) {
      setError('Store name is required');
      return;
    }

    if (!formData.city || !formData.state) {
      setError('City and state are required');
      return;
    }

    if (formData.feePercentage < 0 || formData.feePercentage > 100) {
      setError('Fee percentage must be between 0 and 100');
      return;
    }

    try {
      setSaving(true);

      if (isCreating) {
        // Generate storeId if not provided
        const storeId = formData.storeId || generateStoreId();

        await api.post('/api/admin/stores/create', {
          storeId,
          storeName: formData.storeName,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          phone: formData.phone,
          contactName: formData.contactName,
          contactPhone: formData.contactPhone,
          feePercentage: formData.feePercentage,
          status: formData.status,
        });
      } else {
        // Update existing store
        await api.put(`/api/admin/stores/${store?.storeId}`, {
          storeName: formData.storeName,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          phone: formData.phone,
          contactName: formData.contactName,
          contactPhone: formData.contactPhone,
          feePercentage: formData.feePercentage,
          status: formData.status,
        });
      }

      onSave();
    } catch (err: any) {
      console.error('Save store error:', err);
      setError(
        err.response?.data?.error || `Failed to ${isCreating ? 'create' : 'update'} store`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? 'Add New Venue' : 'Edit Venue'}
          </DialogTitle>
          <DialogDescription>
            {isCreating
              ? 'Add a new venue location to the system'
              : 'Update venue information and settings'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Basic Information</h3>

            {isCreating && (
              <div className="space-y-2">
                <Label htmlFor="storeId">
                  Store ID (Optional - auto-generated if empty)
                </Label>
                <Input
                  id="storeId"
                  value={formData.storeId}
                  onChange={(e) => handleChange('storeId', e.target.value)}
                  placeholder="store_cityname_venuename_xxxx"
                  className="font-mono"
                />
                <p className="text-xs text-gray-400">
                  Leave empty to auto-generate based on venue name
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="storeName">
                Venue Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="storeName"
                value={formData.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                placeholder="Gallatin Nimbus"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">
                  City <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Nashville"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">
                  State <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => handleChange('state', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleChange('zipCode', e.target.value)}
                  placeholder="37201"
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Venue Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(615) 555-1234"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Contact Information</h3>

            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => handleChange('contactName', e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => handleChange('contactPhone', e.target.value)}
                placeholder="(615) 555-5678"
              />
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="font-medium">Settings</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feePercentage">
                  Fee Percentage <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="feePercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.feePercentage}
                  onChange={(e) =>
                    handleChange('feePercentage', parseFloat(e.target.value))
                  }
                  required
                />
                <p className="text-xs text-gray-400">
                  Default is 5% - Gambino's cut of net revenue
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending Setup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>{isCreating ? 'Create Venue' : 'Save Changes'}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
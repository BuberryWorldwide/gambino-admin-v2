// src/app/admin/users/components/UserDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Store as StoreIcon } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import type { User, Store } from '@/types';

interface UserDialogProps {
  user: User | null;
  stores: Store[];
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isCreating: boolean;
}

export function UserDialog({
  user,
  stores,
  isOpen,
  onClose,
  onSave,
  isCreating,
}: UserDialogProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'user' as User['role'],
    assignedVenues: [] as string[],
    password: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Initialize form data
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'user',
        assignedVenues: user.assignedVenues || [],
        password: '',
        confirmPassword: '',
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'user',
        assignedVenues: [],
        password: '',
        confirmPassword: '',
      });
    }
    setError('');
  }, [user, isOpen]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleVenueToggle = (storeId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedVenues: prev.assignedVenues.includes(storeId)
        ? prev.assignedVenues.filter((id) => id !== storeId)
        : [...prev.assignedVenues, storeId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.firstName || !formData.lastName) {
      setError('First and last name are required');
      return;
    }

    if (!formData.email || !formData.email.includes('@')) {
      setError('Valid email is required');
      return;
    }

    if (isCreating) {
      if (!formData.password || formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    // Role-specific validation
    if (
      ['venue_manager', 'venue_staff'].includes(formData.role) &&
      formData.assignedVenues.length === 0
    ) {
      setError(`${formData.role === 'venue_manager' ? 'Venue managers' : 'Venue staff'} must be assigned to at least one venue`);
      return;
    }

    if (
      ['user', 'gambino_ops', 'super_admin'].includes(formData.role) &&
      formData.assignedVenues.length > 0
    ) {
      // Clear venues for roles that don't use them
      formData.assignedVenues = [];
    }

    try {
      setSaving(true);

      if (isCreating) {
        // Create new user
        await api.post('/api/admin/users', {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone,
          role: formData.role,
          assignedVenues: formData.assignedVenues,
          password: formData.password,
        });
      } else {
        // Update existing user - Backend uses PUT, not PATCH!
        const userId = user?._id || user?.id;
        await api.put(`/api/admin/users/${userId}`, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone,
          role: formData.role,
          assignedVenues: formData.assignedVenues,
        });
      }

      onSave();
    } catch (err: any) {
      console.error('Save user error:', err);
      setError(
        err.response?.data?.error || `Failed to ${isCreating ? 'create' : 'update'} user`
      );
    } finally {
      setSaving(false);
    }
  };

  const getRoleDescription = (role: string) => {
    const descriptions: Record<string, string> = {
      super_admin: 'Full system access and control',
      gambino_ops: 'Operations access to all venues',
      venue_manager: 'Manage assigned venues and their staff',
      venue_staff: 'Access assigned venues (read-only)',
      user: 'Regular player account',
    };
    return descriptions[role] || '';
  };

  const requiresVenues = ['venue_manager', 'venue_staff'].includes(formData.role);
  const canHaveVenues = requiresVenues;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? 'Create New User' : 'Edit User'}
          </DialogTitle>
          <DialogDescription>
            {isCreating
              ? 'Add a new user to the system with appropriate role and permissions'
              : 'Update user information, role, and venue assignments'}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="John"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-400">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="john.doe@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          {/* Password (Create Only) */}
          {isCreating && (
            <div className="space-y-4">
              <h3 className="font-medium">Security</h3>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleChange('confirmPassword', e.target.value)
                  }
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </div>
          )}

          {/* Role Selection */}
          <div className="space-y-4">
            <h3 className="font-medium">Role & Permissions</h3>

            <div className="space-y-2">
              <Label htmlFor="role">
                Role <span className="text-red-400">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  handleChange('role', value as User['role'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Player</SelectItem>
                  <SelectItem value="venue_staff">Venue Staff</SelectItem>
                  <SelectItem value="venue_manager">Venue Manager</SelectItem>
                  <SelectItem value="gambino_ops">Operations</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-400">
                {getRoleDescription(formData.role)}
              </p>
            </div>
          </div>

          {/* Venue Assignment */}
          {canHaveVenues && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  Venue Assignment {requiresVenues && <span className="text-red-400">*</span>}
                </h3>
                <Badge variant="outline">
                  {formData.assignedVenues.length} selected
                </Badge>
              </div>

              {stores.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-700 rounded-lg">
                  No venues available
                </div>
              ) : (
                <div className="border border-gray-700 rounded-lg divide-y divide-gray-700 max-h-60 overflow-y-auto">
                  {stores.map((store) => (
                    <label
                      key={store.storeId}
                      className="flex items-center gap-3 p-3 hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={formData.assignedVenues.includes(
                          store.storeId
                        )}
                        onCheckedChange={() =>
                          handleVenueToggle(store.storeId)
                        }
                      />
                      <StoreIcon className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <div className="font-medium">{store.storeName}</div>
                        <div className="text-sm text-gray-400">
                          {store.city}, {store.state}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          store.status === 'active'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                        }
                      >
                        {store.status}
                      </Badge>
                    </label>
                  ))}
                </div>
              )}

              {requiresVenues && formData.assignedVenues.length === 0 && (
                <p className="text-sm text-yellow-400">
                  ⚠️ This role requires at least one venue assignment
                </p>
              )}
            </div>
          )}

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
                <>{isCreating ? 'Create User' : 'Save Changes'}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
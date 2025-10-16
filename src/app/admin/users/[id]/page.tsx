'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, X, Shield, Building, Mail, Phone, User as UserIcon, CheckCircle, XCircle, Search } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AdminLayout from '@/components/layout/AdminLayout';

interface User {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: string;
  isActive?: boolean;
  assignedVenues?: string[];
  gambinoBalance?: number;
}

interface Store {
  _id: string;
  storeId: string;
  storeName: string;
  city: string;
  state: string;
  status: string;
}

export default function UserEditPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'user',
    isActive: true,
    assignedVenues: [] as string[],
  });

  useEffect(() => {
    loadUser();
    loadStores();
  }, [userId]);

  const loadUser = async () => {
    try {
      const { data } = await api.get(`/api/admin/users/${userId}`);
      const userData = data.user || data;
      setUser(userData);
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        role: userData.role || 'user',
        isActive: userData.isActive !== false,
        assignedVenues: userData.assignedVenues || [],
      });
    } catch (err) {
      console.error('Failed to load user:', err);
      setError('Failed to load user data');
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

  const handleSave = async () => {
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
    
    // Role-specific validation
    if (['venue_manager', 'venue_staff'].includes(formData.role) && formData.assignedVenues.length === 0) {
      setError(`${formData.role === 'venue_manager' ? 'Venue managers' : 'Venue staff'} must be assigned to at least one venue`);
      return;
    }
    
    setSaving(true);
    try {
      await api.put(`/api/admin/users/${userId}`, formData);
      router.push('/admin/users');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const toggleStore = (storeId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedVenues: prev.assignedVenues.includes(storeId)
        ? prev.assignedVenues.filter(id => id !== storeId)
        : [...prev.assignedVenues, storeId]
    }));
  };

  const selectAllStores = () => {
    setFormData({...formData, assignedVenues: stores.map(s => s.storeId)});
  };

  const clearAllStores = () => {
    setFormData({...formData, assignedVenues: []});
  };

  const filteredStores = stores.filter(store =>
    store.storeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.storeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showStoreTab = ['venue_manager', 'venue_staff'].includes(formData.role);

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/20',
      gambino_ops: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20',
      venue_manager: 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-500/20',
      venue_staff: 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-500/20',
      user: 'bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400 border-gray-500/20',
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 dark:border-yellow-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading user...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">User not found</p>
            <Button onClick={() => router.push('/admin/users')}>
              Back to Users
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex items-start gap-4">
              <Button
                onClick={() => router.push('/admin/users')}
                variant="outline"
                size="sm"
                className="mt-1 border-gray-300 dark:border-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Edit User
                </h1>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 dark:from-yellow-300 dark:to-yellow-500 flex items-center justify-center text-gray-900 font-bold text-lg shadow-md">
                    {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </p>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <Mail className="w-3.5 h-3.5" />
                      {user.email}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Badge className={`${getRoleColor(formData.role)} border text-base px-4 py-2`}>
              {getRoleLabel(formData.role)}
            </Badge>
          </div>

          {/* Error Message */}
          {error && (
            <Card className="p-4 mb-6 bg-red-500/10 border-red-500/20">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
              </div>
            </Card>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-3 font-medium transition-all relative ${
                activeTab === 'details'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Details
              {activeTab === 'details' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500 dark:bg-yellow-400"></div>
              )}
            </button>
            {showStoreTab && (
              <button
                onClick={() => setActiveTab('stores')}
                className={`px-6 py-3 font-medium transition-all relative ${
                  activeTab === 'stores'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Store Access ({formData.assignedVenues.length})
                {activeTab === 'stores' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500 dark:bg-yellow-400"></div>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <Card className="p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-gray-700 dark:text-gray-300">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-gray-700 dark:text-gray-300">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                      placeholder="user@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300">
                    Phone
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-gray-700 dark:text-gray-300">
                    Role <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({...formData, role: value})}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="venue_staff">Venue Staff</SelectItem>
                      <SelectItem value="venue_manager">Venue Manager</SelectItem>
                      <SelectItem value="gambino_ops">Gambino Ops</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Account Status</Label>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                      {formData.isActive ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formData.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Store Assignment Tab */}
        {activeTab === 'stores' && showStoreTab && (
          <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assigned Stores</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {formData.assignedVenues.length} of {stores.length} stores selected
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={selectAllStores}
                    variant="outline"
                    size="sm"
                    className="border-gray-300 dark:border-gray-700"
                  >
                    Select All
                  </Button>
                  <Button
                    onClick={clearAllStores}
                    variant="outline"
                    size="sm"
                    className="border-gray-300 dark:border-gray-700"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search stores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="p-6 space-y-2 max-h-[500px] overflow-y-auto">
              {filteredStores.map((store) => {
                const isAssigned = formData.assignedVenues.includes(store.storeId);
                return (
                  <label
                    key={store.storeId}
                    className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
                      isAssigned
                        ? 'bg-yellow-500/10 dark:bg-yellow-400/10 border-yellow-500/30 dark:border-yellow-400/30'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={() => toggleStore(store.storeId)}
                      className="w-5 h-5 text-yellow-600 dark:text-yellow-400 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-yellow-500 dark:focus:ring-yellow-400"
                    />
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{store.storeName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {store.storeId} • {store.city}, {store.state}
                          </p>
                        </div>
                        <Badge className={
                          store.status === 'active'
                            ? 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border border-red-500/20'
                        }>
                          {store.status}
                        </Badge>
                      </div>
                    </div>
                  </label>
                );
              })}
              {filteredStores.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'No stores found matching your search' : 'No stores available'}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Save Button */}
        <div className="mt-8 flex justify-end gap-3 sticky bottom-4">
          <Button 
            onClick={() => router.push('/admin/users')} 
            variant="outline"
            className="border-gray-300 dark:border-gray-700"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-400 dark:hover:bg-yellow-500 text-gray-900 shadow-md"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
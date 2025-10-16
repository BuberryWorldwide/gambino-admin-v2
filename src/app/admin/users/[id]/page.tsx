'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/layout/AdminLayout';

export default function UserEditPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [user, setUser] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [searchTerm, setSearchTerm] = useState('');
  
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const { data } = await api.get('/api/admin/stores');
      setStores(data.stores || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/api/admin/users/${userId}`, formData);
      alert('User updated successfully!');
      router.push('/users');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update user');
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

  const filteredStores = stores.filter(store =>
    store.storeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.storeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showStoreTab = ['venue_manager', 'venue_staff'].includes(formData.role);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-white">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Edit User</h1>
            <p className="text-gray-400 mt-1">{user?.email}</p>
          </div>
          <Button onClick={() => router.push('/users')} variant="outline">
            Back
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-yellow-400 border-b-2 border-yellow-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Details
          </button>
          {showStoreTab && (
            <button
              onClick={() => setActiveTab('stores')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'stores'
                  ? 'text-yellow-400 border-b-2 border-yellow-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Store Access ({formData.assignedVenues.length})
            </button>
          )}
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <Card className="p-6 bg-gray-900 border-gray-800">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                >
                  <option value="user">User</option>
                  <option value="venue_staff">Venue Staff</option>
                  <option value="venue_manager">Venue Manager</option>
                  <option value="gambino_ops">Gambino Ops</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({...formData, isActive: e.target.value === 'active'})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </Card>
        )}

        {/* Store Assignment Tab */}
        {activeTab === 'stores' && showStoreTab && (
          <Card className="bg-gray-900 border-gray-800">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Assigned Stores</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {formData.assignedVenues.length} of {stores.length} stores selected
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setFormData({...formData, assignedVenues: stores.map(s => s.storeId)})}
                    variant="outline"
                    size="sm"
                  >
                    Select All
                  </Button>
                  <Button
                    onClick={() => setFormData({...formData, assignedVenues: []})}
                    variant="outline"
                    size="sm"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              <Input
                placeholder="Search stores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="p-6 space-y-2 max-h-96 overflow-y-auto">
              {filteredStores.map((store) => {
                const isAssigned = formData.assignedVenues.includes(store.storeId);
                return (
                  <label
                    key={store.storeId}
                    className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                      isAssigned
                        ? 'bg-yellow-900/20 border-yellow-600/50'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={() => toggleStore(store.storeId)}
                      className="w-5 h-5 text-yellow-600 bg-gray-700 border-gray-600 rounded"
                    />
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{store.storeName}</p>
                          <p className="text-sm text-gray-400">
                            {store.storeId} • {store.city}, {store.state}
                          </p>
                        </div>
                        <Badge className={store.status === 'active' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}>
                          {store.status}
                        </Badge>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </Card>
        )}

        {/* Save Button */}
        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={() => router.push('/users')} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-yellow-600 hover:bg-yellow-700">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Save, X, Mail, Phone, User as UserIcon,
  CheckCircle, XCircle, Search, Wallet, Coins, Calendar,
  Clock, Copy, Check, Shield, ShieldCheck, ShieldX,
  Building, Gift, AlertTriangle, FileText, RefreshCw
} from 'lucide-react';
import api from '@/lib/api';
import { anonymizeUser, anonymizeStores } from '@/lib/demoAnonymizer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import axios from 'axios';
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
  cachedGambinoBalance?: number;
  walletAddress?: string;
  createdAt?: string;
  lastActivity?: string;
  walletCreatedAt?: string;
  walletType?: 'generated' | 'connected';
  dateOfBirth?: string;
  ageVerified?: boolean;
  ageVerifiedAt?: string;
  ageVerifiedBy?: string;
  // KYC fields
  kycStatus?: 'pending' | 'verified' | 'rejected' | 'expired';
  kycVerifiedAt?: string;
  kycVerifiedBy?: { firstName?: string; lastName?: string; email?: string };
  kycVerifiedAtVenue?: string;
  kycVerificationMethod?: string;
  kycNotes?: string;
  // Referral info
  referredBy?: string;
  referralCode?: string;
}

interface ReferralInfo {
  _id: string;
  referrerId: { firstName?: string; lastName?: string; email?: string };
  status: string;
  code: string;
  createdAt: string;
  kycCompletedAt?: string;
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
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [verifyingAge, setVerifyingAge] = useState(false);
  const [kycVerifying, setKycVerifying] = useState(false);
  const [kycModal, setKycModal] = useState({
    open: false,
    notes: '',
    documentType: 'id'
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'user',
    isActive: true,
    assignedVenues: [] as string[],
    ageVerified: false,
  });

  useEffect(() => {
    loadUser();
    loadStores();
    loadReferralInfo();
  }, [userId]);

  const loadUser = async () => {
    try {
      const { data } = await api.get(`/api/admin/users/${userId}`);
      const rawUserData = data.user || data;
      // Anonymize user data in demo mode
      const userData = anonymizeUser(rawUserData);
      // Map isAgeVerified to ageVerified for frontend consistency
      userData.ageVerified = rawUserData.isAgeVerified || rawUserData.ageVerified || false;
      userData.ageVerifiedAt = rawUserData.ageVerifiedAt;
      userData.ageVerifiedBy = rawUserData.ageVerifiedBy;
      setUser(userData);
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        role: userData.role || 'user',
        isActive: userData.isActive !== false,
        assignedVenues: rawUserData.assignedVenues || [], // Keep real venue IDs for internal use
        ageVerified: userData.isAgeVerified || userData.ageVerified || false,
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
      // Anonymize store data in demo mode
      const storeData = anonymizeStores(data.stores || []);
      setStores(storeData);
    } catch (err) {
      console.error('Failed to load stores:', err);
    }
  };

  const loadReferralInfo = async () => {
    try {
      const { data } = await api.get(`/api/admin/users/${userId}/referral`);
      if (data.referral) {
        setReferralInfo(data.referral);
      }
    } catch (err) {
      // User might not have a referral, that's ok
      console.log('No referral info found');
    }
  };

  const handleKycVerify = async () => {
    if (!user) return;
    setKycVerifying(true);
    setError('');
    try {
      await api.post('/api/kyc/verify', {
        userId: user._id,
        documentType: kycModal.documentType,
        notes: kycModal.notes
      });
      // Reload user data
      await loadUser();
      await loadReferralInfo();
      setKycModal({ open: false, notes: '', documentType: 'id' });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to verify KYC');
      } else {
        setError('Failed to verify KYC');
      }
    } finally {
      setKycVerifying(false);
    }
  };

  const handleSave = async () => {
    setError('');

    if (!formData.firstName || !formData.lastName) {
      setError('First and last name are required');
      return;
    }

    if (!formData.email || !formData.email.includes('@')) {
      setError('Valid email is required');
      return;
    }

    if (['venue_manager', 'venue_staff'].includes(formData.role) && formData.assignedVenues.length === 0) {
      setError(`${formData.role === 'venue_manager' ? 'Venue managers' : 'Venue staff'} must be assigned to at least one venue`);
      return;
    }

    setSaving(true);
    try {
      await api.put(`/api/admin/users/${userId}`, formData);
      router.push('/admin/users');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to update user');
      } else {
        setError('Failed to update user');
      }
    } finally {
      setSaving(false);
    }
  };

  const copyWalletAddress = () => {
    if (user?.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerifyAge = async (verified: boolean) => {
    setVerifyingAge(true);
    setError('');
    try {
      await api.post(`/api/admin/users/${userId}/verify-age`, { verified });
      // Refresh user data
      await loadUser();
      setFormData(prev => ({ ...prev, ageVerified: verified }));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to update age verification');
      } else {
        setError('Failed to update age verification');
      }
    } finally {
      setVerifyingAge(false);
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
      super_admin: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400',
      gambino_ops: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
      venue_manager: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400',
      venue_staff: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400',
      user: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
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
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-4" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading user...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 text-center max-w-md">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">User Not Found</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">The user you&apos;re looking for doesn&apos;t exist or has been removed.</p>
            <Button onClick={() => router.push('/admin/users')} className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900">
              Back to Users
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/users')}
            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-2 mb-4 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Users
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
                {user.firstName || user.lastName
                  ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                  : 'Edit User'}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getRoleColor(user.role)}>
                  {getRoleLabel(user.role)}
                </Badge>
                <Badge className={
                  user.isActive !== false
                    ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
                }>
                  {user.isActive !== false ? 'Active' : 'Inactive'}
                </Badge>
                {user.kycStatus === 'verified' && (
                  <Badge className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    KYC Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Balance"
            value={`${(user.cachedGambinoBalance || user.gambinoBalance || 0).toLocaleString()} GG`}
            icon={<Coins className="w-4 h-4" />}
            color="yellow"
          />
          <StatCard
            label="Wallet"
            value={user.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'None'}
            icon={<Wallet className="w-4 h-4" />}
            color="blue"
          />
          <StatCard
            label="Member Since"
            value={user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}
            icon={<Calendar className="w-4 h-4" />}
            color="green"
          />
          <StatCard
            label="Account Age"
            value={`${user.createdAt ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0} days`}
            icon={<Clock className="w-4 h-4" />}
            color="purple"
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
          <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')}>
            Profile Details
          </TabButton>
          <TabButton active={activeTab === 'kyc'} onClick={() => setActiveTab('kyc')}>
            <Shield className="w-4 h-4 mr-1.5" />
            KYC & Verification
            {user?.kycStatus !== 'verified' && (
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse ml-2" />
            )}
          </TabButton>
          {showStoreTab && (
            <TabButton active={activeTab === 'stores'} onClick={() => setActiveTab('stores')}>
              <Building className="w-4 h-4 mr-1.5" />
              Store Access
            </TabButton>
          )}
          <TabButton active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')}>
            <Wallet className="w-4 h-4 mr-1.5" />
            Wallet & Account
          </TabButton>
        </div>

        {/* Profile Details Tab */}
        {activeTab === 'details' && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Personal Information</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Update user profile details</p>
            </div>
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label htmlFor="firstName" className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="pl-10 h-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                      placeholder="John"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="pl-10 h-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="pl-10 h-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                      placeholder="user@example.com"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                    Phone
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="pl-10 h-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label htmlFor="role" className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                    Role <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({...formData, role: value})}
                  >
                    <SelectTrigger className="h-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
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
                <div>
                  <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">Account Status</Label>
                  <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                    <div className="flex items-center gap-2">
                      {formData.isActive ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">
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

              {/* Age Verification Section */}
              <div className="pt-5 border-t border-neutral-200 dark:border-neutral-800">
                <h4 className="font-semibold text-neutral-900 dark:text-white mb-4">Age Verification</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date of Birth Card */}
                  <div className={`p-4 rounded-xl border ${user?.dateOfBirth ? 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700' : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${user?.dateOfBirth ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-yellow-100 dark:bg-yellow-900/50'}`}>
                        <Calendar className={`w-5 h-5 ${user?.dateOfBirth ? 'text-neutral-600 dark:text-neutral-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium">Date of Birth</p>
                        <p className={`font-medium mt-0.5 ${user?.dateOfBirth ? 'text-neutral-900 dark:text-white' : 'text-yellow-700 dark:text-yellow-400'}`}>
                          {user?.dateOfBirth
                            ? new Date(user.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                            : 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Age Verification Status Card */}
                  <div className={`p-4 rounded-xl border ${
                    formData.ageVerified
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                      : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${formData.ageVerified ? 'bg-green-100 dark:bg-green-900/50' : 'bg-yellow-100 dark:bg-yellow-900/50'}`}>
                          {formData.ageVerified ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium">Status</p>
                          <p className={`font-medium mt-0.5 ${formData.ageVerified ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
                            {formData.ageVerified ? 'Verified' : 'Not Verified'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.ageVerified}
                        onCheckedChange={(checked) => handleVerifyAge(checked)}
                        disabled={verifyingAge || !user?.dateOfBirth}
                      />
                    </div>
                  </div>
                </div>

                {!user?.dateOfBirth && (
                  <p className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                    Cannot verify age - user has not provided their date of birth yet
                  </p>
                )}
                {user?.dateOfBirth && !formData.ageVerified && (
                  <p className="mt-3 text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg">
                    Toggle verification ON after physically checking user&apos;s government-issued ID confirms they are 18+
                  </p>
                )}
                {user?.ageVerifiedAt && formData.ageVerified && (
                  <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                    Verified on {new Date(user.ageVerifiedAt).toLocaleDateString()}
                    {user.ageVerifiedBy && ` by ${user.ageVerifiedBy}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* KYC & Verification Tab */}
        {activeTab === 'kyc' && (
          <div className="space-y-5">
            {/* KYC Status Card */}
            <div className={`rounded-xl p-5 ${
              user?.kycStatus === 'verified'
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-200 dark:border-green-800'
                : user?.kycStatus === 'rejected'
                ? 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-2 border-red-200 dark:border-red-800'
                : 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border-2 border-yellow-200 dark:border-yellow-800'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    user?.kycStatus === 'verified'
                      ? 'bg-green-100 dark:bg-green-900/50'
                      : user?.kycStatus === 'rejected'
                      ? 'bg-red-100 dark:bg-red-900/50'
                      : 'bg-yellow-100 dark:bg-yellow-900/50'
                  }`}>
                    {user?.kycStatus === 'verified' ? (
                      <ShieldCheck className="w-7 h-7 text-green-600 dark:text-green-400" />
                    ) : user?.kycStatus === 'rejected' ? (
                      <ShieldX className="w-7 h-7 text-red-600 dark:text-red-400" />
                    ) : (
                      <Shield className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                      {user?.kycStatus === 'verified' ? 'KYC Verified' :
                       user?.kycStatus === 'rejected' ? 'KYC Rejected' :
                       'KYC Pending'}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                      {user?.kycStatus === 'verified'
                        ? 'Identity has been verified in person'
                        : user?.kycStatus === 'rejected'
                        ? 'Identity verification was rejected'
                        : 'User has not been KYC verified yet'}
                    </p>
                    {user?.kycVerifiedAt && (
                      <p className="text-xs text-neutral-500 mt-1">
                        Verified on {new Date(user.kycVerifiedAt).toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>
                {user?.kycStatus !== 'verified' && (
                  <Button
                    onClick={() => setKycModal({ ...kycModal, open: true })}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Verify KYC Now
                  </Button>
                )}
              </div>
            </div>

            {/* Verification Details */}
            {user?.kycStatus === 'verified' && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
                  <h4 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-neutral-500" />
                    Verification Details
                  </h4>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium">Verified By</p>
                    <p className="font-medium text-neutral-900 dark:text-white mt-1">
                      {user.kycVerifiedBy?.firstName} {user.kycVerifiedBy?.lastName}
                    </p>
                    {user.kycVerifiedBy?.email && (
                      <p className="text-sm text-neutral-500 mt-0.5">{user.kycVerifiedBy.email}</p>
                    )}
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium">Venue</p>
                    <p className="font-medium text-neutral-900 dark:text-white mt-1 flex items-center gap-2">
                      <Building className="w-4 h-4 text-neutral-400" />
                      {user.kycVerifiedAtVenue || 'Unknown venue'}
                    </p>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium">Method</p>
                    <p className="font-medium text-neutral-900 dark:text-white mt-1">
                      {user.kycVerificationMethod === 'in_person' ? 'In-Person ID Check' : user.kycVerificationMethod || 'In-Person'}
                    </p>
                  </div>
                  {user.kycNotes && (
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium">Notes</p>
                      <p className="font-medium text-neutral-900 dark:text-white mt-1">{user.kycNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Referral Information */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
              <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
                <h4 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-500" />
                  Referral Information
                </h4>
              </div>
              <div className="p-5">
                {referralInfo ? (
                  <div className="space-y-4">
                    <div className="bg-purple-50 dark:bg-purple-950/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium">Referred By</p>
                          <p className="font-medium text-neutral-900 dark:text-white mt-1">
                            {referralInfo.referrerId?.firstName} {referralInfo.referrerId?.lastName}
                          </p>
                          <p className="text-sm text-neutral-500">{referralInfo.referrerId?.email}</p>
                        </div>
                        <Badge className={
                          referralInfo.status === 'distributed' ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' :
                          referralInfo.status === 'verified' ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' :
                          'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400'
                        }>
                          {referralInfo.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
                        <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">Referral Code Used</p>
                        <p className="font-mono font-medium text-neutral-900 dark:text-white mt-1">{referralInfo.code}</p>
                      </div>
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
                        <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">Referred On</p>
                        <p className="font-medium text-neutral-900 dark:text-white mt-1">
                          {new Date(referralInfo.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {referralInfo.status === 'pending' && user?.kycStatus !== 'verified' && (
                      <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-yellow-800 dark:text-yellow-200">Referral Pending KYC</p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                              This user was referred but hasn&apos;t been KYC verified yet. Once KYC is verified,
                              the referrer will receive their reward and this user will receive 25 GG welcome bonus.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                      <Gift className="w-6 h-6 text-neutral-400" />
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-400 font-medium">No referral information</p>
                    <p className="text-sm text-neutral-500 mt-1">This user signed up without a referral code</p>
                  </div>
                )}
              </div>
            </div>

            {/* User's Referral Code */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
              <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
                <h4 className="font-semibold text-neutral-900 dark:text-white">User&apos;s Referral Code</h4>
              </div>
              <div className="p-5">
                {user?.referralCode ? (
                  <div className="flex items-center gap-4">
                    <code className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg font-mono text-lg text-neutral-900 dark:text-white">
                      {user.referralCode}
                    </code>
                    <p className="text-neutral-500 text-sm">Others can use this code to sign up</p>
                  </div>
                ) : (
                  <p className="text-neutral-500">User doesn&apos;t have a referral code yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* KYC Verification Modal */}
        {kycModal.open && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  Verify KYC
                </h3>
                <button
                  onClick={() => setKycModal({ open: false, notes: '', documentType: 'id' })}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-sm text-neutral-500">{user?.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Document Type
                  </label>
                  <select
                    value={kycModal.documentType}
                    onChange={(e) => setKycModal({ ...kycModal, documentType: e.target.value })}
                    className="w-full h-10 px-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="id">Driver&apos;s License</option>
                    <option value="passport">Passport</option>
                    <option value="state_id">State ID</option>
                    <option value="military">Military ID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={kycModal.notes}
                    onChange={(e) => setKycModal({ ...kycModal, notes: e.target.value })}
                    placeholder="e.g., TN Driver's License verified"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    rows={3}
                  />
                </div>

                <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium">Rewards on verification:</p>
                  <ul className="text-sm text-green-700 dark:text-green-300 mt-2 space-y-1">
                    <li>• User receives: 25 GG welcome bonus</li>
                    <li>• Your venue receives: 25 GG</li>
                    {referralInfo && <li>• Referrer receives: tier-based reward</li>}
                  </ul>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    By clicking Verify, you confirm that you have physically checked this user&apos;s
                    government-issued ID and verified they are who they claim to be and are 18+ years old.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-5 border-t border-neutral-200 dark:border-neutral-800">
                <Button
                  onClick={() => setKycModal({ open: false, notes: '', documentType: 'id' })}
                  variant="outline"
                  className="flex-1 border-neutral-200 dark:border-neutral-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleKycVerify}
                  disabled={kycVerifying}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {kycVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Verify KYC
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Wallet & Account Tab */}
        {activeTab === 'wallet' && (
          <div className="space-y-5">
            {/* Wallet Address */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
              <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">Wallet Address</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Solana blockchain address</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                {user.walletAddress ? (
                  <div className="flex items-center gap-3">
                    <code className="flex-1 px-4 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-sm font-mono text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 break-all">
                      {user.walletAddress}
                    </code>
                    <Button
                      onClick={copyWalletAddress}
                      variant="outline"
                      size="sm"
                      className="border-neutral-200 dark:border-neutral-700 flex-shrink-0"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-1.5 text-green-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1.5" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg">
                    <Wallet className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">No wallet connected yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Token Balance & Last Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">GG Token Balance</p>
                </div>
                <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
                  {(user.cachedGambinoBalance || user.gambinoBalance || 0).toLocaleString()}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">GAMBINO Tokens</p>
              </div>

              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Last Activity</p>
                </div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {user.lastActivity
                    ? new Date(user.lastActivity).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : 'Never'
                  }
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                  {user.lastActivity
                    ? `${Math.floor((Date.now() - new Date(user.lastActivity).getTime()) / (1000 * 60 * 60 * 24))} days ago`
                    : 'No recent activity'
                  }
                </p>
              </div>
            </div>

            {/* Account Timeline */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
              <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
                <h4 className="font-semibold text-neutral-900 dark:text-white">Account Timeline</h4>
              </div>
              <div className="p-5 space-y-4">
                <TimelineItem
                  color="green"
                  label="Account Created"
                  value={user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Unknown'}
                />
                <TimelineItem
                  color="purple"
                  label="Wallet Connected"
                  value={user.walletCreatedAt
                    ? new Date(user.walletCreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Not connected'}
                />
                <TimelineItem
                  color="yellow"
                  label="Wallet Type"
                  value={user.walletType === 'generated' ? 'Platform Generated' :
                         user.walletType === 'connected' ? 'External Connected' : 'None'}
                  badge
                />
              </div>
            </div>
          </div>
        )}

        {/* Store Assignment Tab */}
        {activeTab === 'stores' && showStoreTab && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Assigned Stores</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {formData.assignedVenues.length} of {stores.length} stores selected
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={selectAllStores}
                    variant="outline"
                    size="sm"
                    className="border-neutral-200 dark:border-neutral-700"
                  >
                    Select All
                  </Button>
                  <Button
                    onClick={clearAllStores}
                    variant="outline"
                    size="sm"
                    className="border-neutral-200 dark:border-neutral-700"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="Search stores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                />
              </div>
            </div>
            <div className="p-5 space-y-2 max-h-[500px] overflow-y-auto">
              {filteredStores.map((store) => {
                const isAssigned = formData.assignedVenues.includes(store.storeId);
                return (
                  <label
                    key={store.storeId}
                    className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${
                      isAssigned
                        ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-800'
                        : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={() => toggleStore(store.storeId)}
                      className="w-5 h-5 text-yellow-600 dark:text-yellow-400 bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 rounded focus:ring-yellow-500 dark:focus:ring-yellow-400"
                    />
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">{store.storeName}</p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {store.storeId} • {store.city}, {store.state}
                          </p>
                        </div>
                        <Badge className={
                          store.status === 'active'
                            ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
                        }>
                          {store.status}
                        </Badge>
                      </div>
                    </div>
                  </label>
                );
              })}
              {filteredStores.length === 0 && (
                <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                  {searchTerm ? 'No stores found matching your search' : 'No stores available'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save Button - Sticky Footer */}
        <div className="sticky bottom-4 mt-8 flex justify-end gap-3 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-sm p-4 -mx-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <Button
            onClick={() => router.push('/admin/users')}
            variant="outline"
            className="border-neutral-200 dark:border-neutral-700"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium shadow-lg shadow-yellow-500/20"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
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

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'yellow' | 'blue' | 'green' | 'purple';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    yellow: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-600 dark:text-yellow-400',
    blue: 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium">{label}</p>
          <p className="text-lg font-bold text-neutral-900 dark:text-white truncate mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Tab Button Component
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center ${
        active
          ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
          : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
      }`}
    >
      {children}
    </button>
  );
}

// Timeline Item Component
interface TimelineItemProps {
  color: 'green' | 'purple' | 'yellow';
  label: string;
  value: string;
  badge?: boolean;
}

function TimelineItem({ color, label, value, badge }: TimelineItemProps) {
  const dotColors = {
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
  };

  const badgeColors = {
    green: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400',
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${dotColors[color]}`}></div>
        <span className="text-sm text-neutral-700 dark:text-neutral-300">{label}</span>
      </div>
      {badge ? (
        <Badge className={badgeColors[color]}>
          {value}
        </Badge>
      ) : (
        <span className="text-sm font-medium text-neutral-900 dark:text-white">{value}</span>
      )}
    </div>
  );
}

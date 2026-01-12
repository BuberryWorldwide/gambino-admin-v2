'use client';

import { useEffect, useState } from 'react';
import {
  User, Mail, Lock, Eye, EyeOff, Save, Check, AlertCircle,
  Shield, Bell, Palette, Key
} from 'lucide-react';
import api from '@/lib/api';
import { getUser as getCachedUser, isDemoMode } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import AdminLayout from '@/components/layout/AdminLayout';
import axios from 'axios';

interface UserProfile {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile form
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Try cached user first (no API call)
      let userData = getCachedUser();

      if (!userData) {
        const { data } = await api.get('/api/users/profile');
        userData = data.user || data;
      }

      setUser(userData);
      setProfileForm({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || '',
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setProfileError('');
    setProfileSuccess(false);

    if (!profileForm.firstName || !profileForm.lastName) {
      setProfileError('First and last name are required');
      return;
    }

    if (!profileForm.email || !profileForm.email.includes('@')) {
      setProfileError('Valid email is required');
      return;
    }

    setProfileSaving(true);
    try {
      await api.put('/api/users/profile', profileForm);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setProfileError(err.response?.data?.error || 'Failed to update profile');
      } else {
        setProfileError('Failed to update profile');
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (!passwordForm.currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (!passwordForm.newPassword) {
      setPasswordError('New password is required');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.put('/api/users/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setPasswordError(err.response?.data?.error || 'Failed to change password');
      } else {
        setPasswordError('Failed to change password');
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      gambino_ops: 'Operations',
      venue_manager: 'Venue Manager',
      venue_staff: 'Venue Staff',
      user: 'User',
    };
    return labels[role || ''] || 'User';
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isDemo = isDemoMode();

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-neutral-600 dark:text-neutral-400">Loading settings...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout user={user}>
      <div className="p-4 sm:p-6 lg:p-8 bg-neutral-50 dark:bg-neutral-950 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
            Settings
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'profile'
                ? 'text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-600 dark:border-yellow-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <User className="w-4 h-4" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'security'
                ? 'text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-600 dark:border-yellow-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <Lock className="w-4 h-4" />
            Security
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'system'
                  ? 'text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-600 dark:border-yellow-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              <Shield className="w-4 h-4" />
              System
            </button>
          )}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
              <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Profile Information
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  Update your personal details
                </p>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                {/* Role Badge */}
                <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                  <div className="p-2 rounded-lg bg-yellow-500/10 dark:bg-yellow-500/20">
                    <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Your Role</p>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {getRoleLabel(user?.role)}
                    </p>
                  </div>
                </div>

                {isDemo && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <Shield className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Profile changes are disabled in demo mode.
                    </p>
                  </div>
                )}

                {profileError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    <p className="text-sm text-red-800 dark:text-red-200">{profileError}</p>
                  </div>
                )}

                {profileSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                    <p className="text-sm text-green-800 dark:text-green-200">Profile updated successfully</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-neutral-700 dark:text-neutral-300">
                      First Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <Input
                        id="firstName"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                        className="pl-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="John"
                        disabled={isDemo}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-neutral-700 dark:text-neutral-300">
                      Last Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <Input
                        id="lastName"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                        className="pl-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Doe"
                        disabled={isDemo}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-neutral-700 dark:text-neutral-300">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="pl-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="you@example.com"
                      disabled={isDemo}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-neutral-700 dark:text-neutral-300">
                    Phone Number <span className="text-neutral-400">(optional)</span>
                  </Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="(555) 123-4567"
                    disabled={isDemo}
                  />
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleProfileSave}
                    disabled={profileSaving || isDemo}
                    className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {profileSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-900 mr-2"></div>
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
            </Card>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
              <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Change Password
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  Ensure your account stays secure
                </p>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                {isDemo && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <Shield className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Password changes are disabled in demo mode.
                    </p>
                  </div>
                )}

                {passwordError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    <p className="text-sm text-red-800 dark:text-red-200">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                    <p className="text-sm text-green-800 dark:text-green-200">Password changed successfully</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-neutral-700 dark:text-neutral-300">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="pl-10 pr-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Enter current password"
                      disabled={isDemo}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-neutral-700 dark:text-neutral-300">
                    New Password
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="pl-10 pr-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Enter new password"
                      disabled={isDemo}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Must be at least 8 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-neutral-700 dark:text-neutral-300">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="pl-10 bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Confirm new password"
                      disabled={isDemo}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handlePasswordChange}
                    disabled={passwordSaving || isDemo}
                    className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-900 mr-2"></div>
                        Changing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* System Tab (Super Admin Only) */}
        {activeTab === 'system' && isSuperAdmin && (
          <div className="space-y-6">
            <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
              <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  System Configuration
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  Global system settings (Super Admin only)
                </p>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                {/* Placeholder settings - these would connect to actual backend config */}
                <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 dark:bg-blue-500/20">
                      <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        System Notifications
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Send alerts for critical system events
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10 dark:bg-green-500/20">
                      <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        Maintenance Mode
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Disable access for non-admin users
                      </p>
                    </div>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 dark:bg-purple-500/20">
                      <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        Debug Mode
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Enable verbose logging and debugging tools
                      </p>
                    </div>
                  </div>
                  <Switch />
                </div>

                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    System settings are stored on the server. Changes take effect immediately.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

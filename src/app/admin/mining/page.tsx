// src/app/admin/mining/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  Plus,
  RefreshCw,
  AlertCircle,
  Gamepad2,
  Pencil,
  Trash2,
  ExternalLink,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AdminLayout from '@/components/layout/AdminLayout';

const ARCA_API_URL = process.env.NEXT_PUBLIC_ARCA_API_URL || 'https://api.arca-protocol.com';

// Color options for gradients
const COLOR_OPTIONS = [
  { value: 'pink-500', label: 'Pink', hex: '#ec4899' },
  { value: 'red-500', label: 'Red', hex: '#ef4444' },
  { value: 'orange-500', label: 'Orange', hex: '#f97316' },
  { value: 'yellow-500', label: 'Yellow', hex: '#eab308' },
  { value: 'green-500', label: 'Green', hex: '#22c55e' },
  { value: 'cyan-500', label: 'Cyan', hex: '#06b6d4' },
  { value: 'blue-500', label: 'Blue', hex: '#3b82f6' },
  { value: 'indigo-500', label: 'Indigo', hex: '#6366f1' },
  { value: 'purple-500', label: 'Purple', hex: '#a855f7' },
];

function getColorHex(colorName: string): string {
  return COLOR_OPTIONS.find(c => c.value === colorName)?.hex || '#a855f7';
}

interface MiningInterface {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  thumbnail_url: string | null;
  game_url: string;
  category: string;
  gradient_from: string;
  gradient_to: string;
  min_entropy_bits: number;
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface FormData {
  slug: string;
  name: string;
  description: string;
  icon: string;
  game_url: string;
  category: string;
  gradient_from: string;
  gradient_to: string;
  enabled: boolean;
}

const initialFormData: FormData = {
  slug: '',
  name: '',
  description: '',
  icon: '',
  game_url: '',
  category: 'arcade',
  gradient_from: 'purple-500',
  gradient_to: 'indigo-500',
  enabled: true
};

export default function MiningLibraryPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [interfaces, setInterfaces] = useState<MiningInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingInterface, setEditingInterface] = useState<MiningInterface | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchInterfaces();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchInterfaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${ARCA_API_URL}/v1/mining/interfaces/all`);
      const data = await response.json();
      if (data.success) {
        setInterfaces(data.interfaces);
      } else {
        setError('Failed to fetch mining interfaces');
      }
    } catch (err) {
      console.error('Failed to fetch mining interfaces:', err);
      setError('Failed to connect to Arca API');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const url = editingInterface
        ? `${ARCA_API_URL}/v1/mining/interfaces/${editingInterface.slug}`
        : `${ARCA_API_URL}/v1/mining/interfaces`;

      const response = await fetch(url, {
        method: editingInterface ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(editingInterface ? 'Interface updated!' : 'Interface created!');
        setShowModal(false);
        setEditingInterface(null);
        setFormData(initialFormData);
        fetchInterfaces();
      } else {
        setError(data.error || 'Failed to save interface');
      }
    } catch (err) {
      console.error('Failed to save interface:', err);
      setError('Failed to save interface');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (iface: MiningInterface) => {
    setEditingInterface(iface);
    setFormData({
      slug: iface.slug,
      name: iface.name,
      description: iface.description || '',
      icon: iface.icon || '',
      game_url: iface.game_url,
      category: iface.category || 'arcade',
      gradient_from: iface.gradient_from || 'purple-500',
      gradient_to: iface.gradient_to || 'indigo-500',
      enabled: iface.enabled
    });
    setShowModal(true);
  };

  const handleDelete = async (iface: MiningInterface) => {
    if (!confirm(`Are you sure you want to delete "${iface.name}"?`)) return;

    try {
      const response = await fetch(`${ARCA_API_URL}/v1/mining/interfaces/${iface.slug}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        setSuccess('Interface deleted!');
        fetchInterfaces();
      } else {
        setError(data.error || 'Failed to delete interface');
      }
    } catch (err) {
      console.error('Failed to delete interface:', err);
      setError('Failed to delete interface');
    }
  };

  const handleToggleEnabled = async (iface: MiningInterface) => {
    try {
      const response = await fetch(`${ARCA_API_URL}/v1/mining/interfaces/${iface.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !iface.enabled })
      });
      const data = await response.json();

      if (data.success) {
        fetchInterfaces();
      } else {
        setError(data.error || 'Failed to update interface');
      }
    } catch (err) {
      console.error('Failed to toggle interface:', err);
      setError('Failed to update interface');
    }
  };

  const openNewModal = () => {
    setEditingInterface(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-4" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading mining interfaces...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && interfaces.length === 0) {
    return (
      <AdminLayout>
        <div className="max-w-md mx-auto mt-12 px-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Failed to Load Mining Interfaces</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">{error}</p>
            <Button onClick={fetchInterfaces} className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900">
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
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Mining Library</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Manage entropy mining interfaces
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInterfaces}
              className="border-neutral-200 dark:border-neutral-800"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={openNewModal}
              className="bg-gradient-to-r from-yellow-400 to-amber-500 text-neutral-900 hover:from-yellow-500 hover:to-amber-600"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Interface
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-600 dark:text-red-400 hover:text-red-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
            <span className="text-sm text-green-700 dark:text-green-300">{success}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total Interfaces"
            value={interfaces.length}
            icon={<Gamepad2 className="w-4 h-4" />}
            color="purple"
          />
          <StatCard
            label="Active"
            value={interfaces.filter(i => i.enabled).length}
            icon={<Eye className="w-4 h-4" />}
            color="green"
          />
        </div>

        {/* Interfaces Grid */}
        {interfaces.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center">
            <Gamepad2 className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400 mb-4">
              No mining interfaces configured yet.
            </p>
            <Button onClick={openNewModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Interface
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {interfaces.map((iface) => (
              <div
                key={iface.slug}
                className={`bg-white dark:bg-neutral-900 border rounded-xl p-5 transition-all ${
                  iface.enabled
                    ? 'border-neutral-200 dark:border-neutral-800'
                    : 'border-neutral-200 dark:border-neutral-800 opacity-60'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${getColorHex(iface.gradient_from)}, ${getColorHex(iface.gradient_to)})`
                      }}
                    >
                      {iface.icon || '🎮'}
                    </div>
                    <div>
                      <h3 className="text-neutral-900 dark:text-white font-semibold">{iface.name}</h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{iface.slug}</p>
                    </div>
                  </div>
                  <Badge
                    className={`cursor-pointer ${
                      iface.enabled
                        ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 hover:bg-green-200'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                    onClick={() => handleToggleEnabled(iface)}
                  >
                    {iface.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3 line-clamp-2">
                  {iface.description || 'No description'}
                </p>

                {/* URL */}
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-4 truncate font-mono">
                  {iface.game_url}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(iface)}
                    className="flex-1 border-neutral-200 dark:border-neutral-800"
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(iface.game_url, '_blank')}
                    className="border-neutral-200 dark:border-neutral-800"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(iface)}
                    className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInterface ? 'Edit Mining Interface' : 'New Mining Interface'}
            </DialogTitle>
            <DialogDescription>
              {editingInterface
                ? 'Update the mining interface details below.'
                : 'Add a new mining interface for entropy collection.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({
                  ...formData,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                })}
                disabled={!!editingInterface}
                placeholder="my-game"
                required
              />
              <p className="text-xs text-neutral-500">Unique identifier (lowercase, hyphens only)</p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Game"
                required
              />
            </div>

            {/* Icon */}
            <div className="space-y-2">
              <Label htmlFor="icon">Icon (emoji)</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="🎮"
                className="text-2xl"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="A fun mining interface..."
                rows={2}
              />
            </div>

            {/* Game URL */}
            <div className="space-y-2">
              <Label htmlFor="game_url">Game URL</Label>
              <Input
                id="game_url"
                type="url"
                value={formData.game_url}
                onChange={(e) => setFormData({ ...formData, game_url: e.target.value })}
                placeholder="https://play.gambino.gold/my-game"
                required
              />
            </div>

            {/* Gradient Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gradient From</Label>
                <Select
                  value={formData.gradient_from}
                  onValueChange={(value) => setFormData({ ...formData, gradient_from: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: c.hex }}
                          />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gradient To</Label>
                <Select
                  value={formData.gradient_to}
                  onValueChange={(value) => setFormData({ ...formData, gradient_to: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: c.hex }}
                          />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 text-white font-medium py-3 px-4 rounded-lg"
                style={{
                  background: `linear-gradient(to right, ${getColorHex(formData.gradient_from)}, ${getColorHex(formData.gradient_to)})`
                }}
              >
                <span className="text-xl">{formData.icon || '🎮'}</span>
                {formData.name || 'Interface Name'}
              </button>
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Enabled</Label>
                <p className="text-xs text-neutral-500">Visible to users when enabled</p>
              </div>
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-yellow-400 to-amber-500 text-neutral-900 hover:from-yellow-500 hover:to-amber-600"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingInterface ? 'Update' : 'Create'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'green' | 'purple' | 'yellow' | 'blue';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400',
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

// src/components/InlineEditableName.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Pencil } from 'lucide-react';
import api from '@/lib/api';
import axios from 'axios';

interface InlineEditableNameProps {
  machineId: string;
  mongoId: string;
  currentName?: string;  // ← Make this optional
  fallbackName: string;
  onUpdate?: () => void;
}

export default function InlineEditableName({ 
  machineId, 
  mongoId,
  currentName, 
  fallbackName,
  onUpdate 
}: InlineEditableNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentName || fallbackName);  // ← This already handles undefined
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Name cannot be empty');
      return;
    }

    try {
      setSaving(true);
      await api.put(`/api/machines/${mongoId}`, { name: name.trim() });
      
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to update name:', err);
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.error || 'Failed to update machine name');
      } else {
        alert('Failed to update machine name');
      }
      setName(currentName || fallbackName); // Reset on error
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(currentName || fallbackName);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          className="h-8 text-sm"
          autoFocus
          disabled={saving}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          disabled={saving}
          className="h-8 w-8 p-0"
        >
          <Check className="w-4 h-4 text-green-600" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={saving}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2">
      <div>
        <div className="font-medium">{currentName || fallbackName}</div>
        {currentName && (
          <div className="text-xs text-gray-500 dark:text-gray-400">{machineId}</div>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Pencil className="w-3 h-3" />
      </Button>
    </div>
  );
}
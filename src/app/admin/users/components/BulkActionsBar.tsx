// src/app/admin/users/components/BulkActionsBar.tsx
'use client';

import { CheckCircle2, XCircle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface BulkActionsBarProps {
  selectedCount: number;
  onAction: (action: 'activate' | 'deactivate' | 'delete') => void;
  onClear: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onAction,
  onClear,
}: BulkActionsBarProps) {
  return (
    <Card className="p-4 bg-blue-500/10 border-blue-500/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="font-medium">
            {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
          </div>

          <div className="h-6 w-px bg-gray-700" />

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction('activate')}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Activate
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction('deactivate')}
              className="gap-2"
            >
              <XCircle className="w-4 h-4" />
              Deactivate
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (
                  confirm(
                    `Are you sure you want to delete ${selectedCount} user${
                      selectedCount !== 1 ? 's' : ''
                    }? This action cannot be undone.`
                  )
                ) {
                  onAction('delete');
                }
              }}
              className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>

        <Button size="sm" variant="ghost" onClick={onClear}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
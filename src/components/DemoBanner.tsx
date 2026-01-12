// src/components/DemoBanner.tsx
'use client';

import { useDemoMode } from './DemoModeContext';
import { Eye, Info } from 'lucide-react';

export default function DemoBanner() {
  const { isDemo } = useDemoMode();

  if (!isDemo) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-neutral-900 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-sm font-medium">
        <Eye className="w-4 h-4" />
        <span>
          <strong>Demo Mode</strong> - You are viewing a read-only demonstration of the Gambino Admin panel
        </span>
        <span className="hidden sm:inline text-neutral-800">|</span>
        <span className="hidden sm:inline text-neutral-800">
          Data shown is from a sample venue (Nimbus 1)
        </span>
      </div>
    </div>
  );
}

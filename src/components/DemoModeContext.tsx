// src/components/DemoModeContext.tsx
'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { getUser, isDemoMode as checkDemoMode } from '@/lib/auth';

interface DemoModeContextType {
  isDemo: boolean;
  showDemoToast: (action?: string) => void;
}

const DemoModeContext = createContext<DemoModeContextType>({
  isDemo: false,
  showDemoToast: () => {},
});

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    // Check demo mode on mount and when localStorage changes
    const checkDemo = () => {
      const user = getUser();
      setIsDemo(user?.isDemo === true);
    };

    checkDemo();

    // Listen for storage changes (in case user logs in/out in another tab)
    window.addEventListener('storage', checkDemo);
    return () => window.removeEventListener('storage', checkDemo);
  }, []);

  const showDemoToast = (action?: string) => {
    const message = action
      ? `Demo mode: ${action} is disabled`
      : 'Demo mode: This action is disabled';
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <DemoModeContext.Provider value={{ isDemo, showDemoToast }}>
      {children}
      {/* Demo toast notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[100] animate-in slide-in-from-bottom-2">
          <div className="bg-amber-500 text-neutral-900 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 font-medium">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {toast}
          </div>
        </div>
      )}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}

/**
 * Hook to check if demo mode and optionally show toast
 * Returns true if action should be blocked
 */
export function useDemoBlock() {
  const { isDemo, showDemoToast } = useDemoMode();

  const checkAndBlock = (action?: string): boolean => {
    if (isDemo) {
      showDemoToast(action);
      return true;
    }
    return false;
  };

  return { isDemo, checkAndBlock };
}

// src/components/DemoDisabled.tsx
'use client';

import { ReactNode } from 'react';
import { useDemoBlock } from './DemoModeContext';

interface DemoDisabledProps {
  children: ReactNode;
  action?: string;  // Description of the action being blocked
  className?: string;
}

/**
 * Wrapper component that disables its children in demo mode
 * Shows a tooltip explaining why the action is disabled
 */
export function DemoDisabled({ children, action, className }: DemoDisabledProps) {
  const { isDemo } = useDemoBlock();

  if (!isDemo) {
    return <>{children}</>;
  }

  return (
    <div className={`relative group ${className || ''}`}>
      <div className="pointer-events-none opacity-50 cursor-not-allowed">
        {children}
      </div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-neutral-900 dark:bg-neutral-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
        {action || 'Disabled in demo mode'}
      </div>
    </div>
  );
}

interface DemoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  action?: string;
}

/**
 * Button that shows a demo mode toast when clicked in demo mode
 */
export function DemoAwareButton({
  children,
  action,
  onClick,
  disabled,
  ...props
}: DemoButtonProps) {
  const { isDemo, checkAndBlock } = useDemoBlock();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (checkAndBlock(action)) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={disabled || isDemo}
      className={`${props.className || ''} ${isDemo ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Zap, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export default function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
        <Palette className="h-5 w-5" />
      </Button>
    );
  }

  const themes = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Clean & bright' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Easy on eyes' },
    { value: 'gold', label: 'Gold', icon: Zap, description: 'Casino vibes' },
    { value: 'midnight', label: 'Midnight', icon: Moon, description: 'Deep blue' },
  ];

  const currentTheme = themes.find(t => t.value === theme) || themes[1];
  const Icon = currentTheme.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0"
        >
          <Icon className="h-5 w-5" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold">Choose Theme</div>
        <DropdownMenuSeparator />
        {themes.map((t) => {
          const ThemeIcon = t.icon;
          return (
            <DropdownMenuItem
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={theme === t.value ? 'bg-yellow-500/10' : ''}
            >
              <ThemeIcon className="w-4 h-4 mr-3" />
              <div className="flex-1">
                <div className="font-medium">{t.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t.description}</div>
              </div>
              {theme === t.value && (
                <div className="w-2 h-2 rounded-full bg-yellow-500 ml-2"></div>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
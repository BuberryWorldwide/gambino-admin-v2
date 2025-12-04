// src/components/ui/sortable-header.tsx
'use client';

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: SortConfig;
  onSort: (key: string) => void;
  className?: string;
  isDark?: boolean;
}

export function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  className = '',
  isDark = false
}: SortableHeaderProps) {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`
        flex items-center gap-1 group cursor-pointer select-none
        transition-colors duration-150
        ${isActive
          ? (isDark ? 'text-yellow-400' : 'text-yellow-600')
          : (isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-neutral-900')
        }
        ${className}
      `}
    >
      <span className="font-medium">{label}</span>
      <span className={`
        transition-opacity duration-150
        ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}
      `}>
        {direction === 'asc' ? (
          <ChevronUp className="w-4 h-4" />
        ) : direction === 'desc' ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronsUpDown className="w-4 h-4" />
        )}
      </span>
    </button>
  );
}

// Generic sort function for any array of objects
export function sortData<T>(
  data: T[],
  sortConfig: SortConfig,
  customComparators?: Record<string, (a: T, b: T) => number>
): T[] {
  if (!sortConfig.key || !sortConfig.direction) {
    return data;
  }

  return [...data].sort((a, b) => {
    // Use custom comparator if provided
    if (customComparators && customComparators[sortConfig.key]) {
      const result = customComparators[sortConfig.key](a, b);
      return sortConfig.direction === 'asc' ? result : -result;
    }

    // Default comparison
    const aValue = getNestedValue(a, sortConfig.key);
    const bValue = getNestedValue(b, sortConfig.key);

    // Handle null/undefined
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
    if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

    // Handle dates
    if (aValue instanceof Date && bValue instanceof Date) {
      const result = aValue.getTime() - bValue.getTime();
      return sortConfig.direction === 'asc' ? result : -result;
    }

    // Handle date strings
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const aDate = Date.parse(aValue);
      const bDate = Date.parse(bValue);
      if (!isNaN(aDate) && !isNaN(bDate)) {
        const result = aDate - bDate;
        return sortConfig.direction === 'asc' ? result : -result;
      }
    }

    // Handle numbers
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      const result = aValue - bValue;
      return sortConfig.direction === 'asc' ? result : -result;
    }

    // Handle booleans
    if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      const result = (aValue === bValue) ? 0 : aValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? result : -result;
    }

    // Default string comparison
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    const result = aStr.localeCompare(bStr);
    return sortConfig.direction === 'asc' ? result : -result;
  });
}

// Helper to get nested object values like "store.name"
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Hook for managing sort state
import { useState, useCallback } from 'react';

export function useSort(defaultKey: string = '', defaultDirection: SortDirection = null) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: defaultKey,
    direction: defaultDirection
  });

  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (prev.key !== key) {
        // New column - start with ascending
        return { key, direction: 'asc' };
      }
      // Same column - cycle through: asc -> desc -> null
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      if (prev.direction === 'desc') {
        return { key: '', direction: null };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  return { sortConfig, handleSort, setSortConfig };
}

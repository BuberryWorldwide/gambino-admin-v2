// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(d);
}

export function getStatusColor(status: string | undefined): string {
  if (!status) return 'bg-gray-500 text-white';
  
  const statusColors: Record<string, string> = {
    active: 'bg-green-500 text-white',
    inactive: 'bg-gray-500 text-white',
    pending: 'bg-yellow-500 text-black',
    maintenance: 'bg-orange-500 text-white',
    error: 'bg-red-500 text-white',
    online: 'bg-green-500 text-white',
    offline: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-black',
    success: 'bg-green-500 text-white',
    approved: 'bg-green-500 text-white',
    rejected: 'bg-red-500 text-white',
    settled: 'bg-blue-500 text-white'
  };
  
  return statusColors[status.toLowerCase()] || 'bg-gray-500 text-white';
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  
  return value.toLocaleString();
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
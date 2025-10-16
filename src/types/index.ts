// src/types/index.ts

export type UserRole = 'super_admin' | 'gambino_ops' | 'venue_manager' | 'venue_staff' | 'user';
export type StoreStatus = 'active' | 'inactive' | 'maintenance';
export type MachineStatus = 'online' | 'offline' | 'maintenance' | 'error';

export interface User {
  _id: string;
  email: string;
  username?: string;
  role: UserRole;
  assignedVenues?: string[];
  permissions?: string[];
  walletAddress?: string;
  gambinoBalance?: number;
  gluckScore?: number;
  tier?: 'none' | 'tier3' | 'tier2' | 'tier1';
  isVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
  lastActivity?: string;
  redirectTo?: string;
}

export interface Store {
  _id: string;
  storeId: string;
  storeName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  contactName?: string;
  contactPhone?: string;
  timezone: string;
  feePercentage: number;
  status: StoreStatus;
  operatingHours?: {
    open: string;
    close: string;
  };
  ownerUserId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Machine {
  _id: string;
  machineId: string;
  storeId: string;
  name: string;
  gameType: string;
  status: MachineStatus;
  serialNumber?: string;
  location?: string;
  lastSeen?: string;
  todayRevenue?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardMetrics {
  todayRevenue: number;
  totalMachines: number;
  activeMachines: number;
  todayPlayers: number;
  alerts: number;
}

export interface Report {
  _id: string;
  storeId: string;
  reportDate: string;
  totalRevenue: number;
  machineCount: number;
  reconciliationStatus: 'pending' | 'approved' | 'rejected';
  submittedBy?: string;
  submittedAt?: string;
  notes?: string;
}

export interface EdgeEvent {
  _id: string;
  eventType: string;
  storeId: string;
  machineId?: string;
  userId?: string;
  amount?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}
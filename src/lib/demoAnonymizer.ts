// src/lib/demoAnonymizer.ts
// Anonymizes sensitive data when in demo mode to protect real store information

import { isDemoMode } from './auth';
import type { Store } from '@/types';

// Demo-friendly replacement data
const DEMO_VENUES = [
  { name: "Sunset Lounge", city: "Springfield", state: "IL", address: "123 Main Street" },
  { name: "Lucky's Bar & Grill", city: "Riverside", state: "CA", address: "456 Oak Avenue" },
  { name: "The Corner Spot", city: "Lakewood", state: "CO", address: "789 Elm Boulevard" },
  { name: "Moonlight Tavern", city: "Fairview", state: "TX", address: "321 Pine Road" },
  { name: "Golden Eagle Pub", city: "Greenville", state: "OH", address: "654 Cedar Lane" },
];

const DEMO_CONTACTS = [
  { name: "John Smith", phone: "(555) 123-4567" },
  { name: "Jane Doe", phone: "(555) 234-5678" },
  { name: "Mike Johnson", phone: "(555) 345-6789" },
  { name: "Sarah Williams", phone: "(555) 456-7890" },
  { name: "David Brown", phone: "(555) 567-8901" },
];

// Consistent mapping based on original storeId hash
function getConsistentIndex(storeId: string, arrayLength: number): number {
  let hash = 0;
  for (let i = 0; i < storeId.length; i++) {
    hash = ((hash << 5) - hash) + storeId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % arrayLength;
}

/**
 * Anonymize a store object for demo mode
 * Keeps operational data (revenue, machines) but masks identifying info
 */
export function anonymizeStore<T extends Partial<Store>>(store: T): T {
  if (!isDemoMode() || !store) return store;

  const storeId = store.storeId || store._id || 'default';
  const venueIndex = getConsistentIndex(storeId, DEMO_VENUES.length);
  const contactIndex = getConsistentIndex(storeId + 'contact', DEMO_CONTACTS.length);

  const demoVenue = DEMO_VENUES[venueIndex];
  const demoContact = DEMO_CONTACTS[contactIndex];

  return {
    ...store,
    storeName: demoVenue.name,
    address: demoVenue.address,
    city: demoVenue.city,
    state: demoVenue.state,
    zipCode: "12345",
    phone: demoContact.phone,
    contactName: demoContact.name,
    contactPhone: demoContact.phone,
    // Keep original storeId for navigation/API calls - only display fields are anonymized
  };
}

/**
 * Anonymize an array of stores
 */
export function anonymizeStores<T extends Partial<Store>>(stores: T[]): T[] {
  if (!isDemoMode() || !stores) return stores;
  return stores.map(store => anonymizeStore(store));
}

/**
 * Anonymize a hub name
 */
export function anonymizeHubName(hubName: string, hubId: string): string {
  if (!isDemoMode()) return hubName;
  const index = getConsistentIndex(hubId, 10);
  return `Demo Hub ${index + 1}`;
}

/**
 * Anonymize a machine name/ID
 */
export function anonymizeMachineName(machineName: string, machineId: string): string {
  if (!isDemoMode()) return machineName;
  const index = getConsistentIndex(machineId, 50);
  return `Machine-${String(index + 1).padStart(2, '0')}`;
}

/**
 * Anonymize a machine ID for display
 */
export function anonymizeMachineId(machineId: string): string {
  if (!isDemoMode()) return machineId;
  const index = getConsistentIndex(machineId, 50);
  return `MCH-${String(index + 1).padStart(3, '0')}`;
}

// Demo user names for consistent anonymization
const DEMO_FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey',
  'Riley', 'Quinn', 'Avery', 'Parker', 'Cameron',
  'Dakota', 'Skyler', 'Reese', 'Finley', 'Sage',
  'River', 'Blake', 'Drew', 'Jamie', 'Charlie'
];

const DEMO_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
  'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson',
  'Martin', 'Lee', 'Thompson', 'White', 'Harris'
];

/**
 * Anonymize a full user object
 */
export function anonymizeUser<T extends { _id?: string; email?: string; firstName?: string; lastName?: string; phone?: string; walletAddress?: string }>(user: T): T {
  if (!isDemoMode() || !user) return user;

  const odifier = user._id || user.email || 'default';
  const firstNameIndex = getConsistentIndex(odifier + 'first', DEMO_FIRST_NAMES.length);
  const lastNameIndex = getConsistentIndex(odifier + 'last', DEMO_LAST_NAMES.length);

  return {
    ...user,
    firstName: DEMO_FIRST_NAMES[firstNameIndex],
    lastName: DEMO_LAST_NAMES[lastNameIndex],
    email: anonymizeEmail(user.email || ''),
    phone: user.phone ? anonymizePhone(user.phone) : undefined,
    walletAddress: user.walletAddress ? anonymizeWalletAddress(user.walletAddress) : undefined,
  };
}

/**
 * Anonymize an array of users
 */
export function anonymizeUsers<T extends { _id?: string; email?: string; firstName?: string; lastName?: string; phone?: string; walletAddress?: string }>(users: T[]): T[] {
  if (!isDemoMode() || !users) return users;
  return users.map(user => anonymizeUser(user));
}

/**
 * Anonymize user display name (for transaction history, etc.)
 */
export function anonymizeUserName(name: string, odifier: string = ''): string {
  if (!isDemoMode() || !name) return name;
  const index = getConsistentIndex(name + odifier, DEMO_FIRST_NAMES.length);
  return DEMO_FIRST_NAMES[index];
}

/**
 * Anonymize email address
 */
export function anonymizeEmail(email: string): string {
  if (!isDemoMode() || !email) return email;
  const [local, domain] = email.split('@');
  if (!domain) return 'd***@demo.example';
  const index = getConsistentIndex(email, 100);
  return `user${index}@demo.example`;
}

/**
 * Anonymize phone number (show last 4 digits only)
 */
export function anonymizePhone(phone: string): string {
  if (!isDemoMode() || !phone) return phone;
  const index = getConsistentIndex(phone, 9000) + 1000;
  return `(555) 555-${index}`;
}

/**
 * Anonymize wallet address
 */
export function anonymizeWalletAddress(address: string): string {
  if (!isDemoMode() || !address) return address;
  // Show first 6 and last 4 characters pattern but with fake data
  const index = getConsistentIndex(address, 9999);
  return `0x${index.toString(16).padStart(4, '0')}...demo`;
}

/**
 * Anonymize transaction data (user info within transactions)
 */
export function anonymizeTransaction<T extends { userId?: { _id?: string; firstName?: string; lastName?: string; email?: string; phone?: string } }>(transaction: T): T {
  if (!isDemoMode() || !transaction || !transaction.userId) return transaction;

  const odifier = transaction.userId._id || transaction.userId.email || 'default';
  const firstNameIndex = getConsistentIndex(odifier + 'first', DEMO_FIRST_NAMES.length);
  const lastNameIndex = getConsistentIndex(odifier + 'last', DEMO_LAST_NAMES.length);

  return {
    ...transaction,
    userId: {
      ...transaction.userId,
      firstName: DEMO_FIRST_NAMES[firstNameIndex],
      lastName: DEMO_LAST_NAMES[lastNameIndex],
      email: anonymizeEmail(transaction.userId.email || ''),
      phone: transaction.userId.phone ? anonymizePhone(transaction.userId.phone) : undefined,
    }
  };
}

/**
 * Anonymize an array of transactions
 */
export function anonymizeTransactions<T extends { userId?: { _id?: string; firstName?: string; lastName?: string; email?: string; phone?: string } }>(transactions: T[]): T[] {
  if (!isDemoMode() || !transactions) return transactions;
  return transactions.map(txn => anonymizeTransaction(txn));
}

/**
 * Check if we should anonymize (convenience function)
 */
export function shouldAnonymize(): boolean {
  return isDemoMode();
}

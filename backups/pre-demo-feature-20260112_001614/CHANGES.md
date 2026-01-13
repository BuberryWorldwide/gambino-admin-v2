# Demo Account Feature - Change Documentation

**Date:** 2026-01-12
**Feature:** Read-Only Demo Account for Marketing
**Backup Location:** `backups/pre-demo-feature-20260112_001614/`

---

## Purpose

Create a read-only demo account (`demo@gambino.gold`) that allows potential venue operators to explore the Gambino Admin interface without modifying any data. The account displays real data from the Nimbus 1 store in Gallatin, TN.

---

## Files Modified

### 1. `src/types/index.ts`
**Change:** Added `isDemo` field to User interface

```diff
 export interface User {
   _id: string;
   email: string;
   username?: string;
+  firstName?: string;
+  lastName?: string;
   role: UserRole;
   assignedVenues?: string[];
   permissions?: string[];
   walletAddress?: string;
   gambinoBalance?: number;
   gluckScore?: number;
   tier?: 'none' | 'tier3' | 'tier2' | 'tier1';
   isVerified?: boolean;
   isActive?: boolean;
+  isDemo?: boolean;  // Read-only demo account flag for marketing purposes
   createdAt?: string;
   lastActivity?: string;
   redirectTo?: string;
 }
```

---

### 2. `src/lib/auth.ts`
**Change:** Added demo mode helper functions

```typescript
// NEW FUNCTIONS ADDED:

/**
 * Check if user is in demo mode (read-only)
 */
export function isDemoMode(userData: User | null = null): boolean {
  const user = userData || getUser();
  return user?.isDemo === true;
}

/**
 * Check if an action should be blocked due to demo mode
 * Returns a message if blocked, null if allowed
 */
export function getDemoModeBlockMessage(action: string): string | null {
  if (!isDemoMode()) return null;
  return `This is a demo account. ${action} is disabled in demo mode.`;
}
```

Also modified `canManageVenue()` to return `false` for demo accounts.

---

### 3. `src/lib/api.ts`
**Change:** Added mutation blocking in request interceptor

```typescript
// MODIFIED: Import statement
import { getToken, clearToken, isDemoMode } from './auth';

// ADDED: Inside request interceptor
// Block mutating requests in demo mode (read-only)
const mutatingMethods = ['post', 'put', 'patch', 'delete'];
const method = config.method?.toLowerCase();

if (isDemoMode() && method && mutatingMethods.includes(method)) {
  // Allow login/logout requests even in demo mode
  const allowedPaths = ['/api/auth/login', '/api/auth/logout', '/api/auth/set-cookie'];
  const isAllowed = allowedPaths.some(path => config.url?.includes(path));

  if (!isAllowed) {
    console.warn('🔒 Demo mode: Blocked mutating request', config.method, config.url);
    return Promise.reject({
      response: {
        status: 403,
        data: { error: 'This is a demo account. Data modifications are disabled.' }
      },
      isDemoBlock: true,
      message: 'Demo mode: Data modifications are disabled'
    });
  }
}
```

---

### 4. `src/app/layout.tsx`
**Change:** Added DemoModeProvider wrapper

```diff
 import type { Metadata } from "next";
 import "./globals.css";
 import { ThemeProvider } from "@/components/theme-provider";
+import { DemoModeProvider } from "@/components/DemoModeContext";

 // ... metadata ...

 export default function RootLayout({ children }) {
   return (
     <html lang="en" suppressHydrationWarning>
       <body className="antialiased">
         <ThemeProvider ...>
+          <DemoModeProvider>
             {children}
+          </DemoModeProvider>
         </ThemeProvider>
       </body>
     </html>
   );
 }
```

---

### 5. `src/components/layout/AdminLayout.tsx`
**Change:** Added DemoBanner import and component

```diff
 import ThemeSwitcher from '@/components/ThemeSwitcher';
+import DemoBanner from '@/components/DemoBanner';

 // ... in return statement ...
 return (
   <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
+    {/* Demo Mode Banner */}
+    <DemoBanner />
+
     {/* Top Nav */}
     <nav className="...">
```

---

### 6. `.gitignore`
**Change:** Added entries for secrets and scripts

```diff
 # env files (can opt-in for committing if needed)
 .env*
+.env.secrets
+
+# scripts with sensitive data
+scripts/setup-demo-account.sh
```

---

## New Files Created

### 1. `src/components/DemoModeContext.tsx`
React context providing demo mode state to all components. Includes:
- `DemoModeProvider` - Context provider component
- `useDemoMode()` - Hook to check demo state
- `useDemoBlock()` - Hook to check and show toast when blocking actions

### 2. `src/components/DemoBanner.tsx`
Yellow banner component shown at top of admin layout in demo mode.

### 3. `src/components/DemoDisabled.tsx`
Wrapper components for disabling UI elements:
- `DemoDisabled` - Wrapper that grays out and disables children
- `DemoAwareButton` - Button that shows toast when clicked in demo mode

### 4. `.env.secrets`
Environment file with database credentials and demo account info (gitignored).

### 5. `scripts/create-demo-user.js`
MongoDB script for creating the demo user.

### 6. `scripts/setup-demo-account.sh`
Shell script to automate demo user creation on production server.

### 7. `DEMO_ACCOUNT_SETUP.md`
Full documentation for the demo account feature.

---

## Database Changes Required

A new user document must be created in MongoDB with `isDemo: true`:

```javascript
{
  email: "demo@gambino.gold",
  password: "<bcrypt_hash_of_demo2024!>",
  firstName: "Demo",
  lastName: "Account",
  role: "venue_manager",
  assignedVenues: ["gallatin_nimbus_298"],  // Nimbus 1 store
  isDemo: true,
  isActive: true,
  isVerified: true,
  // ... other fields
}
```

---

## How to Restore

Run the restore script from the project directory:

```bash
cd /home/nhac/Downloads/gambino-backend-backup-local/gambino-admin-v2
./backups/pre-demo-feature-20260112_001614/RESTORE.sh
```

This will:
1. Restore all modified files to their original state
2. Remove all new files created by the demo feature
3. **Note:** Does NOT remove the demo user from MongoDB

---

## Testing Checklist

Before deploying:

- [ ] Build succeeds (`npm run build`)
- [ ] Login works normally for regular users
- [ ] Demo user can log in with `demo@gambino.gold` / `demo2024!`
- [ ] Demo banner appears when logged in as demo user
- [ ] All POST/PUT/DELETE requests are blocked for demo user
- [ ] Toast notification appears when demo user tries to perform actions
- [ ] Regular users can still perform all actions normally
- [ ] Logout works for demo user

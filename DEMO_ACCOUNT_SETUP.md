# Demo Account Setup Guide

This document explains how to set up and use the read-only demo account for marketing and sales demonstrations.

## Overview

The demo account feature allows potential venue operators to explore the Gambino Admin interface without the ability to modify any data. The account is assigned to the **Nimbus 1** store in Gallatin, TN, providing a real-world example of the venue management interface.

## Demo Account Credentials

```
Email:    demo@gambino.gold
Password: demo2024!
URL:      https://admin.gambino.gold/login
```

## Features

When logged in as a demo user:

1. **Yellow Banner**: A prominent banner appears at the top of every page indicating "Demo Mode"
2. **Read-Only Access**: All data modification actions (create, update, delete) are blocked
3. **Visual Feedback**: Disabled buttons and toast notifications explain why actions are blocked
4. **Full Navigation**: Users can browse all assigned venue data, view dashboards, and explore the interface

## Technical Implementation

### User Flag

Demo accounts are identified by the `isDemo: true` flag in the user document:

```javascript
{
  email: "demo@gambino.gold",
  role: "venue_manager",
  assignedVenues: ["gallatin_nimbus_298"],
  isDemo: true,  // This flag enables read-only mode
  // ...
}
```

### Frontend Components

- **DemoModeContext** (`src/components/DemoModeContext.tsx`): React context providing demo state to all components
- **DemoBanner** (`src/components/DemoBanner.tsx`): Yellow banner shown in demo mode
- **DemoDisabled** (`src/components/DemoDisabled.tsx`): Wrapper components for disabling UI elements

### API Blocking

The API client (`src/lib/api.ts`) intercepts all POST, PUT, PATCH, and DELETE requests when in demo mode and returns a friendly error message instead of sending the request.

### Auth Helpers

New functions in `src/lib/auth.ts`:
- `isDemoMode()`: Check if current user is a demo account
- `getDemoModeBlockMessage(action)`: Get user-friendly block message

## Setting Up the Demo Account

### Option 1: Run Setup Script (Recommended)

SSH into the production server and run:

```bash
ssh nhac@192.168.1.235
cd /opt/gambino/backend
# Copy the script from gambino-admin-v2/scripts/setup-demo-account.sh
chmod +x setup-demo-account.sh
./setup-demo-account.sh
```

### Option 2: Manual MongoDB Setup

1. SSH into the server:
   ```bash
   ssh nhac@192.168.1.235
   ```

2. Connect to MongoDB:
   ```bash
   docker exec -it gambino_mongodb mongosh "mongodb://gambinouser:jhI%2BPDopCbhL%2FuAwniiKU2DSQX6Rv8LEXR5smWQZfIU%3D@localhost:27017/gambino?authSource=admin"
   ```

3. Generate password hash (in a separate terminal with Node.js):
   ```bash
   cd /opt/gambino/backend
   node -e "require('bcrypt').hash('demo2024!', 10).then(h => console.log(h))"
   ```

4. Create the user in mongosh:
   ```javascript
   db.users.insertOne({
     email: "demo@gambino.gold",
     password: "<PASTE_BCRYPT_HASH_HERE>",
     firstName: "Demo",
     lastName: "Account",
     role: "venue_manager",
     assignedVenues: ["gallatin_nimbus_298"],
     isDemo: true,
     isActive: true,
     isVerified: true,
     gambinoBalance: 0,
     createdAt: new Date(),
     updatedAt: new Date()
   });
   ```

### Option 3: Update Existing User

If you want to make an existing user a demo account:

```javascript
db.users.updateOne(
  { email: "existing@email.com" },
  { $set: { isDemo: true } }
)
```

## Converting Back to Normal Account

To remove demo mode from an account:

```javascript
db.users.updateOne(
  { email: "demo@gambino.gold" },
  { $set: { isDemo: false } }
)
```

## Security Considerations

1. **Frontend-Only Blocking**: The current implementation blocks mutations at the frontend API interceptor level. For production, consider adding backend validation as well.

2. **Password Security**: The demo password is intentionally simple for easy sharing. The read-only nature of the account minimizes security risk.

3. **Data Visibility**: Demo users can see real data from assigned stores. Ensure the Nimbus 1 store doesn't contain sensitive information you don't want exposed.

## Backend Requirements (CRITICAL)

The backend login endpoint in `/opt/gambino/backend/src/routes/auth.js` MUST include `email` in the `.select()` statement:

```javascript
// CORRECT - email is included
const user = await User.findOne({ email: normalizedEmail })
  .select('+password email role firstName lastName isActive isVerified isDemo assignedVenues walletAddress tier');

// WRONG - email is missing, demo mode will NOT work
const user = await User.findOne({ email: normalizedEmail })
  .select('+password role firstName lastName isActive isVerified isDemo assignedVenues walletAddress tier');
```

The demo mode uses an email fallback check:
```javascript
isDemo: user.isDemo === true || user.email === 'demo@gambino.gold'
```

**If `email` is not in `.select()`, `user.email` will be `undefined` and the fallback will fail.**

This is required because Mongoose sometimes doesn't return the `isDemo` field properly from the database even when it exists.

## Troubleshooting

### Demo banner not showing
- Clear browser localStorage and refresh
- Check that the user has `isDemo: true` in the database
- **VERIFY the backend login query includes `email` in the `.select()` statement** (see Backend Requirements above)
- Check that the login response includes `isDemo: true` by inspecting Network tab

### isDemo returning false even though it's true in database
- **This is almost always because `email` is missing from the `.select()` statement**
- SSH to server: `ssh nhac@192.168.1.235`
- Check the auth.js file: `grep -A 2 'findOne.*normalizedEmail' /opt/gambino/backend/src/routes/auth.js`
- Verify `email` is in the `.select()` string
- Restart backend after fix: `pm2 restart gambino-backend`

### Actions not being blocked
- Verify the DemoModeProvider is in the app layout
- Check browser console for demo mode logs

### "Invalid credentials" on login
- Verify the bcrypt password hash was generated correctly
- Check that the user exists in the database with `isActive: true`

## Files Modified

### Frontend (gambino-admin-v2)
- `src/types/index.ts` - Added `isDemo` field to User interface
- `src/lib/auth.ts` - Added `isDemoMode()`, `getDemoModeBlockMessage()`, and `auth-changed` event dispatch
- `src/lib/api.ts` - Added mutation blocking in request interceptor
- `src/app/layout.tsx` - Added DemoModeProvider wrapper
- `src/components/layout/AdminLayout.tsx` - Added DemoBanner component
- `src/components/DemoModeContext.tsx` - New file: React context for demo mode (listens for `auth-changed` event)
- `src/components/DemoBanner.tsx` - New file: Demo mode banner component
- `src/components/DemoDisabled.tsx` - New file: Disabled wrapper components

### Backend (/opt/gambino/backend)
- `src/routes/auth.js` - Login query MUST include `email` in `.select()` for demo fallback to work

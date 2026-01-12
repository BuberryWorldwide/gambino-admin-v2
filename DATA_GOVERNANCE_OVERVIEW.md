# DATA GOVERNANCE TECHNICAL OVERVIEW

**Document Version**: 1.0
**Last Updated**: 2026-01-12
**System**: Gambino Admin Platform
**Status**: Living Document

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Three-Party Structure](#1-three-party-structure)
3. [Data Flow Architecture](#2-data-flow-architecture)
4. [Access Control Implementation](#3-access-control-implementation)
5. [Current Security Measures](#4-current-security-measures)
6. [Demo Mode / Anonymization](#5-demo-mode--anonymization)
7. [Sensitive Data Inventory](#6-sensitive-data-inventory)
8. [Gaps & Recommendations](#7-gaps--recommendations)
9. [Prioritized Action Items](#8-prioritized-action-items)

---

## Executive Summary

The Gambino Admin Platform is a venue management system for gaming locations, built on a three-party model: **Gambino** (platform operator), **VDV** (venue distributor/operator), and **Venues** (physical gaming locations). The system handles significant PII including user identities, financial data, and cryptocurrency wallet information.

**Current Security Posture**: MEDIUM-HIGH
**Primary Concerns**: Data subject rights implementation, data retention policies, token expiration
**Key Strengths**: Strong encryption, comprehensive RBAC, demo mode anonymization

---

## 1. Three-Party Structure

### Current State

The Gambino platform operates with three distinct parties, each with different data responsibilities:

#### Party Responsibilities Matrix

| Party | Role | Data Responsibility | Example Actions |
|-------|------|---------------------|-----------------|
| **Gambino** | Platform Operator | Data Controller | System operations, user management, treasury |
| **VDV (Venue Distributors)** | Venue Operators | Data Processor | Venue management, report submission, cashouts |
| **Venues** | Physical Locations | Data Sub-Processor | Machine operations, player interactions |

#### Role Mapping in System

| Business Role | System Role(s) | Access Level |
|---------------|----------------|--------------|
| Gambino Staff | `super_admin`, `gambino_ops` | All venues, all data |
| VDV Operators | `venue_manager`, `operator` | Assigned venues only |
| Venue Staff | `venue_staff` | Assigned venues, read-only |
| End Users | `user` | Own data only |

**Code Reference**: `backend/src/middleware/rbac.js:49-134`

```javascript
const ROLE_PERMISSIONS = {
  super_admin: [/* 21 permissions - full access */],
  gambino_ops: [/* 19 permissions - no user management */],
  venue_manager: [/* 12 permissions - assigned venues */],
  venue_staff: [/* 7 permissions - read-only + reports */],
  operator: [/* 9 permissions - assigned venues */],
  user: [PERMISSIONS.VIEW_PROFILE],
};
```

### Future Needs

- [ ] Formal Data Processing Agreements (DPAs) between Gambino and VDVs
- [ ] Sub-processor registry for venues
- [ ] Clear data controller/processor documentation for compliance audits
- [ ] Contractual obligations for data protection passed down the chain

---

## 2. Data Flow Architecture

### Current State

#### Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         END USER (Player)                         │
│                    [Mobile App / Web Interface]                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      GAMBINO BACKEND                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │
│  │   Auth API  │  │  User API   │  │    Transaction API      │   │
│  │ (JWT/Login) │  │ (Profile)   │  │  (Gaming/Financial)     │   │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘   │
│                             │                                     │
│                             ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                    MongoDB Database                        │   │
│  │  users │ stores │ transactions │ wallets │ sessions       │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ VDV (Manager)│    │ Venue Staff  │    │  Edge Hub    │
│ Admin Panel  │    │ Admin Panel  │    │ (Machine PI) │
└──────────────┘    └──────────────┘    └──────────────┘
```

#### PII Storage Locations

| Data Category | MongoDB Collection | Key Fields | Encryption |
|---------------|-------------------|------------|------------|
| User Identity | `users` | firstName, lastName, email, phone | Plaintext |
| Auth Credentials | `users` | password | bcrypt (12 rounds) |
| Financial | `users` | gambinoBalance, walletAddress | Plaintext |
| Wallet Keys | `users` | encryptedPrivateKey, recoveryPhrase | AES-256-GCM |
| KYC Documents | `users` | kycDocuments.url | URL references |
| Sessions | `sessions` | userId, ipAddress, userAgent | Plaintext |
| Transactions | `transactions` | userId, amounts | Plaintext |
| Store Data | `stores` | address, phone, contactName | Plaintext |

**Code Reference**: `backend/src/models/User.js:1-287`

#### APIs Exposing PII

| Endpoint | Method | Data Exposed | Access Control |
|----------|--------|--------------|----------------|
| `/api/auth/login` | POST | email, role, tier | Rate limited |
| `/api/auth/profile` | GET | Full profile | Authenticated |
| `/api/admin/users` | GET | User list with PII | `MANAGE_USERS` permission |
| `/api/admin/users/:id` | GET | Full user details | `MANAGE_USERS` permission |
| `/api/admin/stores` | GET | Store contact info | `VIEW_ASSIGNED_STORES` |
| `/api/wallet/private-key` | GET | **Encrypted wallet key** | Authenticated only |

**Code Reference**: `backend/server.js`, `backend/src/routes/userManagement.js`

### Future Needs

- [ ] Data classification tagging for all collections
- [ ] Field-level encryption for high-sensitivity PII (email, phone)
- [ ] API response filtering based on data classification
- [ ] Data flow logging for audit trails

---

## 3. Access Control Implementation

### Current State

#### RBAC System Architecture

The system implements a comprehensive Role-Based Access Control (RBAC) system with 21 granular permissions.

**Code Reference**: `backend/src/middleware/rbac.js:10-46`

```javascript
const PERMISSIONS = {
  // User Management
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  EDIT_USER_ROLES: 'edit_user_roles',

  // Store/Venue Management
  VIEW_ALL_STORES: 'view_all_stores',
  VIEW_ASSIGNED_STORES: 'view_assigned_stores',
  MANAGE_ALL_STORES: 'manage_all_stores',
  MANAGE_ASSIGNED_STORES: 'manage_assigned_stores',
  CREATE_STORES: 'create_stores',

  // Financial & Reports
  VIEW_ALL_METRICS: 'view_all_metrics',
  VIEW_STORE_METRICS: 'view_store_metrics',
  SUBMIT_REPORTS: 'submit_reports',
  MANAGE_RECONCILIATION: 'manage_reconciliation',

  // Wallet Management
  VIEW_STORE_WALLETS: 'view_store_wallets',
  MANAGE_STORE_WALLETS: 'manage_store_wallets',

  // Token Cashouts
  PROCESS_CASHOUTS: 'process_cashouts',
  VIEW_CASHOUT_HISTORY: 'view_cashout_history',
  REVERSE_CASHOUTS: 'reverse_cashouts',

  // Machine Management
  VIEW_MACHINES: 'view_machines',
  MANAGE_MACHINES: 'manage_machines',
  VIEW_VENUES: 'view_venues',

  // System Operations
  SYSTEM_ADMIN: 'system_admin',
  VIEW_PROFILE: 'view_profile',
};
```

#### Permission Matrix by Role

| Permission | super_admin | gambino_ops | venue_manager | venue_staff | operator | user |
|------------|:-----------:|:-----------:|:-------------:|:-----------:|:--------:|:----:|
| MANAGE_USERS | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| VIEW_USERS | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| EDIT_USER_ROLES | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| VIEW_ALL_STORES | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| VIEW_ASSIGNED_STORES | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| MANAGE_ASSIGNED_STORES | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ |
| PROCESS_CASHOUTS | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| SYSTEM_ADMIN | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| VIEW_PROFILE | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

#### Venue-Scoped Access Control

Venue managers and staff can only access venues in their `assignedVenues` array.

**Code Reference**: `backend/src/middleware/rbac.js:158-196`

```javascript
function checkVenueAccess(userRole, assignedVenues = [], storeId) {
  // Admin roles have access to all venues
  if (['super_admin', 'gambino_ops'].includes(userRole)) {
    return { hasAccess: true, canManage: true, accessType: 'admin' };
  }

  // Venue staff, operators and managers need to be assigned
  if (['venue_staff', 'venue_manager', 'operator'].includes(userRole)) {
    const hasAccess = assignedVenues.includes(storeId);
    return {
      hasAccess,
      canManage: ['venue_manager', 'operator'].includes(userRole) && hasAccess,
      accessType: hasAccess ? 'venue_assigned' : 'denied'
    };
  }
}
```

#### Database Role Verification (Security Fix)

To prevent role escalation via JWT manipulation, sensitive operations verify roles from the database.

**Code Reference**: `backend/src/middleware/rbac.js:447-521`

```javascript
const verifyRoleFromDatabase = async (req, res, next) => {
  const user = await User.findById(req.user.userId)
    .select('role isActive assignedVenues tokenVersion')
    .lean();

  if (!user.isActive) {
    return res.status(403).json({ error: 'Account has been deactivated' });
  }

  // CRITICAL: Check if role in JWT matches role in database
  if (req.user.role !== user.role) {
    console.warn(`SECURITY: Role mismatch detected for user ${req.user.userId}`);
    req.user.role = user.role; // Update from DB (source of truth)
  }

  next();
};
```

### Future Needs

- [ ] Attribute-Based Access Control (ABAC) for finer-grained policies
- [ ] Access request/approval workflow for elevated permissions
- [ ] Time-limited elevated access (Just-In-Time access)
- [ ] Regular access certification campaigns

---

## 4. Current Security Measures

### Current State

#### 4.1 Encryption

**Wallet Key Encryption (AES-256-GCM)**

**Code Reference**: `backend/utils/crypto.js:1-18`

```javascript
const KEY = crypto.createHash('sha256')
  .update(process.env.KMS_SECRET || 'dev-only')
  .digest(); // 32 bytes

exports.encrypt = (text) => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return JSON.stringify({
    iv: iv.toString('base64'),
    ct: ct.toString('base64'),
    tag: tag.toString('base64')
  });
};
```

**Encrypted Fields in User Model**:
- `encryptedPrivateKey` (wallet private key)
- `privateKeyIV` (initialization vector)
- `recoveryPhrase` (wallet recovery phrase)
- `recoveryPhraseIV`
- `twoFactorSecret` (2FA secret key)

**Code Reference**: `backend/src/models/User.js:37-42`

#### 4.2 Authentication (JWT)

**Configuration**:
- Algorithm: HS256 (HMAC-SHA256)
- Expiration: 24 hours
- Secret: Minimum 32 characters enforced

**Code Reference**: `backend/server.js:69-84`

```javascript
const REQUIRED_SECRETS = [
  'JWT_SECRET',
  'WALLET_ENCRYPTION_KEY',
  'MONGODB_URI'
];

REQUIRED_SECRETS.forEach(key => {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} not set in environment`);
    process.exit(1);
  }
  if (process.env[key].length < 32) {
    console.error(`FATAL: ${key} too short (must be 32+ chars)`);
    process.exit(1);
  }
});
```

**Token Structure**:
```javascript
{
  userId: ObjectId,
  email: string,
  role: string,
  assignedVenues: string[],
  walletAddress: string,
  tier: string,
  iat: number,
  exp: number
}
```

#### 4.3 Password Security

- **Hashing**: bcrypt with 12 rounds
- **Validation**: 12+ chars, uppercase, lowercase, number, special char
- **Storage**: `select: false` on password field (excluded from queries)

**Code Reference**: `backend/src/models/User.js:100`

#### 4.4 Rate Limiting

**Code Reference**: `backend/server.js:211-310`

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| Global | 300 req/min | 1 min | DoS protection |
| Login | 10 attempts | 15 min | Brute force prevention |
| Auth | 5 attempts | 15 min | Token abuse prevention |
| Treasury Ops | 20 req | 1 hour | Financial security |
| Admin Routes | 100 req | 15 min | Admin abuse prevention |
| Wallet Ops | 10 req | 1 min | Transaction security |

#### 4.5 Input Sanitization

**Code Reference**: `backend/server.js:178-189`

```javascript
// Prevent NoSQL injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Attempted NoSQL injection from ${req.ip}: ${key}`);
  }
}));

// Prevent XSS attacks
app.use(xss());
```

#### 4.6 Audit Logging

**Code Reference**: `backend/server.js:31-61`

```javascript
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: './logs/security.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ]
});

function logSecurityEvent(type, req, data = {}) {
  securityLogger.info({
    type,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    user: req.user?.userId,
    email: req.user?.email,
    path: req.path,
    ...data
  });
}
```

**Logged Events**:
- Login attempts (success/failure)
- Permission denials
- Role mismatches (JWT vs DB)
- NoSQL injection attempts

### Future Needs

- [ ] Field-level encryption for PII (email, phone, DOB)
- [ ] Shorter token expiration (15 min) + refresh tokens
- [ ] Token blacklisting via Redis for logout/revocation
- [ ] CSRF protection for state-changing operations
- [ ] Comprehensive security event logging (all mutations)
- [ ] Automated alerting on security events

---

## 5. Demo Mode / Anonymization

### Current State

The system includes a comprehensive demo mode for marketing demonstrations that anonymizes all PII while preserving operational data.

#### 5.1 Demo Account Configuration

**Code Reference**: `DEMO_ACCOUNT_SETUP.md`

```javascript
{
  email: "demo@gambino.gold",
  password: "demo2024!",
  role: "venue_manager",
  assignedVenues: ["gallatin_nimbus_298"],
  isDemo: true,  // Flag that enables demo mode
  isActive: true,
  isVerified: true
}
```

#### 5.2 Demo Mode Detection

**Code Reference**: `src/lib/auth.ts:179-183`

```typescript
export function isDemoMode(userData: User | null = null): boolean {
  const user = userData || getUser();
  return user?.isDemo === true;
}
```

#### 5.3 Data Anonymization Functions

**Code Reference**: `src/lib/demoAnonymizer.ts:1-215`

| Function | Anonymizes | Example Output |
|----------|------------|----------------|
| `anonymizeStore()` | Store name, address, contact | "Sunset Lounge", "123 Main Street" |
| `anonymizeUser()` | Name, email, phone, wallet | "Alex Smith", "user42@demo.example" |
| `anonymizeEmail()` | Email address | "user42@demo.example" |
| `anonymizePhone()` | Phone number | "(555) 555-1234" |
| `anonymizeWalletAddress()` | Crypto wallet | "0x1234...demo" |
| `anonymizeHubName()` | Hub identifiers | "Demo Hub 1" |
| `anonymizeMachineName()` | Machine identifiers | "Machine-01" |
| `anonymizeTransaction()` | User info in transactions | Anonymized user object |

**Key Feature**: Consistent hashing ensures the same input always produces the same anonymized output.

```typescript
function getConsistentIndex(storeId: string, arrayLength: number): number {
  let hash = 0;
  for (let i = 0; i < storeId.length; i++) {
    hash = ((hash << 5) - hash) + storeId.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % arrayLength;
}
```

#### 5.4 UI Protections

**DemoBanner Component**: `src/components/DemoBanner.tsx`
- Yellow banner displayed on all pages
- Text: "Demo Mode - You are viewing a read-only demonstration"

**DemoDisabled Component**: `src/components/DemoDisabled.tsx`
- Wraps UI elements to disable them in demo mode
- Shows tooltip explaining why action is blocked

**API Request Blocking**: `src/lib/api.ts`
```typescript
// Blocks POST, PUT, PATCH, DELETE in demo mode
if (isDemoMode() && ['post', 'put', 'patch', 'delete'].includes(method)) {
  return Promise.reject({
    response: { status: 403, data: { error: 'Modifications disabled in demo mode' }}
  });
}
```

#### 5.5 What Gets Anonymized vs. Preserved

| Anonymized (PII) | Preserved (Operational) |
|------------------|------------------------|
| Store names, addresses | Revenue figures |
| Contact names, phones | Transaction counts |
| User names, emails | Machine statistics |
| Wallet addresses | Performance metrics |
| Hub identifiers | Report data |

### Future Needs

- [ ] Backend-level demo mode validation (currently frontend-only)
- [ ] Audit logging of demo session activities
- [ ] Demo data seeding for consistent demonstrations
- [ ] Time-limited demo sessions with auto-logout

---

## 6. Sensitive Data Inventory

### Current State

#### 6.1 PII Fields in User Schema

**Code Reference**: `backend/src/models/User.js:5-151`

| Field | Type | Purpose | Sensitivity |
|-------|------|---------|-------------|
| `firstName` | String | User identity | HIGH |
| `lastName` | String | User identity | HIGH |
| `email` | String | Primary identifier | HIGH |
| `phone` | String | Contact | HIGH |
| `dateOfBirth` | Date | Age verification | HIGH |
| `ipAddress` | String | Fraud detection | MEDIUM |
| `userAgent` | String | Device fingerprint | LOW |
| `walletAddress` | String | Crypto wallet (public) | MEDIUM |

#### 6.2 Financial Data Fields

| Field | Type | Purpose | Sensitivity |
|-------|------|---------|-------------|
| `gambinoBalance` | Number | Token balance | HIGH |
| `lockedBalance` | Number | Staked tokens | HIGH |
| `totalDeposited` | Number | Deposit history | MEDIUM |
| `totalWithdrawn` | Number | Withdrawal history | MEDIUM |
| `netProfit` | Number | Calculated P&L | MEDIUM |
| `totalSpent` | Number | Gaming spend | MEDIUM |
| `totalWon` | Number | Gaming winnings | MEDIUM |

#### 6.3 Wallet/Key Storage

| Field | Type | Encryption | Sensitivity |
|-------|------|------------|-------------|
| `encryptedPrivateKey` | String | AES-256-GCM | CRITICAL |
| `privateKeyIV` | String | N/A (IV) | CRITICAL |
| `recoveryPhrase` | String | AES-256-GCM | CRITICAL |
| `recoveryPhraseIV` | String | N/A (IV) | CRITICAL |
| `twoFactorSecret` | String | Encrypted | HIGH |
| `password` | String | bcrypt (12 rounds) | CRITICAL |

#### 6.4 KYC Information

**Code Reference**: `backend/src/models/User.js:22-34`

```javascript
kycStatus: {
  type: String,
  enum: ['pending', 'verified', 'rejected', 'expired'],
  default: 'pending'
},
kycDocuments: [{
  type: { type: String, enum: ['id', 'passport', 'license', 'utility_bill'] },
  url: String,
  uploadedAt: { type: Date, default: Date.now },
  verified: { type: Boolean, default: false }
}],
kycVerifiedAt: Date,
```

#### 6.5 Store/Venue PII

**Collection**: `stores`

| Field | Type | Sensitivity |
|-------|------|-------------|
| `address` | String | MEDIUM |
| `city`, `state`, `zipCode` | String | LOW |
| `phone` | String | MEDIUM |
| `contactName` | String | MEDIUM |
| `contactPhone` | String | MEDIUM |

#### 6.6 Safe Object Method

The User model includes a method to strip sensitive fields before API responses.

**Code Reference**: `backend/src/models/User.js:264-273`

```javascript
userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.encryptedPrivateKey;
  delete obj.privateKeyIV;
  delete obj.recoveryPhrase;
  delete obj.recoveryPhraseIV;
  delete obj.passwordHash;
  delete obj.twoFactorSecret;
  return obj;
};
```

### Future Needs

- [ ] Data classification labels in schema definitions
- [ ] Automated PII detection in new fields
- [ ] Data lineage tracking (where does PII flow?)
- [ ] Sensitive field access logging

---

## 7. Gaps & Recommendations

### 7.1 GDPR/CCPA Compliance Gaps

| Requirement | GDPR Article | Current State | Gap |
|-------------|--------------|---------------|-----|
| Right to Access | Art. 15 | Not implemented | **No data export API** |
| Right to Rectification | Art. 16 | Partial (profile edit) | **No formal process** |
| Right to Erasure | Art. 17 | Not implemented | **No deletion API** |
| Right to Portability | Art. 20 | Not implemented | **No data export format** |
| Data Breach Notification | Art. 33/34 | Not implemented | **No procedures** |
| Privacy by Design | Art. 25 | Partial | **Need documentation** |
| Records of Processing | Art. 30 | Not implemented | **No ROPA** |
| DPO Appointment | Art. 37 | Unknown | **May be required** |

### 7.2 Data Retention Policies

**Current State**: No formal data retention policies exist.

**Recommendations**:

| Data Category | Recommended Retention | Rationale |
|---------------|----------------------|-----------|
| User Accounts (active) | Indefinite | Required for service |
| User Accounts (inactive) | 3 years after last activity | Business need |
| Transaction Records | 7 years | Financial/tax compliance |
| Session Logs | 90 days | Security investigation |
| Security Audit Logs | 2 years | Compliance |
| KYC Documents | 5 years after account closure | AML requirements |
| Email/Marketing Consent | Duration of consent + 3 years | Proof of consent |

### 7.3 Data Subject Request Handling

**Current State**: No formal DSR (Data Subject Request) handling process.

**Recommended Implementation**:

```javascript
// Proposed endpoints (not implemented)
POST /api/user/data-export-request
GET  /api/user/data-export/:requestId
POST /api/user/deletion-request
POST /api/user/rectification-request
```

**Process Workflow**:
1. User submits request via authenticated API
2. Request logged with timestamp and type
3. Identity verification (2FA or email confirmation)
4. Request processed within 30 days (GDPR) or 45 days (CCPA)
5. User notified of completion
6. Audit trail maintained

### 7.4 Breach Notification Procedures

**Current State**: No documented breach notification procedures.

**Recommended Procedure**:

1. **Detection** (T+0)
   - Security monitoring alerts
   - Automated log analysis
   - User/employee reports

2. **Assessment** (T+24h)
   - Scope determination
   - Data affected
   - Users affected
   - Risk assessment

3. **Containment** (T+24h)
   - Revoke compromised credentials
   - Patch vulnerabilities
   - Isolate affected systems

4. **Notification** (T+72h for GDPR)
   - Supervisory authority notification (if required)
   - User notification (if high risk)
   - Documentation

5. **Remediation** (T+7d)
   - Root cause analysis
   - Process improvements
   - Additional security measures

### 7.5 Security Gaps from Audit

**Code Reference**: `backend/SECURITY_AUDIT.md`

| Gap | Severity | Status | Recommendation |
|-----|----------|--------|----------------|
| JWT role escalation | CRITICAL | ✅ FIXED | `verifyRoleFromDatabase` added |
| 24h token expiration | HIGH | ⚠️ OPEN | Reduce to 15min + refresh tokens |
| No token revocation | HIGH | ⚠️ OPEN | Implement Redis blacklist |
| No CSRF protection | MEDIUM | ⚠️ OPEN | Add csurf middleware |
| Incomplete audit logs | LOW | ⚠️ OPEN | Log all mutations |

### Future Needs

- [ ] Privacy Impact Assessment (PIA) process
- [ ] Data Protection Impact Assessment (DPIA) for high-risk processing
- [ ] Third-party vendor risk assessments
- [ ] Privacy policy linked to technical controls
- [ ] Consent management system
- [ ] Cookie consent (if applicable)

---

## 8. Prioritized Action Items

### PRIORITY 1: CRITICAL (Immediate - This Week)

| # | Action | Owner | Effort | Files Affected |
|---|--------|-------|--------|----------------|
| 1.1 | Implement data export API (Right to Access) | Backend | 3 days | `routes/userManagement.js` |
| 1.2 | Implement account deletion API (Right to Erasure) | Backend | 3 days | `routes/userManagement.js`, `models/User.js` |
| 1.3 | Add backend demo mode validation | Backend | 1 day | `middleware/rbac.js` |
| 1.4 | Document data retention policy | Compliance | 1 day | New: `DATA_RETENTION_POLICY.md` |

### PRIORITY 2: HIGH (This Sprint - 2 Weeks)

| # | Action | Owner | Effort | Files Affected |
|---|--------|-------|--------|----------------|
| 2.1 | Implement 15-min access + refresh tokens | Backend | 2 days | `routes/auth.js`, `middleware/rbac.js` |
| 2.2 | Add Redis token blacklisting | Backend | 2 days | `middleware/auth.js`, `config/redis.js` |
| 2.3 | Create DSR handling workflow | Backend + Ops | 3 days | New routes, admin UI |
| 2.4 | Document breach notification procedure | Security | 1 day | New: `INCIDENT_RESPONSE.md` |
| 2.5 | Add CSRF protection | Backend | 1 day | `server.js` |

### PRIORITY 3: MEDIUM (This Month)

| # | Action | Owner | Effort | Files Affected |
|---|--------|-------|--------|----------------|
| 3.1 | Create Records of Processing Activities (ROPA) | Compliance | 2 days | New: `ROPA.md` |
| 3.2 | Field-level encryption for PII | Backend | 5 days | `models/User.js`, `utils/crypto.js` |
| 3.3 | Comprehensive mutation audit logging | Backend | 3 days | All route files |
| 3.4 | Data Processing Agreements (DPA) template | Legal | 3 days | New: `DPA_TEMPLATE.md` |
| 3.5 | Automated data retention enforcement | Backend | 3 days | New: scheduled jobs |

### PRIORITY 4: ONGOING

| # | Action | Frequency | Owner |
|---|--------|-----------|-------|
| 4.1 | Security log review | Weekly | Security |
| 4.2 | Access certification | Quarterly | Compliance |
| 4.3 | Penetration testing | Quarterly | Security |
| 4.4 | JWT_SECRET rotation | Quarterly | DevOps |
| 4.5 | Dependency updates | Monthly | Backend |
| 4.6 | Privacy policy review | Annually | Legal |

---

## Appendix A: Key File References

| Category | File Path | Lines | Purpose |
|----------|-----------|-------|---------|
| User Schema | `backend/src/models/User.js` | 1-287 | PII fields, encryption |
| RBAC System | `backend/src/middleware/rbac.js` | 1-578 | Permissions, access control |
| Encryption | `backend/utils/crypto.js` | 1-18 | AES-256-GCM implementation |
| Auth (Frontend) | `src/lib/auth.ts` | 1-192 | Token handling, demo mode |
| Demo Anonymizer | `src/lib/demoAnonymizer.ts` | 1-215 | PII anonymization |
| Security Audit | `backend/SECURITY_AUDIT.md` | 1-660 | Vulnerability assessment |
| Main Server | `backend/server.js` | 1-2140 | Rate limiting, middleware |
| Demo Setup | `DEMO_ACCOUNT_SETUP.md` | 1-162 | Demo account configuration |

---

## Appendix B: Environment Variables (Security-Related)

| Variable | Purpose | Required Length | Notes |
|----------|---------|-----------------|-------|
| `JWT_SECRET` | Token signing | 32+ chars | Rotate quarterly |
| `WALLET_ENCRYPTION_KEY` | Wallet encryption | 64 hex chars | Never expose |
| `MONGODB_URI` | Database connection | N/A | Use auth |
| `KMS_SECRET` | Key derivation | 32+ chars | Used for crypto.js |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-12 | Claude (AI Analysis) | Initial comprehensive analysis |

---

**This is a living document. Update as the system evolves.**

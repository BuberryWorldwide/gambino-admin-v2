# KYC Compliance Documentation

## Overview

This document outlines the Know Your Customer (KYC) verification system implemented for Gambino Gold. The system enables venue staff to verify user identities in person, triggering referral rewards and ensuring regulatory compliance.

---

## Data Handling Principles

### 1. Data Minimization

We follow a **minimal data collection** approach:

| Data Collected | Purpose | Storage |
|----------------|---------|---------|
| Verification status | Track if user is verified | Permanent |
| Verifier ID | Audit trail - who verified | Permanent |
| Venue ID | Where verification occurred | Permanent |
| Verification method | in_person or document_upload | Permanent |
| Staff notes | Context (e.g., "State ID") | Permanent |
| Timestamp | When verified | Permanent |

**NOT Stored:**
- Copies of ID documents (unless explicitly uploaded)
- Social Security numbers
- Full ID numbers
- Biometric data

### 2. Verification Process

The KYC verification is designed for **in-person verification**:

1. User visits a physical venue
2. Staff requests government-issued ID
3. Staff visually confirms:
   - Photo matches user
   - ID is not expired
   - User is 18+ years old
4. Staff marks user as verified in the system
5. Staff optionally adds notes (e.g., "TN Driver's License")

**No digital ID copies are required or stored by default.**

---

## Access Control Matrix

| Role | KYC_VERIFY | KYC_VIEW_PENDING | KYC_VIEW_HISTORY | KYC_REJECT | KYC_MANAGE |
|------|------------|------------------|------------------|------------|------------|
| super_admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| gambino_ops | ✅ | ✅ | ✅ | ✅ | ❌ |
| venue_manager | ✅ | ✅ | ✅ | ✅ | ❌ |
| venue_staff | ✅ | ✅ | ❌ | ❌ | ❌ |
| operator | ❌ | ❌ | ❌ | ❌ | ❌ |
| user | ❌ | ❌ | ❌ | ❌ | ❌ |

### Permission Descriptions

- **KYC_VERIFY**: Can verify a user's identity
- **KYC_VIEW_PENDING**: Can see users awaiting verification
- **KYC_VIEW_HISTORY**: Can see verification history and statistics
- **KYC_REJECT**: Can reject a verification (fraud detection)
- **KYC_MANAGE**: Compliance management (reset, expire, purge data)

---

## KYC Rewards

### Reward Distribution

When venue staff verifies a user, rewards are distributed:

| Recipient | Amount | Source | Notes |
|-----------|--------|--------|-------|
| **User** | 25 GG | In-app balance | Credited immediately to `gambinoBalance` |
| **Venue** | 25 GG | VenueKycReward queue | Queued for blockchain distribution |

### Referral Bonus (If Applicable)

If the verified user was referred, additional referral rewards are triggered:

| Recipient | Amount | Notes |
|-----------|--------|-------|
| **User** | +100 GG | On top of 25 GG KYC bonus |
| **Referrer** | 150-350 GG | Based on referrer's tier |
| **Venue** | +50 GG | On top of 25 GG KYC bonus |

### Total Potential Rewards

| Scenario | User | Referrer | Venue |
|----------|------|----------|-------|
| KYC only (no referral) | 25 GG | - | 25 GG |
| KYC + Referral (Bronze) | 125 GG | 250 GG | 75 GG |
| KYC + Referral (Silver) | 125 GG | 300 GG | 75 GG |
| KYC + Referral (Gold) | 125 GG | 350 GG | 75 GG |

---

## Audit Logging

All KYC actions are logged with:

```javascript
{
  action: 'KYC_VERIFIED' | 'KYC_REJECTED' | 'KYC_RESET' | 'KYC_EXPIRED' | 'KYC_DOCS_PURGED',
  userId: ObjectId,           // User being verified
  performedBy: ObjectId,      // Staff who performed action
  performedByEmail: String,   // Email of staff
  venueId: String,           // Where it happened
  timestamp: Date,
  ipAddress: String,          // Request IP
  userAgent: String,          // Browser/device info
  notes: String              // Additional context
}
```

Logs are stored in:
1. Application logs (Winston/PM2)
2. Database fields on User model (`kycNotes`)
3. VenueKycReward collection (reward audit trail)

---

## Data Retention Policy

### Current Implementation

| Data Type | Retention | Purge Method |
|-----------|-----------|--------------|
| Verification status | Indefinite | Manual reset via KYC_MANAGE |
| Verification metadata | Indefinite | Manual purge via KYC_MANAGE |
| ID documents (if uploaded) | Until verified | Auto-purge recommended |
| Audit logs | Indefinite | Manual archive |

### Recommended Retention Schedule

For compliance, consider implementing:

1. **Document Purge**: Auto-delete uploaded ID documents 30 days after verification
2. **Log Rotation**: Archive audit logs older than 7 years
3. **Account Deletion**: On user account deletion, anonymize KYC data:
   - Keep: Verification date, venue (for statistics)
   - Delete: Verifier name, notes, IP address

---

## User Rights

### Right to Access

Users can view their own KYC status via:
```
GET /api/kyc/user/:userId
```

Response includes:
- KYC status (pending, verified, rejected, expired)
- When verified
- Where verified (venue)
- Verification method

### Right to Correction

If KYC status is incorrect:
1. User contacts support
2. super_admin can reset KYC status
3. User re-verifies at venue

### Right to Deletion

On request, super_admin can:
```
PUT /api/kyc/manage/:userId
{
  "action": "purge_documents",
  "notes": "User requested data deletion"
}
```

This removes uploaded documents but preserves:
- Verification status (for regulatory compliance)
- Anonymized audit trail

---

## Regulatory Considerations

### Age Verification

- All users must be 18+ to play
- KYC verification confirms age via government ID
- Date of birth collected at registration

### Anti-Money Laundering (AML)

The KYC system supports AML compliance by:
- Requiring in-person verification
- Creating audit trail of verifications
- Enabling suspicious activity reporting (KYC_REJECT)

### Tennessee Amusement Machine Regulations

Tennessee regulates amusement machines. Key requirements:
- Age verification (18+ for skill games)
- Location tracking (which venue)
- Operator accountability (audit trail)

The KYC system satisfies these by:
- Mandatory age verification before play
- Recording verification venue
- Full audit trail of verifications

---

## Security Measures

### Data Encryption

| Data | At Rest | In Transit |
|------|---------|------------|
| KYC status | MongoDB encryption | TLS 1.3 |
| IP addresses | Hashed (optional) | TLS 1.3 |
| ID documents | Server-side encryption | TLS 1.3 |

### Rate Limiting

```javascript
// KYC verification rate limit
{
  windowMs: 60 * 1000,  // 1 minute
  max: 10,              // 10 verifications per minute per staff
}
```

Prevents mass verification attacks.

### Fraud Detection

Suspicious patterns flagged:
- Same IP verifying multiple users
- Verification without referral (if required)
- Rapid sequential verifications
- Verification from unusual locations

---

## API Endpoints Reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/kyc/verify` | POST | venue_staff+ | Verify a user |
| `/api/kyc/venues` | GET | venue_staff+ | List venues for verification dropdown |
| `/api/kyc/pending` | GET | venue_staff+ | List pending users |
| `/api/kyc/history` | GET | venue_manager+ | Verification history |
| `/api/kyc/stats` | GET | gambino_ops+ | KYC statistics |
| `/api/kyc/reject/:userId` | PUT | venue_manager+ | Reject verification |
| `/api/kyc/user/:userId` | GET | self/staff | Check status |
| `/api/kyc/manage/:userId` | PUT | super_admin | Compliance actions |

### Age Verification

Separate from KYC, users can also have age verification status tracked:

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/admin/users/:userId` | PUT | MANAGE_USERS | Update user including `isAgeVerified` |
| `/api/admin/users/:userId/verify-age` | POST | MANAGE_USERS | Toggle age verification |

Age verification fields:
- `isAgeVerified`: Boolean
- `ageVerifiedAt`: Date
- `ageVerifiedBy`: ObjectId (staff who verified)

---

## Future Considerations

### Document Upload Verification

If document upload verification is needed:
1. Implement secure document upload
2. Add document encryption
3. Set retention limits (30-90 days)
4. Consider third-party KYC provider integration

### Third-Party KYC Providers

For enhanced verification:
- Jumio
- Onfido
- Persona

These provide:
- Document authenticity verification
- Liveness detection
- Fraud scoring

### Compliance Automation

Consider implementing:
1. Scheduled document purge jobs
2. Automated log archival
3. Compliance reporting dashboard
4. Regular access reviews

---

## Contact

For compliance questions:
- **Data Protection**: Gambino Gold Operations
- **Technical Support**: Development Team
- **Regulatory**: Legal Counsel

---

*Last Updated: 2026-01-13*
*Version: 1.2*

### Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-13 | Initial KYC compliance documentation |
| 1.1 | 2026-01-13 | Added KYC Rewards section with user bonus (25 GG) |
| 1.2 | 2026-01-13 | Added venues endpoint, age verification section |

# REFERRAL EMISSION FRAMEWORK

**Version**: 2.0
**Created**: 2026-01-12
**Updated**: 2026-01-13
**Status**: Implemented - KYC-Based Verification

---

## Executive Summary

This document defines the token emission model for the Gambino referral program, designed to drive network growth while maintaining sustainable treasury management over a 15+ year runway.

---

## 1. Treasury Allocation

### On-Chain Verified Balances (2026-01-12)

| Wallet | Purpose | Balance | % of Supply |
|--------|---------|---------|-------------|
| Mining/Jackpot | User rewards | 489,505,000 GG | 63.0% |
| Founder/Team | Team allocation | 139,815,000 GG | 18.0% |
| Main Treasury | Mint authority | 77,700,000 GG | 10.0% |
| Operations | Platform expenses | 34,013,999 GG | 4.4% |
| **Community** | **Network growth (referrals)** | **33,965,000 GG** | **4.4%** |
| Fee Payer | Transaction fees | 0.0173 SOL | - |
| **Total Treasury** | | **774,998,999 GG** | **99.74%** |
| Circulating | | ~2,001,001 GG | 0.26% |

### Designated Referral Pool

**Source**: Community Wallet (`52GwwDvvdaKxJk39J6QMQ72aqD3LYe49hHdKfJZW7d8q`)
**Initial Balance**: 33,965,000 GG
**Purpose**: Network growth, referrals, community incentives

---

## 2. Emission Model

### Monthly Emission Rate

| Parameter | Value | Notes |
|-----------|-------|-------|
| Base Rate | 0.5% of Community pool | Percentage of remaining balance |
| Initial Monthly Pool | ~169,825 GG | 33,965,000 × 0.5% |
| Emission Type | Asymptotic decay | Never fully depletes |

### Runway Projections

| Year | Monthly Emission | Cumulative Distributed | Pool Remaining |
|------|------------------|------------------------|----------------|
| 1 | ~169,825 → 159,900 | ~1,980,000 GG | ~31,985,000 GG |
| 5 | ~126,000 | ~8,500,000 GG | ~25,465,000 GG |
| 10 | ~94,000 | ~14,200,000 GG | ~19,765,000 GG |
| 15 | ~70,000 | ~18,100,000 GG | ~15,865,000 GG |

**Key Insight**: Percentage-based emissions create natural decay - the pool never fully depletes but emission rates decrease as adoption grows.

### Budget vs. Payout Separation

**This distinction is critical for understanding the system.**

The Community wallet emits **0.5% of its balance monthly** as the **Network Growth Budget**. Individual referral payouts are **fixed amounts** (250/100/50 GG) for predictable UX. When monthly budget is exhausted, pending referrals queue for the next distribution cycle.

This creates a self-regulating system:
- **Percentage controls sustainability** — The pool can never be drained faster than 0.5%/month
- **Fixed amounts control user expectations** — Users always know "Refer a friend, get 250 GG"

```
┌─────────────────────────────────────────────────────────────────┐
│                    BUDGET vs. PAYOUT MODEL                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Community Pool Balance: 33,965,000 GG                        │
│                    │                                            │
│                    ▼                                            │
│   ┌─────────────────────────────────────┐                      │
│   │  Monthly Budget = Balance × 0.5%    │                      │
│   │  = 33,965,000 × 0.005               │                      │
│   │  = 169,825 GG available this month  │                      │
│   └─────────────────────────────────────┘                      │
│                    │                                            │
│                    ▼                                            │
│   ┌─────────────────────────────────────┐                      │
│   │  Fixed Payout per Referral: 400 GG  │                      │
│   │  (250 referrer + 100 new + 50 venue)│                      │
│   └─────────────────────────────────────┘                      │
│                    │                                            │
│                    ▼                                            │
│   ┌─────────────────────────────────────┐                      │
│   │  Max Referrals = Budget / Payout    │                      │
│   │  = 169,825 / 400                    │                      │
│   │  = 424 referrals this month         │                      │
│   └─────────────────────────────────────┘                      │
│                    │                                            │
│         ┌─────────┴─────────┐                                  │
│         ▼                   ▼                                  │
│   ┌───────────┐       ┌───────────┐                           │
│   │ Budget OK │       │ Budget    │                           │
│   │ Distribute│       │ Exhausted │                           │
│   │ Immediately│      │ Queue for │                           │
│   └───────────┘       │ Next Month│                           │
│                       └───────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why this matters:**
- **For Robert's review**: Emissions are percentage-capped, not unlimited
- **For debugging**: Explains why referrals may stop paying out at month-end
- **For venue communication**: "Your allocation comes from a monthly budget pool"

---

## 3. Referral Rewards Structure

### Per-Referral Distribution

| Recipient | Amount | Purpose |
|-----------|--------|---------|
| Referrer | 250 GG | Incentivize existing users to invite |
| New User | 100 GG | Welcome bonus, reduces friction |
| Venue Bonus | 50 GG | Reward venue for facilitating |
| **Total** | **400 GG** | Per successful referral |

### Monthly Capacity

| Metric | Value |
|--------|-------|
| Monthly Pool | ~169,825 GG |
| Cost per Referral | 400 GG |
| **Network-wide Capacity** | **~424 referrals/month** |

---

## 4. Venue Tier Caps

To prevent single venues from draining the pool, monthly caps apply:

| Tier | Monthly Cap | Referrals @ 400 GG | Requirements |
|------|-------------|-------------------|--------------|
| Bronze | 10,000 GG | ~25 referrals | Default |
| Silver | 20,000 GG | ~50 referrals | 3+ months active, good standing |
| Gold | 35,000 GG | ~87 referrals | 6+ months, top performer |

### Tier Allocation Math

At full capacity with mixed tiers:
- 10 Bronze venues × 25 = 250 referrals
- 5 Silver venues × 50 = 250 referrals
- 2 Gold venues × 87 = 174 referrals
- **Total**: 674 referrals/month (exceeds base capacity)

This ensures competition for limited pool creates urgency.

---

## 5. Auto-Adjustment Safeguards

### Threshold-Based Rate Adjustment

To ensure long-term sustainability, rates auto-adjust based on pool levels:

| Pool Balance | Action | New Monthly Rate |
|--------------|--------|------------------|
| > 30M GG | Standard | 0.5% |
| 25-30M GG | Warning | 0.4% |
| 20-25M GG | Reduced | 0.3% |
| 15-20M GG | Conservative | 0.2% |
| < 15M GG | Minimal | 0.1% |

### Quarterly Review Triggers

Automatic review if any of the following occur:
- Pool drops below 25M GG
- Monthly referrals exceed 500 for 3 consecutive months
- Single venue exceeds 40% of monthly emissions

### Emergency Measures

If pool drops below 10M GG:
1. Pause new venue onboarding to referral program
2. Reduce per-referral amounts by 50%
3. Evaluate top-up from Mining/Jackpot wallet

### Budget Overflow Handling

If referral demand exceeds monthly budget before month-end:

1. **Queue excess referrals** as `status: 'pending_budget'`
2. **Distribute queued referrals first** on next month's cycle (FIFO order)
3. **If sustained overflow** (3+ consecutive months):
   - Evaluate topping up Community wallet from Mining/Jackpot reserve
   - Consider reducing per-referral amounts
   - Review venue tier caps for optimization

**This is a "good problem"** — it means network growth is exceeding projections. The queue mechanism ensures no referral is lost, just delayed.

```javascript
// Budget check before distribution
async function canDistributeReferral() {
  const communityBalance = await getCommunityWalletBalance();
  const monthlyBudget = communityBalance * 0.005;

  const thisMonth = getMonthStart();
  const distributedThisMonth = await Referral.aggregate([
    { $match: { status: 'distributed', distributedAt: { $gte: thisMonth } } },
    { $group: {
        _id: null,
        total: { $sum: {
          $add: ['$amounts.referrer', '$amounts.newUser', '$amounts.venue']
        }}
    }}
  ]);

  const remaining = monthlyBudget - (distributedThisMonth[0]?.total || 0);
  return {
    canDistribute: remaining >= 400,
    remainingBudget: remaining,
    monthlyBudget
  };
}
```

---

## 6. Eligibility Requirements

### Referrer Requirements
- Active Gambino account for 30+ days
- At least 1 verified session
- Not flagged for abuse

### New User Requirements
- First-time Gambino registration
- **In-person KYC verification by venue staff** (REQUIRED)
- KYC within 14 days of registration

### Venue Requirements
- Active venue in good standing
- Connected to Gambino network
- Staff trained on referral process
- Staff have `verify_user_age` permission

---

## 6.1 KYC Verification System (NEW)

### What is KYC Verification?

KYC (Know Your Customer) verification is the process where venue staff verify a user's identity in person by checking their government-issued ID. This replaces the previous session-based verification.

### How It Works

```
User signs up with referral code
      │
      └─→ Referral status: 'pending'
              │
              ▼
User visits venue, staff checks ID
      │
      └─→ POST /api/kyc/verify (by venue_staff/venue_manager/gambino_ops)
              │
              ├─→ User.kycStatus = 'verified'
              ├─→ User.gambinoBalance += 25 GG (user KYC bonus)
              ├─→ Venue gets 25 GG (venue KYC bonus)
              ├─→ Referral.status = 'verified' (if has pending referral)
              └─→ If referral: trigger full referral rewards
```

### KYC Rewards

| Recipient | Amount | Trigger |
|-----------|--------|---------|
| **User** | 25 GG | Every KYC verification |
| **Venue** | 25 GG | Every KYC verification |

These are **base rewards** that apply to ALL users who get KYC verified, regardless of whether they were referred.

### KYC + Referral Combined Rewards

When a KYC'd user also has a pending referral:

| Recipient | KYC Reward | Referral Reward | Total |
|-----------|------------|-----------------|-------|
| **New User** | 25 GG | 100 GG | **125 GG** |
| **Referrer** | - | 150-350 GG (tier) | **150-350 GG** |
| **Venue** | 25 GG | 50 GG | **75 GG** |

### API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/kyc/verify` | POST | venue_staff+ | KYC verify a user |
| `/api/kyc/pending` | GET | venue_staff+ | List users needing KYC |
| `/api/kyc/history` | GET | venue_manager+ | Venue's KYC history |
| `/api/kyc/stats` | GET | gambino_ops+ | KYC statistics |

See `docs/KYC_COMPLIANCE.md` for full compliance documentation

---

## 7. Anti-Abuse Measures

### Detection Rules
- Max 5 referrals per referrer per day
- IP-based duplicate detection
- Device fingerprinting
- Referrer-referee relationship validation

### Penalties
- First offense: Warning, referral voided
- Second offense: 30-day referral suspension
- Third offense: Permanent referral ban

### Clawback Provisions
- Tokens clawed back if new user doesn't complete first session within 14 days
- Tokens clawed back if abuse detected within 90 days

---

## 8. Implementation Phases

### Phase 1: Pilot (Month 1-2)
- 3 select venues only
- Manual token distribution
- Gather feedback, refine process

### Phase 2: Controlled Rollout (Month 3-4)
- Expand to 10 venues
- Semi-automated distribution
- Implement basic abuse detection

### Phase 3: Full Launch (Month 5+)
- All venues eligible
- Fully automated smart contract distribution
- Advanced fraud detection

---

## 9. Technical Integration

### Smart Contract Requirements
- SPL Token transfer from Community wallet
- Multi-sig approval for distributions > 10,000 GG
- On-chain logging of all referral events

### Backend Integration
- `POST /api/referral/register` - Register new referral
- `POST /api/referral/verify` - Verify eligibility
- `POST /api/referral/distribute` - Trigger distribution
- `GET /api/referral/stats` - Venue referral dashboard

### Database Schema
```javascript
{
  referralId: ObjectId,
  referrerId: ObjectId,
  newUserId: ObjectId,
  venueId: String,
  status: enum['pending', 'pending_budget', 'verified', 'distributed', 'clawed_back', 'rejected'],
  amounts: {
    referrer: Number,
    newUser: Number,
    venue: Number
  },
  distributedAt: Date,
  txSignature: String,
  createdAt: Date
}
```

---

## 10. Reporting & Monitoring

### Weekly Reports
- Total referrals by venue
- Pool balance trend
- Abuse detection alerts

### Monthly Reports
- Emission rate vs projection
- Venue tier performance
- ROI analysis (new users → revenue)

### Dashboards
- Real-time pool balance
- Referral leaderboard
- Geographic distribution

---

## Appendix A: Wallet Addresses

| Wallet | Address | Token Account |
|--------|---------|---------------|
| Community (Referral Source) | `52GwwDvvdaKxJk39J6QMQ72aqD3LYe49hHdKfJZW7d8q` | `3wRvme78M4G8YLFT2xHqRdgjhH7rcJtZ2Ajj2uEBQzvW` |
| GG Token Mint | `Cd2wZyKVdWuyuJJHmeU1WmfSKNnDHku2m6mt6XFqGeXn` | - |

---

## Appendix B: Legal Terminology

Per Gambino compliance guidelines, all communications must use:
- "Token emission" not "reward/payout"
- "Receive tokens" not "earn"
- "Network growth incentive" not "referral bonus"

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-12 | System | Initial framework based on on-chain treasury analysis |
| 1.1 | 2026-01-12 | System | Added Budget vs. Payout Separation section, Budget Overflow Handling, `pending_budget` status |
| 2.0 | 2026-01-13 | System | **KYC-Based Verification**: Replaced session-based verification with in-person KYC by venue staff. Added KYC rewards (25 GG user, 25 GG venue). Backend API implemented. |

---

**Implementation Status**:
1. [x] Backend API implementation (`/api/kyc/*` routes)
2. [x] KYC verification model (`VenueKycReward`)
3. [x] RBAC permissions added
4. [x] Admin UI (`/admin/kyc` page)
5. [x] Compliance documentation (`docs/KYC_COMPLIANCE.md`)
6. [ ] Legal review of referral terms
7. [ ] Smart contract development (token distribution)
8. [ ] Pilot venue selection
9. [ ] Staff training materials

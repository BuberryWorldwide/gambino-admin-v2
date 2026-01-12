# REFERRAL PROGRAM TECHNICAL IMPLEMENTATION PLAN

**Version**: 1.0
**Created**: 2026-01-12
**Status**: Draft - Ready for Development
**Related Document**: [REFERRAL_EMISSION_FRAMEWORK.md](./REFERRAL_EMISSION_FRAMEWORK.md)

---

## Executive Summary

This document provides the technical blueprint for implementing the Gambino referral program across the user-facing app (`gambino-users`) and backend (`gambino-system/backend`). The implementation leverages existing infrastructure while adding new UI components and API endpoints.

---

## 1. Current Infrastructure Audit

### 1.1 Backend - Already Exists ✅

**User Model Fields** (`backend/src/models/User.js:116-120`)
```javascript
// Referral System - ALREADY EXISTS
referralCode: { type: String, unique: true, sparse: true },
referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
referralRewards: { type: Number, default: 0 }
```

**Existing Auto-Generation** (`User.js:186-189`)
```javascript
// Generate referral code if not exists
if (!this.referralCode && this.isVerified) {
  this.referralCode = this.generateReferralCode(); // GMB + 6 chars
}
```

### 1.2 Frontend - Needs Implementation ❌

| Component | Status | Required Work |
|-----------|--------|---------------|
| Dashboard Referral Tab | ❌ Missing | New tab with QR, stats, history |
| Onboard Referral Input | ❌ Missing | Accept `?ref=` param on registration |
| Referral Leaderboard | ❌ Missing | New page or extend existing |
| API Integration | ❌ Missing | New endpoints in api.js |

---

## 2. Architecture Design

### 2.1 Component Hierarchy

```
gambino-users/
├── src/app/
│   ├── dashboard/
│   │   └── components/tabs/
│   │       ├── OverviewTab.js    (existing - add referral stats widget)
│   │       ├── WalletTab.js      (existing)
│   │       ├── AccountTab.js     (existing)
│   │       └── ReferralTab.js    [NEW] - Main referral management
│   │
│   ├── onboard/
│   │   └── page.js               (modify - add referral code input)
│   │
│   └── leaderboard/
│       ├── page.js               (existing - GAMBINO balance)
│       └── referrals/
│           └── page.js           [NEW] - Referral leaderboard
│
├── src/components/
│   └── referral/                  [NEW DIRECTORY]
│       ├── ReferralQRCode.js      - QR code display with rotation
│       ├── ReferralStats.js       - Stats cards component
│       ├── ReferralHistory.js     - List of successful referrals
│       ├── ReferralShareModal.js  - Share options modal
│       └── ReferralTierBadge.js   - User tier indicator
│
├── src/lib/
│   ├── api.js                    (modify - add referralAPI namespace)
│   └── useReferral.js            [NEW] - Custom hook for referral data
```

### 2.2 Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            REFERRAL DATA FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   REFERRER   │────▶│   QR CODE    │────▶│   NEW USER   │                │
│  │ (Existing)   │     │   + LINK     │     │ (Scanning)   │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│         │                                          │                        │
│         │                                          │                        │
│         ▼                                          ▼                        │
│  ┌──────────────┐                          ┌──────────────┐                │
│  │  Dashboard   │                          │   Onboard    │                │
│  │ ReferralTab  │                          │    Page      │                │
│  │ - View code  │                          │ - ?ref=XXX   │                │
│  │ - View QR    │                          │ - Validate   │                │
│  │ - View stats │                          │ - Register   │                │
│  └──────────────┘                          └──────────────┘                │
│         │                                          │                        │
│         │                                          │                        │
│         ▼                                          ▼                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          BACKEND API                                 │   │
│  │  POST /api/referral/validate    - Check if code is valid            │   │
│  │  POST /api/referral/apply       - Apply code to new user            │   │
│  │  GET  /api/referral/stats       - Get referrer statistics           │   │
│  │  GET  /api/referral/history     - Get referral history              │   │
│  │  POST /api/referral/rotate      - Rotate QR/code (optional)         │   │
│  │  GET  /api/referral/leaderboard - Top referrers                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                          │                        │
│         │                                          │                        │
│         ▼                                          ▼                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        MONGODB (users collection)                    │   │
│  │  referralCode: "GMB123456"                                          │   │
│  │  referredBy: ObjectId("...")                                        │   │
│  │  referrals: [ObjectId("..."), ...]                                  │   │
│  │  referralRewards: 1500                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         │ (On eligibility verification)                                     │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SOLANA TOKEN DISTRIBUTION                         │   │
│  │  Community Wallet (52GwwDvvdaK...) ──▶ Referrer (250 GG)            │   │
│  │                                   ──▶ New User (100 GG)             │   │
│  │                                   ──▶ Venue    (50 GG)              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend Implementation

### 3.1 New ReferralTab Component

**File**: `src/app/dashboard/components/tabs/ReferralTab.js`

```javascript
'use client';

import { useState, useEffect } from 'react';
import { useReferral } from '@/lib/useReferral';
import ReferralQRCode from '@/components/referral/ReferralQRCode';
import ReferralStats from '@/components/referral/ReferralStats';
import ReferralHistory from '@/components/referral/ReferralHistory';
import ReferralShareModal from '@/components/referral/ReferralShareModal';

export default function ReferralTab({ profile, setError, setSuccess }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const { stats, history, loading, refresh } = useReferral(profile?.referralCode);

  const referralUrl = profile?.referralCode
    ? `https://gambino.gold/register?ref=${profile.referralCode}`
    : null;

  // Tier-based rewards display
  const getTierRewards = (tier) => {
    const tiers = {
      'gold': { referrer: 350, newUser: 100, venue: 50, total: 500 },
      'silver': { referrer: 300, newUser: 100, venue: 50, total: 450 },
      'bronze': { referrer: 250, newUser: 100, venue: 50, total: 400 },
      'none': { referrer: 150, newUser: 100, venue: 50, total: 300 }
    };
    return tiers[tier] || tiers.none;
  };

  const rewards = getTierRewards(profile?.tier);

  return (
    <div className="space-y-6">
      {/* Referral Code & QR Section */}
      <div className="bg-gradient-to-br from-yellow-900/30 to-amber-900/30
                      border border-yellow-500/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Your Referral Code</h3>
          <span className="px-3 py-1 bg-yellow-500/20 rounded-full text-yellow-400 text-sm">
            {profile?.tier?.toUpperCase() || 'NONE'} Tier
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* QR Code */}
          <div className="flex flex-col items-center">
            <ReferralQRCode
              code={profile?.referralCode}
              url={referralUrl}
              rotating={false}  // Set true for rotating codes
            />
            <p className="mt-3 font-mono text-2xl text-yellow-400 tracking-wider">
              {profile?.referralCode || 'Generating...'}
            </p>
          </div>

          {/* Share Actions */}
          <div className="flex flex-col justify-center space-y-3">
            <button
              onClick={() => navigator.clipboard.writeText(referralUrl)}
              className="w-full py-3 bg-neutral-800 hover:bg-neutral-700
                         text-white rounded-lg transition-colors"
            >
              Copy Referral Link
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-600
                         hover:from-yellow-400 hover:to-amber-500
                         text-black font-semibold rounded-lg transition-colors"
            >
              Share & Invite Friends
            </button>
          </div>
        </div>
      </div>

      {/* Rewards Info */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Referral Rewards</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-neutral-800/50 rounded-lg">
            <p className="text-xs text-neutral-500 uppercase mb-1">You Receive</p>
            <p className="text-xl font-bold text-yellow-400">{rewards.referrer} GG</p>
          </div>
          <div className="p-3 bg-neutral-800/50 rounded-lg">
            <p className="text-xs text-neutral-500 uppercase mb-1">Friend Gets</p>
            <p className="text-xl font-bold text-green-400">{rewards.newUser} GG</p>
          </div>
          <div className="p-3 bg-neutral-800/50 rounded-lg">
            <p className="text-xs text-neutral-500 uppercase mb-1">Venue Gets</p>
            <p className="text-xl font-bold text-blue-400">{rewards.venue} GG</p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <ReferralStats stats={stats} loading={loading} />

      {/* History Section */}
      <ReferralHistory history={history} loading={loading} />

      {/* Share Modal */}
      {showShareModal && (
        <ReferralShareModal
          code={profile?.referralCode}
          url={referralUrl}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
```

### 3.2 Dashboard Tab Integration

**File to Modify**: `src/app/dashboard/page.js`

```javascript
// Add to TABS array
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'referral', label: 'Referrals' },  // [NEW]
  { id: 'account', label: 'Account' }
];

// Add import
import ReferralTab from './components/tabs/ReferralTab';

// Add to tab content render
{activeTab === 'referral' && (
  <ReferralTab
    profile={profile}
    setError={setError}
    setSuccess={setSuccess}
  />
)}
```

### 3.3 Onboard Page Modification

**File to Modify**: `src/app/onboard/page.js`

```javascript
// Add at top of component
const searchParams = useSearchParams();
const referralCode = searchParams.get('ref');

// Add state
const [referrerInfo, setReferrerInfo] = useState(null);
const [validatingReferral, setValidatingReferral] = useState(false);

// Validate referral code on mount
useEffect(() => {
  if (referralCode) {
    validateReferralCode(referralCode);
  }
}, [referralCode]);

const validateReferralCode = async (code) => {
  setValidatingReferral(true);
  try {
    const { data } = await api.post('/api/referral/validate', { code });
    if (data.valid) {
      setReferrerInfo(data.referrer);
    }
  } catch (err) {
    console.error('Invalid referral code:', err);
  } finally {
    setValidatingReferral(false);
  }
};

// Add to registration form submission
const handleRegister = async (formData) => {
  // Include referral code if valid
  const payload = {
    ...formData,
    referralCode: referrerInfo ? referralCode : undefined
  };

  await api.post('/api/users/register', payload);
};

// Add UI display for referral banner
{referrerInfo && (
  <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
    <p className="text-yellow-400 text-sm">
      Referred by <span className="font-semibold">{referrerInfo.firstName}</span>
    </p>
    <p className="text-neutral-400 text-xs mt-1">
      You'll both receive bonus tokens after your first mining session!
    </p>
  </div>
)}
```

### 3.4 ReferralQRCode Component

**File**: `src/components/referral/ReferralQRCode.js`

```javascript
'use client';

import { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';

export default function ReferralQRCode({ code, url, rotating = false, rotationInterval = 300000 }) {
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [currentCode, setCurrentCode] = useState(code);

  // Generate QR code image
  useEffect(() => {
    if (!url) return;

    QRCode.toDataURL(url, {
      width: 200,
      margin: 2,
      color: {
        dark: '#eab308',  // Yellow
        light: '#171717'  // Dark background
      }
    }).then(setQrDataUrl);
  }, [url]);

  // Optional: Rotating codes (for enhanced security)
  useEffect(() => {
    if (!rotating) return;

    const interval = setInterval(() => {
      // Request new rotating code from API
      // This is optional and depends on security requirements
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [rotating, rotationInterval]);

  return (
    <div className="relative">
      {qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt="Referral QR Code"
          className="w-48 h-48 rounded-lg"
        />
      ) : (
        <div className="w-48 h-48 bg-neutral-800 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        </div>
      )}

      {rotating && (
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-yellow-400">
          Rotating
        </div>
      )}
    </div>
  );
}
```

### 3.5 useReferral Custom Hook

**File**: `src/lib/useReferral.js`

```javascript
'use client';

import { useState, useEffect, useCallback } from 'react';
import api, { referralAPI } from './api';

export function useReferral(referralCode) {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!referralCode) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [statsRes, historyRes] = await Promise.all([
        referralAPI.getStats(),
        referralAPI.getHistory()
      ]);

      setStats(statsRes.data);
      setHistory(historyRes.data.referrals || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [referralCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    stats,
    history,
    loading,
    error,
    refresh: fetchData
  };
}

export default useReferral;
```

### 3.6 API Layer Extension

**File to Modify**: `src/lib/api.js`

```javascript
// Add new referralAPI namespace
export const referralAPI = {
  // Validate a referral code
  validate: (code) => api.post('/api/referral/validate', { code }),

  // Get current user's referral statistics
  getStats: () => api.get('/api/referral/stats'),

  // Get referral history (people you've referred)
  getHistory: (page = 1, limit = 20) =>
    api.get(`/api/referral/history?page=${page}&limit=${limit}`),

  // Get referral leaderboard
  getLeaderboard: (timeframe = 'all') =>
    api.get(`/api/referral/leaderboard?timeframe=${timeframe}`),

  // Request code rotation (optional feature)
  rotateCode: () => api.post('/api/referral/rotate'),

  // Track referral share event (analytics)
  trackShare: (platform) =>
    api.post('/api/referral/track-share', { platform })
};

// Export with main api
export default api;
```

---

## 4. Backend Implementation

### 4.1 New API Routes

**File**: `backend/src/routes/referralRoutes.js` [NEW]

```javascript
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const Referral = require('../models/Referral');  // New model

// Validate referral code (public endpoint)
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || code.length < 6) {
      return res.status(400).json({ valid: false, error: 'Invalid code format' });
    }

    const referrer = await User.findOne({
      referralCode: code.toUpperCase(),
      isActive: true,
      isVerified: true
    }).select('firstName tier');

    if (!referrer) {
      return res.status(404).json({ valid: false, error: 'Code not found' });
    }

    res.json({
      valid: true,
      referrer: {
        firstName: referrer.firstName,
        tier: referrer.tier
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Validation failed' });
  }
});

// Get referral statistics (authenticated)
router.get('/stats', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('referralCode referrals referralRewards tier');

    const referralCount = user.referrals?.length || 0;

    // Get pending referrals (awaiting first session)
    const pendingCount = await Referral.countDocuments({
      referrerId: req.user.id,
      status: 'pending'
    });

    // Get verified referrals (completed first session)
    const verifiedCount = await Referral.countDocuments({
      referrerId: req.user.id,
      status: 'distributed'
    });

    // This month's referrals
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyCount = await Referral.countDocuments({
      referrerId: req.user.id,
      createdAt: { $gte: thisMonth }
    });

    res.json({
      code: user.referralCode,
      tier: user.tier,
      totalReferrals: referralCount,
      pendingReferrals: pendingCount,
      verifiedReferrals: verifiedCount,
      monthlyReferrals: monthlyCount,
      totalRewards: user.referralRewards || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get referral history (authenticated)
router.get('/history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const referrals = await Referral.find({ referrerId: req.user.id })
      .populate('newUserId', 'firstName createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Referral.countDocuments({ referrerId: req.user.id });

    res.json({
      referrals: referrals.map(r => ({
        id: r._id,
        newUserName: r.newUserId?.firstName || 'Anonymous',
        status: r.status,
        rewardAmount: r.amounts?.referrer || 0,
        createdAt: r.createdAt,
        distributedAt: r.distributedAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Referral leaderboard (public)
router.get('/leaderboard', async (req, res) => {
  try {
    const { timeframe = 'all' } = req.query;

    let dateFilter = {};
    if (timeframe === 'month') {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      dateFilter = { createdAt: { $gte: thisMonth } };
    } else if (timeframe === 'week') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      dateFilter = { createdAt: { $gte: lastWeek } };
    }

    const leaderboard = await User.aggregate([
      { $match: { isActive: true, 'referrals.0': { $exists: true } } },
      {
        $project: {
          firstName: 1,
          tier: 1,
          referralCount: { $size: '$referrals' },
          referralRewards: 1
        }
      },
      { $sort: { referralCount: -1, referralRewards: -1 } },
      { $limit: 50 }
    ]);

    res.json({
      leaderboard: leaderboard.map((u, i) => ({
        rank: i + 1,
        name: u.firstName,
        tier: u.tier,
        referrals: u.referralCount,
        rewards: u.referralRewards
      })),
      timeframe
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
```

### 4.2 New Referral Model

**File**: `backend/src/models/Referral.js` [NEW]

```javascript
const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referralId: { type: mongoose.Schema.Types.ObjectId, auto: true },

  // Participants
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  newUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true  // Each user can only be referred once
  },
  venueId: {
    type: String,  // storeId
    index: true
  },

  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'pending_budget', 'verified', 'distributed', 'clawed_back', 'rejected'],
    default: 'pending',
    index: true
  },

  // Reward amounts (calculated based on referrer tier)
  amounts: {
    referrer: { type: Number, default: 0 },
    newUser: { type: Number, default: 0 },
    venue: { type: Number, default: 0 }
  },

  // Distribution tracking
  distributedAt: Date,
  txSignature: String,  // Solana transaction signature

  // Verification requirements
  firstSessionAt: Date,
  kycCompletedAt: Date,

  // Clawback tracking
  clawbackReason: String,
  clawbackAt: Date,

  // Metadata
  referralCode: String,  // The code used
  ipAddress: String,     // For abuse detection
  deviceFingerprint: String,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for queries
referralSchema.index({ status: 1, createdAt: -1 });
referralSchema.index({ referrerId: 1, status: 1 });
referralSchema.index({ createdAt: -1 });

// Pre-save hook
referralSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to calculate rewards based on tier
referralSchema.statics.calculateRewards = function(tier) {
  const rewards = {
    'gold': { referrer: 350, newUser: 100, venue: 50 },
    'silver': { referrer: 300, newUser: 100, venue: 50 },
    'bronze': { referrer: 250, newUser: 100, venue: 50 },
    'none': { referrer: 150, newUser: 100, venue: 50 }
  };
  return rewards[tier] || rewards.none;
};

module.exports = mongoose.model('Referral', referralSchema);
```

### 4.3 Registration Flow Modification

**File to Modify**: `backend/src/routes/userRoutes.js`

```javascript
// In POST /register endpoint, add:

// Check for referral code
if (req.body.referralCode) {
  const referrer = await User.findOne({
    referralCode: req.body.referralCode.toUpperCase(),
    isActive: true
  });

  if (referrer) {
    // Link new user to referrer
    newUser.referredBy = referrer._id;

    // Create referral record
    const Referral = require('../models/Referral');
    const rewards = Referral.calculateRewards(referrer.tier);

    await Referral.create({
      referrerId: referrer._id,
      newUserId: newUser._id,
      referralCode: req.body.referralCode.toUpperCase(),
      amounts: rewards,
      status: 'pending',
      ipAddress: req.ip
    });

    // Add to referrer's referrals array
    await User.findByIdAndUpdate(referrer._id, {
      $push: { referrals: newUser._id }
    });
  }
}
```

---

## 5. QR Code Rotation Strategy

### 5.1 Static vs Rotating Codes

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Static Code** | Simple, memorable, easy to share | Can be abused, harder to track source | ✅ Start here |
| **Rotating Code** | Prevents abuse, tracks campaigns | Complex, harder to share verbally | Phase 2 |
| **Hybrid** | Best of both (static + rotating) | More complex | Future consideration |

### 5.2 Recommended Approach: Static with Analytics

For Phase 1, use static codes with enhanced tracking:

```javascript
// QR URL structure with tracking
const qrUrl = `https://gambino.gold/register?ref=${code}&src=${source}`;

// Sources: 'qr', 'link', 'social', 'sms'
// This allows tracking where referrals come from without rotating codes
```

### 5.3 Future: Rotating Code Implementation

If rotating codes are needed later:

```javascript
// User model addition
rotatingCodes: [{
  code: String,
  expiresAt: Date,
  source: String  // 'qr', 'campaign', etc.
}]

// Generate new rotating code
userSchema.methods.generateRotatingCode = function(source, expiresIn = 3600000) {
  const code = `${this.referralCode}-${Date.now().toString(36)}`;
  this.rotatingCodes.push({
    code,
    expiresAt: new Date(Date.now() + expiresIn),
    source
  });
  return code;
};
```

---

## 6. Leaderboard & Analytics

### 6.1 Referral Leaderboard Page

**File**: `src/app/leaderboard/referrals/page.js` [NEW]

```javascript
'use client';

import { useEffect, useState } from 'react';
import { referralAPI } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Users, Trophy, Gift } from 'lucide-react';

export default function ReferralLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeframe, setTimeframe] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [timeframe]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const { data } = await referralAPI.getLeaderboard(timeframe);
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/leaderboard" className="inline-flex items-center gap-2 text-neutral-500 hover:text-white text-sm mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Token Leaderboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent">
              Top Referrers
            </span>
          </h1>
          <p className="text-neutral-400">Users who've grown the Gambino network</p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-2 mb-6">
          {['all', 'month', 'week'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                timeframe === tf
                  ? 'bg-yellow-500 text-black'
                  : 'bg-neutral-800 text-white hover:bg-neutral-700'
              }`}
            >
              {tf === 'all' ? 'All Time' : tf === 'month' ? 'This Month' : 'This Week'}
            </button>
          ))}
        </div>

        {/* Leaderboard Table */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-neutral-800/50 border-b border-neutral-700">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-neutral-400">Rank</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-400">User</th>
                  <th className="text-right py-3 px-4 font-medium text-neutral-400">Referrals</th>
                  <th className="text-right py-3 px-4 font-medium text-neutral-400">Rewards</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {leaderboard.map((user) => (
                  <tr key={user.rank} className="hover:bg-neutral-800/30">
                    <td className="py-3 px-4">
                      <span className={`font-bold ${
                        user.rank === 1 ? 'text-yellow-400' :
                        user.rank === 2 ? 'text-gray-300' :
                        user.rank === 3 ? 'text-orange-400' : 'text-white'
                      }`}>
                        #{user.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{user.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          user.tier === 'gold' ? 'bg-yellow-500/20 text-yellow-400' :
                          user.tier === 'silver' ? 'bg-gray-500/20 text-gray-300' :
                          user.tier === 'bronze' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-neutral-700 text-neutral-400'
                        }`}>
                          {user.tier}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white">
                      {user.referrals}
                    </td>
                    <td className="py-3 px-4 text-right text-yellow-400">
                      {user.rewards?.toLocaleString()} GG
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 6.2 Admin Analytics (gambino-admin-v2)

For the admin panel, add referral analytics dashboard:

- Total referrals (all time, monthly, weekly)
- Referral conversion rate (registrations → first sessions)
- Pool utilization vs. monthly cap
- Top venues by referral volume
- Abuse detection alerts
- Distribution transaction logs

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create `Referral` model in backend
- [ ] Add referral API routes
- [ ] Modify registration to accept referral codes
- [ ] Create `ReferralTab.js` component
- [ ] Add tab to dashboard
- [ ] Basic QR code generation

### Phase 2: Enhancement (Week 3-4)
- [ ] Add referral code input to onboard page
- [ ] Create referral leaderboard page
- [ ] Implement `useReferral` hook
- [ ] Add stats tracking
- [ ] Add share modal with social options

### Phase 3: Distribution (Week 5-6)
- [ ] Integrate Solana token distribution
- [ ] Implement eligibility verification (first session trigger)
- [ ] Add clawback mechanism
- [ ] Create distribution transaction logging

### Phase 4: Analytics (Week 7-8)
- [ ] Admin analytics dashboard
- [ ] Abuse detection rules
- [ ] Venue tier management
- [ ] Monthly reporting automation

---

## 8. Testing Checklist

### Frontend Tests
- [ ] Referral tab renders correctly
- [ ] QR code generates for valid users
- [ ] Share functionality works (copy, social)
- [ ] Stats update after new referral
- [ ] Onboard accepts `?ref=` parameter
- [ ] Invalid codes show appropriate error

### Backend Tests
- [ ] POST /api/referral/validate returns correct response
- [ ] Referral record created on registration
- [ ] Stats endpoint returns accurate counts
- [ ] Leaderboard sorting works correctly
- [ ] Rate limiting prevents abuse

### Integration Tests
- [ ] Full flow: Generate code → Share → Register → Verify → Distribute
- [ ] Tier-based reward calculation
- [ ] Clawback after 14 days with no session

---

## 9. Security Considerations

### Anti-Abuse Measures
1. **Rate Limiting**: Max 5 referrals per referrer per day
2. **IP Detection**: Flag multiple registrations from same IP
3. **Device Fingerprinting**: Prevent multiple accounts per device
4. **Session Verification**: Rewards only after verified first session
5. **Clawback**: 14-day window if new user never plays

### Data Privacy
- Referral codes don't expose PII
- Referrer names partially hidden on public leaderboard
- IP addresses hashed for comparison, not stored raw

---

## 10. Files Summary

### New Files to Create
| File | Type | Purpose |
|------|------|---------|
| `src/app/dashboard/components/tabs/ReferralTab.js` | Frontend | Main referral management tab |
| `src/components/referral/ReferralQRCode.js` | Frontend | QR code display component |
| `src/components/referral/ReferralStats.js` | Frontend | Stats cards component |
| `src/components/referral/ReferralHistory.js` | Frontend | Referral history list |
| `src/components/referral/ReferralShareModal.js` | Frontend | Share options modal |
| `src/lib/useReferral.js` | Frontend | Custom hook for referral data |
| `src/app/leaderboard/referrals/page.js` | Frontend | Referral leaderboard page |
| `backend/src/models/Referral.js` | Backend | Referral tracking model |
| `backend/src/routes/referralRoutes.js` | Backend | Referral API endpoints |

### Files to Modify
| File | Changes |
|------|---------|
| `src/app/dashboard/page.js` | Add Referral tab to TABS array |
| `src/app/onboard/page.js` | Add referral code handling |
| `src/lib/api.js` | Add `referralAPI` namespace |
| `backend/src/routes/userRoutes.js` | Handle referral on registration |
| `backend/src/index.js` | Mount referral routes |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-12 | System | Initial technical plan |

---

**Next Steps**:
1. [ ] Review and approve this plan
2. [ ] Set up development environment
3. [ ] Begin Phase 1 implementation
4. [ ] Schedule code review checkpoints

# Referral Token Distribution System - Implementation Prompt

## Current State

### What's Done
- User registration captures referral codes
- `Referral` model tracks: `referrerId`, `newUserId`, `code`, `status` (pending/completed/rewarded)
- Profile API returns `referredBy` field
- Dashboard shows "Referral Bonus Awaiting!" banner for referred users without wallets
- Referral routes exist at `/api/referral/*`

### Database Models
- **User**: has `walletAddress`, `referredBy`, `referralCode`, `referralRewards`
- **Referral**: tracks each referral relationship and status

## What Needs To Be Built

### 1. Trigger: When to Distribute Tokens?
Options:
- [ ] When new user creates/connects wallet
- [ ] When new user completes first mining session
- [ ] When new user reaches a certain Glück score threshold
- [ ] Manual admin trigger

### 2. Token Distribution Logic
- **Who gets tokens?**
  - Referrer (the person who shared the code)
  - New user (the person who signed up with the code)

- **How much?**
  - Referrer bonus: ??? GG tokens
  - New user bonus: ??? GG tokens

### 3. Treasury/Distribution Wallet
- Where do the tokens come from?
- Is there a treasury wallet with pre-minted GG tokens?
- What's the treasury wallet address?
- Where are the treasury private keys stored?

### 4. Technical Implementation
- Solana SPL token transfer
- Need: treasury keypair, recipient wallet address, token mint address
- Transaction signing and submission
- Error handling and retry logic

## Questions to Answer

1. **What triggers the reward distribution?**
   - Wallet creation? First mining session? Admin approval?

2. **What are the reward amounts?**
   - Referrer gets: ___ GG
   - New user gets: ___ GG

3. **Where is the GG token mint?**
   - Token mint address: ???
   - Decimals: ???

4. **Where is the treasury/distribution wallet?**
   - Already exists or need to create?
   - Private key storage location?

5. **Rate limiting / Anti-abuse?**
   - Max referrals per user?
   - Cooldown periods?
   - Verification requirements?

6. **What happens if distribution fails?**
   - Retry logic?
   - Queue system?
   - Admin notification?

## Proposed Flow

```
1. New user signs up with referral code
   └─> Referral record created (status: 'pending')

2. New user verifies email
   └─> User verified, still pending

3. New user creates/connects wallet
   └─> Trigger: checkAndDistributeReferralRewards()

4. Distribution check:
   - Has wallet? ✓
   - Referral status === 'pending'? ✓
   - Not already rewarded? ✓

5. Execute distribution:
   a. Send X GG to new user's wallet
   b. Send Y GG to referrer's wallet
   c. Update Referral status to 'rewarded'
   d. Update User.referralRewards for referrer
   e. Log transaction hashes

6. Show success message to user
```

## Files That Will Need Changes

### Backend (192.168.1.235:/opt/gambino/backend/)
- `server.js` - Add distribution trigger after wallet creation
- `src/routes/referral.js` - Add distribution endpoint/logic
- New: `src/services/tokenDistribution.js` - SPL token transfer logic

### Frontend (~/vault/gambino-users/)
- `WalletTab.js` - Show referral reward after wallet setup
- `ReferralTab.js` - Show reward history

## Dependencies Needed
```bash
npm install @solana/web3.js @solana/spl-token
```

## Next Steps
1. Answer the questions above
2. Locate/create treasury wallet
3. Determine reward amounts
4. Implement token distribution service
5. Add trigger point in wallet creation flow
6. Test on devnet first
7. Deploy to mainnet

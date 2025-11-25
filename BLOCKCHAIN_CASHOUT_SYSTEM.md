# Blockchain-Backed Cashout System

## Overview

The cashout system has been upgraded to execute **REAL blockchain transactions** on Solana, not just update MongoDB numbers. When a customer cashes out tokens:

1. ✅ **Real on-chain balance** is checked (not MongoDB cache)
2. ✅ **Solana blockchain transfer** executes (User → Treasury)
3. ✅ **Transaction confirmed** on-chain (~30-60 seconds)
4. ✅ **MongoDB updated** to match blockchain reality
5. ✅ **Blockchain proof** stored in transaction record

---

## Architecture

### Custodial Wallet Model

Your system uses **custodial wallets**:
- Backend holds **encrypted private keys** for user wallets
- Users don't need to sign transactions manually
- Backend signs and submits transactions on their behalf
- Private keys encrypted with `WALLET_ENCRYPTION_KEY`

### Flow Diagram

```
Customer Cashout Request
         ↓
[1] Check REAL on-chain balance via Solana RPC
         ↓
[2] Validate (minimums, maximums, daily limits)
         ↓
[3] Decrypt user's private key (from MongoDB)
         ↓
[4] Create SPL token transfer transaction:
    FROM: User's token account
    TO: Treasury "cashoutVault" account
    AMOUNT: X tokens
         ↓
[5] Sign transaction with user's private key
         ↓
[6] Submit to Solana network
         ↓
[7] Wait for confirmation (~30-60 seconds)
         ↓
[8] Update MongoDB (balance cache)
         ↓
[9] Create transaction record with blockchain proof
         ↓
[10] Give customer cash!
```

---

## Implementation Details

### New GambinoTokenService Methods

#### 1. getUserTokenBalance(walletAddress)

**Purpose:** Check REAL on-chain balance

```javascript
const tokenService = new GambinoTokenService();
const result = await tokenService.getUserTokenBalance('9c6e2F...wallet');

// Returns:
{
  success: true,
  balance: 1000.5,           // Human-readable
  balanceRaw: '1000500000',  // Raw with decimals
  tokenAccount: 'token_account_address',
  walletAddress: '9c6e2F...'
}
```

**How it works:**
- Connects to Solana devnet RPC
- Gets user's Associated Token Account for GAMBINO mint
- Calls `getTokenAccountBalance()` on-chain
- Returns REAL balance, not MongoDB cache

#### 2. transferToTreasury(wallet, encryptedKey, amount, memo, pool)

**Purpose:** Transfer tokens FROM user TO treasury (for cashout)

```javascript
const result = await tokenService.transferToTreasury(
  userWalletAddress,
  encryptedPrivateKey,
  10000, // 10,000 GAMBINO tokens
  'Cashout at store XYZ',
  'cashoutVault'
);

// Returns:
{
  success: true,
  txSignature: '4xjkL...blockchain_signature',
  explorerUrl: 'https://explorer.solana.com/tx/4xjkL...',
  confirmation: 'confirmed',
  userTokenAccount: 'user_ata_address',
  treasuryTokenAccount: 'treasury_ata_address'
}
```

**How it works:**
1. Decrypts user's private key
2. Creates SPL token `transfer()` instruction
3. Signs with user's keypair (custodial)
4. Submits to Solana network
5. Waits for confirmation
6. Returns blockchain proof

#### 3. decryptUserKey(encryptedPrivateKey)

**Purpose:** Decrypt user's private key for signing

```javascript
const keyResult = tokenService.decryptUserKey(user.privateKey);
// Returns Solana Keypair object for signing
```

### Updated CashoutService.processCashout()

**Major changes:**

```javascript
// OLD (MongoDB only):
const balance = customer.gambinoBalance; // ❌ Just a number in database

// NEW (Blockchain-backed):
const balanceResult = await tokenService.getUserTokenBalance(customer.walletAddress);
const onChainBalance = balanceResult.balance; // ✅ REAL on-chain balance

// OLD (MongoDB only):
await User.updateOne({ _id: customerId }, { $inc: { gambinoBalance: -tokens } });
// ❌ Just updates database number

// NEW (Blockchain-backed):
const blockchainResult = await tokenService.transferToTreasury(...);
// ✅ Actual blockchain transfer!
// Then update MongoDB to match:
await User.updateOne({ _id: customerId }, { $inc: { gambinoBalance: -tokens } });
```

**Transaction record now includes:**

```javascript
{
  txHash: blockchainResult.txSignature, // REAL Solana TX
  metadata: {
    blockchainTxSignature: '4xjkL...',
    explorerUrl: 'https://explorer.solana.com/tx/4xjkL...',
    userTokenAccount: 'user_ata',
    treasuryTokenAccount: 'treasury_ata',
    treasuryPool: 'cashoutVault',
    confirmation: 'confirmed',
    blockchainVerified: true, // ✅
    balanceBefore: 50000, // On-chain balance
    balanceAfter: 40000,  // On-chain balance
    balanceBeforeCached: 50000, // MongoDB cache
    balanceAfterCached: 40000   // MongoDB cache
  }
}
```

---

## Prerequisites & Setup

### 1. Solana Network Configuration

**Environment variable** (`.env`):

```bash
# Solana RPC endpoint
SOLANA_RPC_URL=https://api.devnet.solana.com
# Or for mainnet:
# SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# GAMBINO token mint address
GAMBINO_MINT_ADDRESS=YourGambinoMintPublicKey...

# Wallet encryption key
WALLET_ENCRYPTION_KEY=your-32-character-encryption-key
```

### 2. Treasury "cashoutVault" Wallet

You need a treasury wallet to receive cashed-out tokens:

```javascript
// Using your CredentialManager
const treasuryKeypair = await credentialManager.getKeypair('cashoutVault', 'CASHOUT_COLLECTION');
```

**Setup:**

```bash
# Generate new treasury wallet for cashouts
node -e "const { Keypair } = require('@solana/web3.js'); const kp = Keypair.generate(); console.log('Public:', kp.publicKey.toString()); console.log('Secret:', Array.from(kp.secretKey));"

# Store in CredentialManager with type 'cashoutVault'
```

**Fund it with SOL** for transaction fees:

```bash
# Devnet:
solana airdrop 1 <TREASURY_PUBLIC_KEY> --url devnet

# Mainnet:
# Transfer SOL from your main wallet
```

### 3. User Wallets Must Exist

**Requirements:**
- Users must have `walletAddress` field populated
- Users must have `privateKey` field (encrypted) populated
- Token account must exist for GAMBINO mint

**Verification script:**

```javascript
// Check if user has proper wallet setup
const user = await User.findById(customerId);

if (!user.walletAddress) {
  throw new Error('Customer does not have a Solana wallet');
}

if (!user.privateKey) {
  throw new Error('Customer wallet private key not found');
}

// Check if token account exists
const tokenService = new GambinoTokenService();
const balance = await tokenService.getUserTokenBalance(user.walletAddress);
// If token account doesn't exist, balance will be 0
```

### 4. Users Need SOL for Gas Fees

**CRITICAL:** Users need a small amount of SOL (~0.001 SOL) to pay transaction fees when cashing out.

**Options:**
1. **Pre-fund all user wallets** with 0.001 SOL when creating them
2. **Subsidize fees** from a fee-payer wallet (requires code changes)
3. **Batch cashouts** to reduce total fees

**Fund user wallets:**

```javascript
// Transfer SOL to user wallet for fees
const { Connection, PublicKey, SystemProgram, Transaction } = require('@solana/web3.js');

async function fundUserWallet(userWalletAddress, amountSOL = 0.001) {
  const connection = new Connection('https://api.devnet.solana.com');
  const payerKeypair = await credentialManager.getKeypair('payer');

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payerKeypair.publicKey,
      toPubkey: new PublicKey(userWalletAddress),
      lamports: amountSOL * 1e9 // Convert SOL to lamports
    })
  );

  const signature = await connection.sendTransaction(transaction, [payerKeypair.keypair]);
  await connection.confirmTransaction(signature);

  console.log(`✅ Funded ${userWalletAddress} with ${amountSOL} SOL`);
}
```

---

## API Changes

### Customer Search

**OLD Response:**

```json
{
  "customers": [
    {
      "balance": 50000 // MongoDB cached balance
    }
  ]
}
```

**NEW Response:**

```json
{
  "customers": [
    {
      "balance": 50000,       // REAL on-chain balance ✅
      "balanceCached": 50000, // MongoDB cache (for comparison)
      "blockchainError": null // Any errors fetching on-chain balance
    }
  ]
}
```

### Customer Balance Detail

**NEW Fields:**

```json
{
  "customer": {
    "balance": 50000,        // On-chain balance
    "balanceCached": 50000,  // MongoDB cache
    "solBalance": 0.001,     // SOL for gas fees
    "walletAddress": "9c6e2F...",
    "blockchainError": null
  }
}
```

### Process Cashout Response

**NEW Fields:**

```json
{
  "transaction": {
    "blockchainTx": "4xjkL...signature",
    "explorerUrl": "https://explorer.solana.com/tx/4xjkL...",
    "customerWallet": "9c6e2F...",
    "blockchainVerified": true,
    "balanceBefore": 50000, // On-chain
    "balanceAfter": 40000   // On-chain
  }
}
```

---

## Frontend Changes

### Receipt Modal

The receipt now shows:

1. ✅ **Blockchain verification badge**
   - "Verified on Solana blockchain"

2. ✅ **Transaction ID** (Solana signature)
   - Full blockchain signature
   - Clickable link to Solana Explorer

3. ✅ **Explorer link**
   - Opens in new tab
   - View transaction on-chain

**Example:**

```
✅ Verified on Solana blockchain

Transaction ID:
4xjkLzP3...blockchain_signature

[View on Solana Explorer ↗]

Customer: John Doe
Tokens Converted: 10,000
Cash to Pay: $10.00
```

---

## Error Handling

### Insufficient SOL for Fees

**Error:**
```
Customer wallet has insufficient SOL for transaction fees.
Please add ~0.001 SOL to wallet.
```

**Solution:**
- Fund user wallet with SOL
- Or implement fee subsidy (payer pays fees)

### Token Account Doesn't Exist

**Error:**
```
Customer token account does not exist or has no balance.
```

**Solution:**
- Create token account for user:

```javascript
const tokenService = new GambinoTokenService();
await tokenService.createUserTokenAccount(userWalletAddress);
```

### Blockchain Transfer Failed

**Error:**
```
Blockchain transfer failed: [specific error]
```

**What happens:**
- MongoDB transaction is ROLLED BACK
- No balance changes in database
- User can retry

**Critical scenario:**
If blockchain succeeds but MongoDB update fails:

```
🚨 CRITICAL: Blockchain transfer succeeded but MongoDB update failed!
🚨 Transaction signature: 4xjkL...
🚨 Customer: john@example.com
🚨 Amount: 10000 GAMBINO
```

**Manual reconciliation required** - tokens were transferred on-chain but database wasn't updated.

---

## Testing Checklist

### Unit Tests

- [ ] getUserTokenBalance returns correct on-chain balance
- [ ] transferToTreasury successfully transfers tokens
- [ ] decryptUserKey correctly decrypts private keys
- [ ] Process cashout validates on-chain balance
- [ ] Process cashout executes blockchain transfer
- [ ] MongoDB updates only after blockchain confirmation

### Integration Tests

- [ ] End-to-end cashout with real Solana devnet
- [ ] Verify tokens actually move on blockchain
- [ ] Verify Solana Explorer shows transaction
- [ ] Test with insufficient SOL (should fail gracefully)
- [ ] Test with insufficient token balance (should fail)
- [ ] Test daily limits still enforced
- [ ] Test minimum/maximum limits still enforced

### Frontend Tests

- [ ] Receipt shows blockchain verification badge
- [ ] Transaction ID displays correctly
- [ ] Solana Explorer link works
- [ ] Explorer link opens in new tab
- [ ] Balance shows on-chain balance (not cached)

---

## Migration from Old System

### For Existing Customers

If you have customers with MongoDB balances but no on-chain tokens:

**Option 1: Airdrop tokens to match MongoDB balance**

```javascript
const tokenService = new GambinoTokenService();

for (const user of usersWithBalances) {
  const mongoBalance = user.gambinoBalance;

  // Send tokens from treasury to match MongoDB balance
  await tokenService.distributeRegistrationReward(
    user._id,
    user.walletAddress,
    mongoBalance,
    'Migration: sync MongoDB to blockchain'
  );
}
```

**Option 2: Mark old balances as "legacy" and start fresh**

```javascript
// Move existing balance to "legacyBalance" field
await User.updateMany(
  {},
  {
    $rename: { gambinoBalance: 'legacyBalance' },
    $set: { gambinoBalance: 0 }
  }
);

// Handle legacy balances separately (manual cashout process)
```

---

## Monitoring & Alerts

### Key Metrics to Track

1. **On-chain vs Cached Balance Drift**
   - MongoDB balance should match on-chain
   - Alert if drift > 1%

2. **Failed Blockchain Transfers**
   - Track failure rate
   - Alert if > 5%

3. **SOL Balance of User Wallets**
   - Warn if users have < 0.0005 SOL
   - They'll need more for next cashout

4. **Treasury Balance**
   - Track cashoutVault balance
   - Alert if accumulating too many tokens (need to burn/redistribute)

### Logging

All blockchain operations log:

```
🎯 Starting blockchain-backed cashout for customer 123
🔍 Checking on-chain balance for wallet: 9c6e2F...
💰 On-chain balance: 50000 GAMBINO
💾 MongoDB cached balance: 50000 GAMBINO
🚀 Executing blockchain transfer: 10000 GAMBINO from user to treasury
✅ Blockchain transfer confirmed!
📝 Transaction signature: 4xjkL...
🔗 Explorer: https://explorer.solana.com/tx/4xjkL...
💰 10000 GAMBINO transferred on blockchain
💵 $10.00 cash to customer
🏦 Blockchain TX: 4xjkL...
```

---

## Security Considerations

### Private Key Storage

- ✅ Private keys **encrypted at rest** in MongoDB
- ✅ Encryption key in environment variable
- ✅ Never exposed in API responses
- ✅ Only decrypted in-memory for signing

### Transaction Signing

- ✅ User's private key signs transaction (custodial)
- ✅ Backend acts on behalf of user
- ✅ User trusts backend with their keys

### Blockchain Verification

- ✅ Transaction signatures are public
- ✅ Anyone can verify on Solana Explorer
- ✅ Immutable audit trail
- ✅ Cannot be tampered with after confirmation

---

## Future Enhancements

### 1. Non-Custodial Wallets

Allow users to hold their own keys:

```javascript
// Create unsigned transaction
const unsignedTx = await tokenService.createCashoutTransaction(user, amount);

// Send to user's wallet app to sign
// User signs with their own private key
// Transaction submitted after user approval
```

### 2. Fee Subsidy

Backend pays gas fees instead of users:

```javascript
// Use "payer" keypair to pay fees
const txSignature = await transfer(
  connection,
  payerKeypair,     // Payer for fees ✅
  userTokenAccount,
  treasuryTokenAccount,
  userKeypair,      // Owner of source tokens
  amount
);
```

### 3. Token Burning

Instead of collecting to treasury, burn cashed-out tokens:

```javascript
const { burn } = require('@solana/spl-token');

await burn(
  connection,
  payer,
  userTokenAccount,
  mintPublicKey,
  userKeypair,
  amount
);
```

### 4. Multi-Signature Treasury

Require multiple signatures for large cashouts:

```javascript
// Cashouts > $1000 require 2-of-3 multi-sig
// Cashouts > $10000 require 3-of-5 multi-sig
```

---

## Troubleshooting

### Problem: Customer search is slow

**Cause:** Checking on-chain balance for every search result

**Solution:** Cache on-chain balances with TTL:

```javascript
// Check cache first
const cached = await redis.get(`balance:${walletAddress}`);
if (cached) return JSON.parse(cached);

// Fetch from blockchain
const balance = await connection.getTokenAccountBalance(...);

// Cache for 30 seconds
await redis.setex(`balance:${walletAddress}`, 30, JSON.stringify(balance));
```

### Problem: RPC rate limiting

**Cause:** Too many requests to Solana RPC

**Solutions:**
1. Use dedicated RPC provider (Quicknode, Alchemy, etc.)
2. Implement request queuing
3. Cache balance checks

### Problem: Transaction confirmation timeout

**Cause:** Solana network congestion

**Solution:**
```javascript
// Increase confirmation timeout
await connection.confirmTransaction(signature, {
  commitment: 'confirmed',
  timeout: 60000 // 60 seconds instead of 30
});
```

---

## Summary

✅ **What Changed:**
- Cashouts now execute REAL blockchain transfers
- On-chain balance checked before processing
- MongoDB is now a cache, blockchain is source of truth
- Transaction receipts include Solana Explorer links
- Full blockchain verification and audit trail

✅ **What's Required:**
- Solana RPC endpoint configured
- Treasury "cashoutVault" wallet set up
- Users have wallets with private keys
- Users have SOL for gas fees (~0.001 SOL)

✅ **Benefits:**
- Provable, immutable transactions
- Public verification via blockchain
- No double-spend attacks
- True token scarcity enforced on-chain

✅ **Trade-offs:**
- Slower (30-60 seconds for confirmation)
- Requires SOL for fees
- Dependent on Solana network uptime
- More complex error handling

---

**Ready to test?**

1. Set up treasury wallet
2. Fund user wallets with SOL
3. Run end-to-end cashout
4. Verify on Solana Explorer!

For questions: Check logs for blockchain signatures and verify on https://explorer.solana.com

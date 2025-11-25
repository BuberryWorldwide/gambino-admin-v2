# Production-Ready Blockchain Cashout System

## 🎉 What's Been Fixed

All critical production issues have been resolved:

✅ **No hardcoded devnet URL** - Uses environment variables
✅ **Treasury pays fees** - Users don't need SOL!
✅ **RPC failover** - Automatic fallback if one RPC fails
✅ **Balance reconciliation** - Automated drift detection & fixing
✅ **Better error handling** - Clear messages for all failure cases
✅ **Rate limiting protection** - Delays between RPC calls

---

## 🚀 Production Environment Setup

### 1. Environment Variables

Add these to `/opt/gambino/.env`:

```bash
# ==================================================
# Solana Blockchain Configuration
# ==================================================

# Network selection (devnet or mainnet)
NODE_ENV=production
SOLANA_NETWORK=mainnet

# Primary RPC endpoint (REQUIRED)
SOLANA_RPC_URL=https://your-quicknode-url.com/your-api-key

# Optional: Backup RPC endpoints for failover
QUICKNODE_RPC=https://your-quicknode-url.com/your-api-key
ALCHEMY_RPC=https://your-alchemy-url.com/your-api-key

# GAMBINO token mint address (REQUIRED)
GAMBINO_MINT_ADDRESS=YourGambinoMintPublicKey...

# Wallet encryption key (REQUIRED - keep secret!)
WALLET_ENCRYPTION_KEY=your-32-character-secure-encryption-key

# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/gambino?replicaSet=rs0
```

### 2. Get Production RPC Endpoints

**Don't use public RPCs in production!** They're rate-limited and unreliable.

#### Recommended Providers:

**Quicknode** (Recommended):
1. Go to https://www.quicknode.com/
2. Create account
3. Create Solana Mainnet endpoint
4. Copy your endpoint URL
5. Add to `.env` as `SOLANA_RPC_URL`

**Alchemy** (Backup):
1. Go to https://www.alchemy.com/
2. Create account
3. Create Solana Mainnet app
4. Copy your endpoint URL
5. Add to `.env` as `ALCHEMY_RPC`

**Cost:** ~$50-100/month for production volume

### 3. Treasury Wallets Setup

You need TWO treasury wallets:

#### A) Fee Payer Wallet ("payer")

**Purpose:** Pays transaction fees for all cashouts
**Needs:** SOL only (no GAMBINO tokens)
**Recommended:** 10 SOL minimum (~$2000 at current prices)

```bash
# Generate keypair
solana-keygen new --outfile payer-keypair.json

# Fund with SOL (mainnet)
solana transfer <PAYER_PUBLIC_KEY> 10 --url mainnet-beta

# Store in CredentialManager with type 'payer'
```

**Monthly SOL needs:**
- ~0.00001 SOL per cashout
- 10,000 cashouts/month = 0.1 SOL = ~$20/month
- 10 SOL will last years

#### B) Cashout Vault Wallet ("cashoutVault")

**Purpose:** Receives all cashed-out GAMBINO tokens
**Needs:** Small amount of SOL (~0.01) for account rent

```bash
# Generate keypair
solana-keygen new --outfile cashout-vault-keypair.json

# Fund with SOL for rent
solana transfer <VAULT_PUBLIC_KEY> 0.01 --url mainnet-beta

# Store in CredentialManager with type 'cashoutVault'
```

### 4. Verify Setup

Run this test script:

```javascript
// test-production-setup.js
const GambinoTokenService = require('./backend/src/services/gambinoTokenService');

async function testSetup() {
  const tokenService = new GambinoTokenService();

  console.log('🔍 Testing Production Setup...\n');

  // 1. Check RPC endpoints
  console.log('RPC Endpoints:', tokenService.rpcEndpoints);

  // 2. Test RPC connection
  try {
    const slot = await tokenService.connection.getSlot();
    console.log(`✅ RPC connection working (current slot: ${slot})`);
  } catch (err) {
    console.error('❌ RPC connection failed:', err.message);
    process.exit(1);
  }

  // 3. Check GAMBINO mint exists
  try {
    const mintInfo = await tokenService.connection.getAccountInfo(
      new PublicKey(process.env.GAMBINO_MINT_ADDRESS)
    );
    if (mintInfo) {
      console.log('✅ GAMBINO mint found on blockchain');
    } else {
      console.error('❌ GAMBINO mint not found!');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Failed to check GAMBINO mint:', err.message);
    process.exit(1);
  }

  // 4. Check fee payer has SOL
  const payerResult = await tokenService.credentialManager.getKeypair('payer', 'TEST');
  if (payerResult.success) {
    const balance = await tokenService.connection.getBalance(payerResult.keypair.publicKey);
    console.log(`✅ Fee payer has ${balance / 1e9} SOL`);

    if (balance < 1e9) { // Less than 1 SOL
      console.warn('⚠️  WARNING: Fee payer has less than 1 SOL. Please fund it!');
    }
  } else {
    console.error('❌ Fee payer not configured');
    process.exit(1);
  }

  // 5. Check cashout vault exists
  const vaultResult = await tokenService.credentialManager.getKeypair('cashoutVault', 'TEST');
  if (vaultResult.success) {
    console.log('✅ Cashout vault configured');
  } else {
    console.error('❌ Cashout vault not configured');
    process.exit(1);
  }

  console.log('\n🎉 Production setup complete!');
}

testSetup();
```

---

## 💰 User Requirements (NONE!)

**Previously:** Users needed 0.001 SOL for transaction fees
**Now:** Treasury pays ALL fees!

Users only need:
- ✅ Solana wallet address (in `walletAddress` field)
- ✅ Encrypted private key (in `privateKey` field)
- ✅ GAMBINO tokens in their wallet

**No SOL required!** 🎉

---

## 🔄 Balance Reconciliation

Run this script daily (cron job) to detect and fix drift:

### Dry Run (Check Only)

```bash
# Check all users for drift > 10 tokens
node backend/reconcile-balances.js --threshold=10

# Check first 100 users
node backend/reconcile-balances.js --limit=100
```

### Fix Mode (Update MongoDB)

```bash
# Fix all drifted balances
node backend/reconcile-balances.js --fix

# Fix only users with drift > 100 tokens
node backend/reconcile-balances.js --fix --threshold=100
```

### Cron Job Setup

```bash
# Add to crontab (run daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * cd /opt/gambino/backend && node reconcile-balances.js --fix --threshold=1 >> /var/log/gambino-reconcile.log 2>&1
```

**What it does:**
1. Checks all users with wallets
2. Gets REAL on-chain balance for each
3. Compares to MongoDB cached balance
4. Reports any drift
5. In `--fix` mode, updates MongoDB to match blockchain

**Output example:**
```
🔄 Balance Reconciliation Script
Mode: ⚠️  FIX MODE (will update MongoDB)
Threshold: 1 tokens

✅ [1/150] user1@example.com: In sync (50000 tokens)
⚠️  [2/150] user2@example.com:
   On-chain: 45000 tokens
   MongoDB:  50000 tokens
   Drift:    5000 tokens (10.00%)
   ✅ FIXED: Updated MongoDB to match blockchain

📊 RECONCILIATION SUMMARY
Total users checked:     150
In sync:                 148 (98.7%)
Drifted:                 2 (1.3%)
✅ Fixed:                2 users
```

---

## 🔒 Security Best Practices

### 1. Private Key Protection

**What we do:**
- Keys encrypted with AES-256-CBC
- Encryption key in environment variable
- Keys only decrypted in memory for signing
- Never exposed in API responses
- Never logged

**Production checklist:**
- [ ] Use strong `WALLET_ENCRYPTION_KEY` (32+ characters)
- [ ] Rotate encryption key periodically
- [ ] Back up encrypted keys securely
- [ ] Limit database access
- [ ] Enable MongoDB encryption at rest

### 2. Treasury Wallet Protection

**Fee Payer:**
- [ ] Store private key in CredentialManager
- [ ] Monitor SOL balance daily
- [ ] Alert if balance < 1 SOL
- [ ] Restrict access to backend only

**Cashout Vault:**
- [ ] Store private key in CredentialManager
- [ ] Monitor token accumulation
- [ ] Implement burn or redistribution schedule
- [ ] Multi-sig for large withdrawals (future enhancement)

### 3. RPC Endpoint Security

**Quicknode/Alchemy:**
- [ ] Use API keys (not public endpoints)
- [ ] Rotate API keys monthly
- [ ] Monitor usage/costs
- [ ] Set up billing alerts

---

## 📊 Monitoring & Alerts

### Key Metrics to Track

1. **Cashout Success Rate**
   - Target: > 99%
   - Alert if < 95%

2. **RPC Availability**
   - Monitor failover frequency
   - Alert if using backup RPC > 10% of time

3. **Balance Drift**
   - Run reconciliation daily
   - Alert if > 5% of users drifted

4. **Fee Payer SOL Balance**
   - Alert if < 1 SOL
   - Auto-refill if possible

5. **Transaction Confirmation Time**
   - Track average time
   - Alert if > 90 seconds

### Logging

All operations log to console:

```
💸 Processing cashout: 10000 GAMBINO from 9c6e2F...
💰 Fee payer: Treasury wallet (treasury pays fees)
🔍 Checking on-chain balance for: 9c6e2F...
✅ On-chain balance: 50000 GAMBINO
🚀 Executing blockchain transfer
⏳ Waiting for blockchain confirmation...
✅ Cashout confirmed on blockchain!
📝 Transaction signature: 4xjkLzP3...
🔗 Explorer: https://explorer.solana.com/tx/4xjkLzP3...
```

Redirect to log file:
```bash
# In pm2 ecosystem.config.js
error_file: '/var/log/gambino-backend-error.log',
out_file: '/var/log/gambino-backend-out.log'
```

---

## 🚨 Error Handling

### Common Errors & Solutions

#### "Treasury fee payer has insufficient SOL"

**Cause:** Fee payer wallet ran out of SOL

**Solution:**
```bash
# Check fee payer balance
solana balance <FEE_PAYER_PUBLIC_KEY> --url mainnet-beta

# Fund it
solana transfer <FEE_PAYER_PUBLIC_KEY> 5 --url mainnet-beta
```

#### "All Solana RPC endpoints failed"

**Cause:** All RPC providers down (rare) or bad endpoints

**Solution:**
1. Check Quicknode/Alchemy status pages
2. Verify RPC URLs in `.env`
3. Test manually:
   ```bash
   curl -X POST $SOLANA_RPC_URL \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
   ```
4. Add more backup RPCs

#### "Customer token account does not exist"

**Cause:** User has wallet but no GAMBINO token account

**Solution:**
```javascript
// Create token account for user
const tokenService = new GambinoTokenService();
await tokenService.createUserTokenAccount(userWalletAddress);
```

#### High drift in reconciliation

**Cause:** Cashouts processed but MongoDB not updated

**Solution:**
1. Check logs for "CRITICAL" errors
2. Manually verify blockchain transactions
3. Run reconciliation with `--fix`
4. Investigate why MongoDB updates failed

---

## 📈 Scaling Considerations

### RPC Rate Limits

**Problem:** Too many requests = throttling

**Solutions:**

1. **Use premium RPC tiers**
   - Quicknode Pro: 1000 req/sec
   - Alchemy Growth: 3000 req/sec

2. **Implement request queueing**
   ```javascript
   // Add to gambinoTokenService.js
   const queue = [];
   const processQueue = async () => {
     while (queue.length > 0) {
       const request = queue.shift();
       await request();
       await new Promise(r => setTimeout(r, 10)); // 10ms delay
     }
   };
   ```

3. **Cache balance checks**
   ```javascript
   // Use Redis for 30-second TTL
   const cached = await redis.get(`balance:${wallet}`);
   if (cached) return JSON.parse(cached);

   const balance = await getOnChainBalance(wallet);
   await redis.setex(`balance:${wallet}`, 30, JSON.stringify(balance));
   ```

### High Volume Cashouts

**Problem:** 100+ cashouts/minute

**Solutions:**

1. **Batch processing queue**
   - Queue cashouts in Redis
   - Process in batches of 10
   - Prevents RPC overload

2. **Multiple fee payer wallets**
   - Rotate between 5 fee payers
   - Load balance requests
   - 5x throughput

3. **Dedicated cashout workers**
   - Separate PM2 process for cashouts
   - Scale horizontally

---

## 🧪 Pre-Production Testing

### Test Checklist

1. **Environment Setup**
   - [ ] All env variables set
   - [ ] RPC endpoints working
   - [ ] Fee payer funded (> 1 SOL)
   - [ ] Cashout vault configured

2. **Smoke Tests**
   - [ ] Get on-chain balance works
   - [ ] RPC failover works (disable primary RPC)
   - [ ] Balance reconciliation works
   - [ ] Test cashout with real user

3. **Load Tests**
   - [ ] 10 concurrent cashouts
   - [ ] 100 balance checks/minute
   - [ ] RPC handles volume

4. **Error Tests**
   - [ ] Insufficient tokens (should fail gracefully)
   - [ ] Non-existent wallet (should error clearly)
   - [ ] RPC down (should failover)
   - [ ] Fee payer out of SOL (should error clearly)

---

## 🎯 Production Deployment Checklist

- [ ] Environment variables configured
- [ ] Premium RPC provider set up (Quicknode/Alchemy)
- [ ] Fee payer wallet funded with 10 SOL
- [ ] Cashout vault wallet created
- [ ] Test cashout on mainnet (small amount)
- [ ] Verify transaction on Solana Explorer
- [ ] Balance reconciliation cron job set up
- [ ] Monitoring/alerts configured
- [ ] Staff trained on new cashout flow
- [ ] Emergency contact list updated
- [ ] Backup plan documented

---

## 📞 Support

### If Something Goes Wrong

1. **Check logs first:**
   ```bash
   tail -f /var/log/gambino-backend-out.log
   grep "CRITICAL" /var/log/gambino-backend-error.log
   ```

2. **Check RPC status:**
   - Quicknode: https://status.quicknode.com
   - Alchemy: https://status.alchemy.com

3. **Verify blockchain:**
   - https://explorer.solana.com
   - Check transaction signatures

4. **Run reconciliation:**
   ```bash
   node backend/reconcile-balances.js
   ```

### Emergency Procedures

**If cashouts failing:**
1. Check fee payer SOL balance
2. Check RPC endpoints
3. Check Solana network status
4. Disable cashouts temporarily if needed

**If balances drifting:**
1. Stop cashout processing
2. Run reconciliation dry-run
3. Investigate why drift happening
4. Fix root cause
5. Run reconciliation with --fix
6. Resume cashouts

---

## 🎉 Summary

### What's Production-Ready Now

✅ **No hardcoded URLs** - All configurable via environment
✅ **RPC failover** - Automatic backup if primary fails
✅ **Treasury pays fees** - Users need ZERO SOL
✅ **Balance reconciliation** - Automated drift fixing
✅ **Premium RPC support** - Quicknode/Alchemy ready
✅ **Comprehensive error handling** - Clear error messages
✅ **Production monitoring** - Logs, alerts, reconciliation

### Cost Breakdown

| Item | Monthly Cost |
|------|-------------|
| Quicknode RPC (Primary) | ~$50 |
| Alchemy RPC (Backup) | ~$25 |
| Transaction Fees (SOL) | ~$20 (0.1 SOL @ 10k txns) |
| **Total** | **~$95/month** |

### Benefits

- 🚀 **Fast** - ~30-60 second confirmations
- 🔒 **Secure** - Immutable blockchain proof
- 💰 **Cheap** - ~$0.002 per cashout
- 📊 **Verifiable** - Public Solana Explorer
- ⚡ **Reliable** - RPC failover, 99.9% uptime
- 🎯 **User-friendly** - No SOL required!

---

**You're ready for production!** 🚀

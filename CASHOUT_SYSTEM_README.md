# Gambino Token Cashout System

## Overview

The Token Cashout System enables venue managers and staff to convert customer Gambino tokens into cash payments at physical venues. This system provides:

- **Customer Token Conversion**: Search customers and convert their tokens to cash
- **Exchange Rate Management**: Configurable exchange rates and limits
- **Transaction History**: Complete audit trail with filtering and export
- **Daily Limits**: Per-customer and per-staff cashout limits for fraud prevention
- **Atomic Transactions**: MongoDB sessions ensure financial integrity
- **Reversal Capability**: Admin-only ability to reverse cashouts
- **Role-Based Access**: Granular permissions for different user roles

## Key Features

### Exchange Rate Configuration
- Default: 1000 tokens = $1.00 USD
- Configurable minimum cashout ($5 default)
- Maximum per-transaction limit ($500 default)
- Daily limits per customer ($1000 default)
- Daily limits per staff member ($5000 default)
- Venue commission percentage (0% default, configurable)

### Security & Safety
- Atomic transactions using MongoDB sessions
- Negative balance prevention
- Daily limit enforcement
- Permission-based access control
- Complete audit trail
- Reversal capability for corrections

## Prerequisites

- Node.js 18+ and npm
- MongoDB 4.4+ (with replica set for transactions)
- Existing Gambino backend and admin frontend
- Redis (for caching)

## Backend Setup

### 1. Install Dependencies

The cashout system uses existing dependencies. Ensure your backend has:

```bash
cd backend
npm install
```

### 2. Database Setup

#### Initialize Exchange Rate Configuration

Run the seed script to create the initial exchange rate configuration:

```bash
cd backend
node seed-exchange-rate.js
```

Expected output:
```
🌱 Seeding exchange rate configuration...
✅ Connected to MongoDB
✅ Exchange rate config created successfully:

  Tokens per Dollar: 1000 tokens = $1.00
  Minimum Cashout: $5.00
  Maximum per Transaction: $500.00
  Daily Limit per Customer: $1,000.00
  Daily Limit per Staff: $5,000.00
  Venue Commission: 0%

🎉 Seeding complete!
✅ Database connection closed
```

**Note**: This script only needs to be run once. If a config already exists, it will be skipped.

#### Verify MongoDB Replica Set

Atomic transactions require MongoDB to be running as a replica set:

```bash
# Check if running as replica set
mongo --eval "rs.status()"

# If not, initialize (local development):
mongo --eval "rs.initiate()"
```

For production, ensure your MongoDB cluster is properly configured with replica sets.

### 3. Environment Variables

Ensure your `.env` file (typically at `/opt/gambino/.env`) contains:

```env
MONGODB_URI=mongodb://localhost:27017/gambino?replicaSet=rs0
JWT_SECRET=your-secret-key
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=5000
```

### 4. Verify Backend Integration

Check that `backend/server.js` includes the cashout routes:

```javascript
app.use('/api/cashout', require('./src/routes/cashout'));
```

This should already be integrated. The cashout routes are now available at `/api/cashout/*`.

### 5. Start Backend Server

```bash
cd backend
npm start
```

Verify the server starts without errors and you see:
```
✅ MongoDB connected
✅ Server running on port 5000
```

## Frontend Setup

### 1. Verify Pages Exist

The following pages should exist in `src/app/admin/`:

- `cashout/page.tsx` - Main cashout interface
- `transactions/page.tsx` - Transaction history viewer

### 2. Verify Navigation

Check `src/components/layout/AdminLayout.tsx` includes:

```typescript
{ href: '/admin/cashout', label: 'Token Cashout', icon: DollarSign, permissions: ['process_cashouts'] },
{ href: '/admin/transactions', label: 'Transactions', icon: Receipt, permissions: ['view_cashout_history'] },
```

### 3. Install & Start Frontend

```bash
npm install
npm run dev
```

Access at `http://localhost:3000`

## User Permissions

### Role-Based Access

| Role | Process Cashouts | View History | Reverse Cashouts |
|------|-----------------|--------------|------------------|
| Super Admin | ✅ | ✅ | ✅ |
| Gambino Ops | ✅ | ✅ | ❌ |
| Venue Manager | ✅ | ✅ | ❌ |
| Venue Staff | ✅ | ✅ | ❌ |

### Assigning Venues

Venue managers and staff must have `assignedVenues` in their user profile:

```javascript
{
  _id: "userId",
  email: "manager@venue.com",
  role: "venue_manager",
  assignedVenues: ["storeId1", "storeId2"]
}
```

## Cashout Workflow

### Step-by-Step Process

1. **Customer Arrives**: Customer wants to cash out tokens
2. **Search Customer**: Staff searches by name, email, or phone
3. **Verify Balance**: System displays current token balance
4. **Enter Amount**: Staff enters tokens to convert
5. **Preview Transaction**: System shows conversion calculation
   - Tokens to convert
   - Exchange rate applied
   - Cash amount
   - Commission (if any)
   - New balance
6. **Confirm & Process**: Staff confirms, system executes atomically
7. **Print Receipt**: Receipt displays for customer

### What Happens During Processing

```
1. Validate request (balance, limits, minimums)
2. Start MongoDB session & transaction
3. Deduct tokens from customer balance (atomic)
4. Create transaction record
5. Verify no negative balance
6. Commit transaction
7. Return receipt
```

If any step fails, the entire transaction rolls back.

## API Endpoints

### Get Exchange Rate Config
```
GET /api/cashout/exchange-rate
Authorization: Bearer {token}
Permission: VIEW_CASHOUT_HISTORY

Response:
{
  "success": true,
  "exchangeRate": {
    "tokensPerDollar": 1000,
    "minCashout": 5,
    "maxCashoutPerTransaction": 500,
    "dailyLimitPerCustomer": 1000,
    "dailyLimitPerStaff": 5000,
    "venueCommissionPercent": 0
  }
}
```

### Search Customers
```
GET /api/cashout/customers/search?q={query}&limit=20
Authorization: Bearer {token}
Permission: PROCESS_CASHOUTS or VIEW_CASHOUT_HISTORY

Response:
{
  "success": true,
  "customers": [
    {
      "_id": "customerId",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "balance": 50000,
      "walletAddress": "0x..."
    }
  ]
}
```

### Get Customer Balance
```
GET /api/cashout/customers/:customerId/balance
Authorization: Bearer {token}
Permission: PROCESS_CASHOUTS or VIEW_CASHOUT_HISTORY

Response:
{
  "success": true,
  "customer": {
    "_id": "customerId",
    "fullName": "John Doe",
    "balance": 50000,
    "totalDeposited": 100000,
    "totalWithdrawn": 50000
  },
  "todayActivity": {
    "cashoutsCount": 2,
    "cashoutsTotal": 25.00
  },
  "recentTransactions": [...]
}
```

### Process Cashout
```
POST /api/cashout/venues/:storeId/process
Authorization: Bearer {token}
Permission: PROCESS_CASHOUTS + Venue Access

Body:
{
  "customerId": "customerId",
  "tokensToConvert": 10000,
  "notes": "Customer requested partial cashout"
}

Response:
{
  "success": true,
  "transaction": {
    "transactionId": "TXN-1234567890-abc123",
    "customerId": "customerId",
    "customerName": "John Doe",
    "tokensConverted": 10000,
    "cashAmount": 10.00,
    "cashToCustomer": 10.00,
    "venueCommission": 0.00,
    "exchangeRate": 1000,
    "balanceBefore": 50000,
    "balanceAfter": 40000,
    "status": "completed"
  }
}
```

### Get Cashout History
```
GET /api/cashout/venues/:storeId/history?startDate=2024-01-01&endDate=2024-12-31&status=completed&limit=50&offset=0
Authorization: Bearer {token}
Permission: VIEW_CASHOUT_HISTORY + Venue Access

Response:
{
  "success": true,
  "transactions": [...],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "pages": 3
  },
  "summary": {
    "totalTransactions": 150,
    "totalTokensConverted": 1500000,
    "totalCashPaid": 1500.00,
    "totalCommission": 0.00
  }
}
```

### Reverse Cashout (Admin Only)
```
POST /api/cashout/reverse/:transactionId
Authorization: Bearer {token}
Permission: REVERSE_CASHOUTS

Body:
{
  "reason": "Customer dispute - duplicate transaction"
}

Response:
{
  "success": true,
  "message": "Cashout successfully reversed",
  "reversalTransaction": "reversalTransactionId"
}
```

## Database Schema

### ExchangeRateConfig Model
```javascript
{
  tokensPerDollar: 1000,
  minCashout: 5,
  maxCashoutPerTransaction: 500,
  dailyLimitPerCustomer: 1000,
  dailyLimitPerStaff: 5000,
  venueCommissionPercent: 0,
  isActive: true,
  effectiveFrom: Date,
  notes: "Configuration notes",
  createdAt: Date,
  updatedAt: Date
}
```

### Transaction Model (Cashout Type)
```javascript
{
  userId: ObjectId,
  type: "cashout",
  amount: 10000, // tokens
  usdAmount: 10.00, // cash
  status: "completed",
  txHash: "TXN-1234567890-abc123",
  metadata: {
    storeId: "storeId",
    staffMemberId: "staffId",
    exchangeRate: 1000,
    cashToCustomer: 10.00,
    venueCommission: 0.00,
    commissionPercent: 0,
    balanceBefore: 50000,
    balanceAfter: 40000,
    transactionId: "TXN-1234567890-abc123",
    notes: "Optional notes",
    processedAt: Date,
    reversed: false
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Configuration & Customization

### Updating Exchange Rate

To update the exchange rate, create a new ExchangeRateConfig document:

```javascript
const ExchangeRateConfig = require('./src/models/ExchangeRateConfig');

const newConfig = new ExchangeRateConfig({
  tokensPerDollar: 2000, // New rate: 2000 tokens = $1
  minCashout: 10,
  maxCashoutPerTransaction: 1000,
  dailyLimitPerCustomer: 2000,
  dailyLimitPerStaff: 10000,
  venueCommissionPercent: 2.5, // 2.5% commission
  isActive: true,
  effectiveFrom: new Date(),
  notes: 'Updated exchange rate for Q1 2024'
});

await newConfig.save();
```

The system automatically uses the most recent active config.

### Adjusting Limits

Edit the values when creating a new config:

- **minCashout**: Minimum dollar amount (prevents micro-transactions)
- **maxCashoutPerTransaction**: Maximum per transaction (fraud prevention)
- **dailyLimitPerCustomer**: Total daily limit per customer
- **dailyLimitPerStaff**: Total daily limit per staff member
- **venueCommissionPercent**: Commission kept by venue (0 = no commission)

## Troubleshooting

### "Transaction would result in negative balance"

**Cause**: Race condition or validation bypass attempt

**Solution**: This is the safety check working correctly. The transaction was rolled back. Verify customer balance and retry.

### "MongoDB transaction failed"

**Cause**: MongoDB not running as replica set

**Solution**:
```bash
# Initialize replica set (local dev)
mongo --eval "rs.initiate()"

# Restart backend
```

### "Daily limit exceeded"

**Cause**: Customer or staff has reached daily cashout limit

**Solution**:
- Wait until next day (limits reset at midnight)
- Or increase limits in ExchangeRateConfig (not recommended without approval)

### "No venue assigned to your account"

**Cause**: User's `assignedVenues` array is empty

**Solution**: Update user document with assigned venues:
```javascript
await User.findByIdAndUpdate(userId, {
  $set: { assignedVenues: ['storeId1', 'storeId2'] }
});
```

### "Insufficient balance"

**Cause**: Customer doesn't have enough tokens

**Solution**: Customer needs to play more or make a deposit. This is normal behavior.

### Seed Script Says "Config Already Exists"

**Cause**: Exchange rate config was already seeded

**Solution**: This is normal. To create a new config with different values, don't use the seed script - create via admin API or directly in database.

## Testing Checklist

### Backend Tests

- [ ] Exchange rate config created successfully
- [ ] Customer search returns results
- [ ] Balance validation prevents overdrafts
- [ ] Minimum cashout enforced ($5)
- [ ] Maximum transaction enforced ($500)
- [ ] Daily customer limit enforced ($1000)
- [ ] Daily staff limit enforced ($5000)
- [ ] Atomic transaction commits on success
- [ ] Atomic transaction rolls back on failure
- [ ] Commission calculated correctly (if enabled)
- [ ] Transaction history filters work
- [ ] Reversal works (admin only)
- [ ] Permissions enforced on all endpoints

### Frontend Tests

- [ ] Navigation shows "Token Cashout" and "Transactions"
- [ ] Customer search autocomplete works
- [ ] Token amount validates correctly
- [ ] Cash calculation displays in real-time
- [ ] Preview modal shows correct details
- [ ] Success receipt displays transaction ID
- [ ] Transaction history loads and filters
- [ ] Export to CSV works
- [ ] Mobile responsive on all pages
- [ ] Error messages display properly

### End-to-End Test Scenario

1. Login as venue manager
2. Navigate to "Token Cashout"
3. Search for customer by phone
4. Select customer from results
5. Enter 5000 tokens
6. Verify preview shows $5.00
7. Confirm transaction
8. Verify receipt displays
9. Navigate to "Transactions"
10. Verify transaction appears in history
11. Export transactions to CSV
12. Verify CSV contains transaction

## Support & Maintenance

### Monitoring

Monitor these metrics:

- Total daily cashout volume per venue
- Average transaction size
- Failed transactions (should be near 0%)
- Daily limit breaches
- Reversal frequency

### Regular Tasks

- Review cashout transaction logs weekly
- Verify daily reconciliation reports match
- Update exchange rates as needed
- Audit reversal reasons monthly
- Back up transaction data regularly

### Logs Location

Backend logs: `backend/logs/` or stdout
Transaction logs include `✅ Cashout processed` or `❌ Cashout processing error`

## Security Considerations

1. **Always use HTTPS** in production
2. **JWT tokens** should expire and rotate
3. **MongoDB replica set** must be secured
4. **Daily limits** prevent fraud
5. **Audit trail** tracks all actions
6. **Reversal capability** only for admins
7. **RBAC** enforces permissions
8. **Input validation** on all endpoints

## Future Enhancements

Potential improvements:

- SMS/Email receipts to customers
- Multi-currency support
- Dynamic exchange rates (API-driven)
- Cashout request flow (customer initiates, staff approves)
- Biometric verification
- QR code receipts
- Integration with accounting systems
- Advanced analytics dashboard
- Automated reconciliation reports

## License

Proprietary - Gambino Gaming Platform

## Contact

For issues or questions, contact the development team or create an issue in the project repository.

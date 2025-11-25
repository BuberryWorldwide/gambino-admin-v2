# Cashout System Testing Checklist

## Pre-Testing Setup

### Backend Setup
- [ ] MongoDB replica set initialized (`rs.initiate()`)
- [ ] Backend server running on port 5000
- [ ] Exchange rate config seeded (`node seed-exchange-rate.js`)
- [ ] Environment variables configured (`.env` file)
- [ ] Test database with sample users and transactions

### Frontend Setup
- [ ] Frontend development server running (`npm run dev`)
- [ ] Browser console clear of errors
- [ ] Network tab accessible for API monitoring

### Test User Accounts

Create test accounts for each role:

```javascript
// Super Admin
{
  email: "superadmin@test.com",
  password: "Test123!",
  role: "super_admin",
  firstName: "Super",
  lastName: "Admin"
}

// Venue Manager
{
  email: "manager@test.com",
  password: "Test123!",
  role: "venue_manager",
  firstName: "Venue",
  lastName: "Manager",
  assignedVenues: ["testStoreId1"]
}

// Venue Staff
{
  email: "staff@test.com",
  password: "Test123!",
  role: "venue_staff",
  firstName: "Venue",
  lastName: "Staff",
  assignedVenues: ["testStoreId1"]
}

// Test Customer
{
  email: "customer@test.com",
  role: "user",
  firstName: "Test",
  lastName: "Customer",
  phone: "+15551234567",
  gambinoBalance: 100000 // 100,000 tokens ($100)
}
```

---

## Backend API Tests

### 1. Exchange Rate Configuration

#### GET /api/cashout/exchange-rate

**Test 1.1: Get exchange rate - Success**
- [ ] Login as venue manager
- [ ] GET `/api/cashout/exchange-rate`
- [ ] Expected: 200 OK with exchange rate config
- [ ] Verify `tokensPerDollar: 1000`
- [ ] Verify `minCashout: 5`
- [ ] Verify `maxCashoutPerTransaction: 500`

**Test 1.2: Get exchange rate - Unauthorized**
- [ ] Request without Authorization header
- [ ] Expected: 401 Unauthorized

**Test 1.3: Get exchange rate - Forbidden**
- [ ] Login as user without VIEW_CASHOUT_HISTORY permission
- [ ] Expected: 403 Forbidden

---

### 2. Customer Search

#### GET /api/cashout/customers/search

**Test 2.1: Search by name - Success**
- [ ] Login as venue manager
- [ ] GET `/api/cashout/customers/search?q=Test`
- [ ] Expected: 200 OK with customer array
- [ ] Verify customer "Test Customer" appears

**Test 2.2: Search by email - Success**
- [ ] GET `/api/cashout/customers/search?q=customer@test.com`
- [ ] Expected: Customer found
- [ ] Verify balance field present

**Test 2.3: Search by phone - Success**
- [ ] GET `/api/cashout/customers/search?q=5551234567`
- [ ] Expected: Customer found

**Test 2.4: Search too short - Validation Error**
- [ ] GET `/api/cashout/customers/search?q=T`
- [ ] Expected: 400 Bad Request
- [ ] Error: "Search query must be at least 2 characters"

**Test 2.5: Search with limit**
- [ ] GET `/api/cashout/customers/search?q=test&limit=5`
- [ ] Expected: Max 5 results returned

---

### 3. Customer Balance

#### GET /api/cashout/customers/:customerId/balance

**Test 3.1: Get balance - Success**
- [ ] Login as venue manager
- [ ] GET `/api/cashout/customers/{customerId}/balance`
- [ ] Expected: 200 OK
- [ ] Verify `customer.balance` matches database
- [ ] Verify `todayActivity` object present
- [ ] Verify `recentTransactions` array present

**Test 3.2: Get balance - Customer not found**
- [ ] GET `/api/cashout/customers/000000000000000000000000/balance`
- [ ] Expected: 404 Not Found
- [ ] Error: "Customer not found"

---

### 4. Process Cashout

#### POST /api/cashout/venues/:storeId/process

**Test 4.1: Valid cashout - Success**
- [ ] Login as venue manager
- [ ] POST `/api/cashout/venues/{storeId}/process`
  ```json
  {
    "customerId": "testCustomerId",
    "tokensToConvert": 10000,
    "notes": "Test cashout"
  }
  ```
- [ ] Expected: 200 OK with transaction details
- [ ] Verify `transaction.tokensConverted: 10000`
- [ ] Verify `transaction.cashAmount: 10.00`
- [ ] Verify `transaction.status: "completed"`
- [ ] Verify database: Customer balance decreased by 10000
- [ ] Verify database: Transaction record created

**Test 4.2: Minimum cashout validation**
- [ ] POST with `tokensToConvert: 1000` (< $5 minimum)
- [ ] Expected: 400 Bad Request
- [ ] Error should mention minimum cashout

**Test 4.3: Maximum cashout validation**
- [ ] POST with `tokensToConvert: 1000000` (> $500 maximum)
- [ ] Expected: 400 Bad Request
- [ ] Error should mention maximum cashout

**Test 4.4: Insufficient balance**
- [ ] POST with `tokensToConvert: 999999999` (more than customer has)
- [ ] Expected: 400 Bad Request
- [ ] Error: "Insufficient balance"

**Test 4.5: Daily customer limit**
- [ ] Process multiple cashouts totaling > $1000 for same customer
- [ ] Expected: Last transaction fails with 400 Bad Request
- [ ] Error should mention customer daily limit

**Test 4.6: Daily staff limit**
- [ ] Process cashouts totaling > $5000 by same staff member
- [ ] Expected: Last transaction fails with 400 Bad Request
- [ ] Error should mention staff daily limit

**Test 4.7: Missing required fields**
- [ ] POST without `customerId`
- [ ] Expected: 400 Bad Request
- [ ] Error: "customerId and tokensToConvert are required"

**Test 4.8: Negative tokens**
- [ ] POST with `tokensToConvert: -1000`
- [ ] Expected: 400 Bad Request
- [ ] Error: "tokensToConvert must be positive"

**Test 4.9: Zero tokens**
- [ ] POST with `tokensToConvert: 0`
- [ ] Expected: 400 Bad Request

**Test 4.10: Atomic transaction rollback**
- [ ] Simulate database error during transaction
- [ ] Expected: Transaction rolled back
- [ ] Verify customer balance unchanged
- [ ] Verify no transaction record created

---

### 5. Cashout History

#### GET /api/cashout/venues/:storeId/history

**Test 5.1: Get history - Success**
- [ ] Login as venue manager
- [ ] GET `/api/cashout/venues/{storeId}/history`
- [ ] Expected: 200 OK
- [ ] Verify `transactions` array present
- [ ] Verify `pagination` object present
- [ ] Verify `summary` object present with totals

**Test 5.2: Filter by date range**
- [ ] GET `/api/cashout/venues/{storeId}/history?startDate=2024-01-01&endDate=2024-12-31`
- [ ] Expected: Only transactions within date range

**Test 5.3: Filter by status**
- [ ] GET `/api/cashout/venues/{storeId}/history?status=completed`
- [ ] Expected: Only completed transactions

**Test 5.4: Filter by customer**
- [ ] GET `/api/cashout/venues/{storeId}/history?customerId={customerId}`
- [ ] Expected: Only transactions for that customer

**Test 5.5: Pagination**
- [ ] GET `/api/cashout/venues/{storeId}/history?limit=10&offset=0`
- [ ] Expected: First 10 transactions
- [ ] GET `/api/cashout/venues/{storeId}/history?limit=10&offset=10`
- [ ] Expected: Next 10 transactions

**Test 5.6: Summary calculation**
- [ ] Process 3 test cashouts
- [ ] GET history
- [ ] Verify `summary.totalTransactions: 3`
- [ ] Verify `summary.totalCashPaid` is sum of all usdAmounts
- [ ] Verify `summary.totalTokensConverted` is sum of all amounts

---

### 6. Daily Reconciliation

#### GET /api/cashout/venues/:storeId/reconciliation/:date

**Test 6.1: Get reconciliation - Success**
- [ ] Login as venue manager
- [ ] GET `/api/cashout/venues/{storeId}/reconciliation/2024-01-15`
- [ ] Expected: 200 OK
- [ ] Verify `reconciliation.date` matches
- [ ] Verify `cashouts` summary present
- [ ] Verify `cashFlow` calculation present

**Test 6.2: Reconciliation with no transactions**
- [ ] GET reconciliation for date with no cashouts
- [ ] Expected: 200 OK with zero values

---

### 7. Reverse Cashout

#### POST /api/cashout/reverse/:transactionId

**Test 7.1: Reverse cashout - Success (Admin)**
- [ ] Login as super_admin
- [ ] Create a test cashout transaction
- [ ] POST `/api/cashout/reverse/{transactionId}`
  ```json
  {
    "reason": "Customer dispute - duplicate transaction"
  }
  ```
- [ ] Expected: 200 OK
- [ ] Verify customer balance increased back
- [ ] Verify original transaction marked as `status: "failed"`
- [ ] Verify `metadata.reversed: true`
- [ ] Verify reversal transaction created

**Test 7.2: Reverse - Permission denied (Venue Manager)**
- [ ] Login as venue_manager
- [ ] POST reverse endpoint
- [ ] Expected: 403 Forbidden

**Test 7.3: Reverse - Missing reason**
- [ ] Login as super_admin
- [ ] POST without `reason` field
- [ ] Expected: 400 Bad Request
- [ ] Error: "Reason is required"

**Test 7.4: Reverse - Reason too short**
- [ ] POST with `reason: "oops"`
- [ ] Expected: 400 Bad Request
- [ ] Error: Minimum 5 characters

**Test 7.5: Reverse - Transaction not found**
- [ ] POST with invalid transaction ID
- [ ] Expected: 400 Bad Request
- [ ] Error: "Transaction not found"

**Test 7.6: Reverse - Already reversed**
- [ ] Reverse same transaction twice
- [ ] Expected: 400 Bad Request
- [ ] Error: "Transaction already reversed"

**Test 7.7: Reverse - Non-cashout transaction**
- [ ] Try to reverse a "purchase" transaction
- [ ] Expected: 400 Bad Request
- [ ] Error: "Can only reverse cashout transactions"

---

### 8. Cashout Statistics

#### GET /api/cashout/stats/venues/:storeId

**Test 8.1: Get stats - Today**
- [ ] Login as venue manager
- [ ] GET `/api/cashout/stats/venues/{storeId}?period=today`
- [ ] Expected: 200 OK
- [ ] Verify stats for today only

**Test 8.2: Get stats - 7 days**
- [ ] GET `/api/cashout/stats/venues/{storeId}?period=7days`
- [ ] Expected: Last 7 days of stats

**Test 8.3: Get stats - 30 days**
- [ ] GET `/api/cashout/stats/venues/{storeId}?period=30days`
- [ ] Expected: Last 30 days of stats

**Test 8.4: Stats accuracy**
- [ ] Verify `totalTransactions` count matches
- [ ] Verify `totalCashPaid` sum is correct
- [ ] Verify `avgCashAmount` calculated properly
- [ ] Verify `uniqueCustomers` count is accurate

---

## Permission & Security Tests

### 9. RBAC Enforcement

**Test 9.1: Super Admin - Full access**
- [ ] Login as super_admin
- [ ] Access all cashout endpoints
- [ ] Expected: All succeed

**Test 9.2: Gambino Ops - No reverse**
- [ ] Login as gambino_ops
- [ ] Access process cashout - Expected: Success
- [ ] Access reverse cashout - Expected: 403 Forbidden

**Test 9.3: Venue Manager - Assigned venues only**
- [ ] Login as venue_manager
- [ ] Access own venue cashout - Expected: Success
- [ ] Access different venue cashout - Expected: 403 Forbidden

**Test 9.4: Venue Staff - Process but limited**
- [ ] Login as venue_staff
- [ ] Access process cashout - Expected: Success
- [ ] Access reverse cashout - Expected: 403 Forbidden

**Test 9.5: Regular User - No access**
- [ ] Login as regular user (customer)
- [ ] Access any cashout endpoint - Expected: 403 Forbidden

**Test 9.6: Unauthenticated - No access**
- [ ] Access endpoints without token
- [ ] Expected: 401 Unauthorized

---

## Database Integrity Tests

### 10. Transaction Atomicity

**Test 10.1: Success path - Commit**
- [ ] Process valid cashout
- [ ] Verify customer balance updated
- [ ] Verify transaction record created
- [ ] Verify both or neither (atomic)

**Test 10.2: Failure path - Rollback**
- [ ] Trigger validation error mid-transaction
- [ ] Verify customer balance unchanged
- [ ] Verify no transaction record created

**Test 10.3: Negative balance prevention**
- [ ] Mock race condition attempt
- [ ] Verify transaction aborts if balance would go negative
- [ ] Verify error: "Transaction would result in negative balance"

---

## Edge Cases & Error Handling

### 11. Edge Cases

**Test 11.1: Exactly minimum cashout**
- [ ] POST with `tokensToConvert: 5000` (exactly $5)
- [ ] Expected: Success

**Test 11.2: Exactly maximum cashout**
- [ ] POST with `tokensToConvert: 500000` (exactly $500)
- [ ] Expected: Success

**Test 11.3: Just under daily limit**
- [ ] Cashout $999 same day
- [ ] Expected: Success

**Test 11.4: Exactly at daily limit**
- [ ] Cashout $1000 total same day
- [ ] Expected: Last transaction succeeds

**Test 11.5: Just over daily limit**
- [ ] Cashout $1001 total same day
- [ ] Expected: Last transaction fails

**Test 11.6: Customer with zero balance**
- [ ] Customer with `gambinoBalance: 0`
- [ ] POST cashout
- [ ] Expected: 400 "Insufficient balance"

**Test 11.7: Decimal token amounts**
- [ ] POST with `tokensToConvert: 5000.5`
- [ ] Expected: Should handle properly (round or reject)

**Test 11.8: Very large token amount**
- [ ] POST with `tokensToConvert: 999999999999`
- [ ] Expected: Validation catches (max limit)

**Test 11.9: Special characters in notes**
- [ ] POST with notes containing `<script>alert('xss')</script>`
- [ ] Expected: Sanitized/escaped properly

**Test 11.10: Commission calculation**
- [ ] Update config with `venueCommissionPercent: 2.5`
- [ ] Process $100 cashout
- [ ] Verify `venueCommission: 2.50`
- [ ] Verify `cashToCustomer: 97.50`

---

## Frontend Integration Tests

### 12. Cashout Page Tests

**Test 12.1: Page loads**
- [ ] Navigate to `/admin/cashout`
- [ ] Expected: Page renders without errors
- [ ] Verify search input visible

**Test 12.2: Customer search**
- [ ] Type "Test" in search
- [ ] Wait for autocomplete
- [ ] Verify customer results appear

**Test 12.3: Select customer**
- [ ] Click customer from results
- [ ] Verify customer card displays
- [ ] Verify balance shows

**Test 12.4: Token amount validation - Client side**
- [ ] Enter `1000` tokens (< minimum)
- [ ] Verify warning message displays

**Test 12.5: Real-time cash calculation**
- [ ] Enter `10000` tokens
- [ ] Verify displays `$10.00`
- [ ] Change to `5000`
- [ ] Verify updates to `$5.00`

**Test 12.6: Preview modal**
- [ ] Fill valid cashout
- [ ] Click "Preview Transaction"
- [ ] Verify modal displays
- [ ] Verify all details correct

**Test 12.7: Confirm cashout**
- [ ] In preview modal, click "Confirm"
- [ ] Verify API call made
- [ ] Verify receipt modal displays

**Test 12.8: Receipt display**
- [ ] Verify transaction ID shown
- [ ] Verify amounts correct
- [ ] Verify "Print Receipt" button works

**Test 12.9: Error handling**
- [ ] Mock API error
- [ ] Verify error message displays to user

**Test 12.10: Reset after success**
- [ ] Complete cashout
- [ ] Close receipt
- [ ] Verify form resets

---

### 13. Transaction History Page Tests

**Test 13.1: Page loads**
- [ ] Navigate to `/admin/transactions`
- [ ] Expected: Page renders without errors
- [ ] Verify summary cards visible

**Test 13.2: Transaction list displays**
- [ ] Verify transactions load
- [ ] Verify table shows on desktop
- [ ] Verify cards show on mobile

**Test 13.3: Summary cards accurate**
- [ ] Verify "Total Transactions" count
- [ ] Verify "Tokens Converted" sum
- [ ] Verify "Cash Paid Out" sum

**Test 13.4: Date filter**
- [ ] Select date range
- [ ] Verify transactions filtered

**Test 13.5: Status filter**
- [ ] Select "Completed"
- [ ] Verify only completed shown

**Test 13.6: Search filter**
- [ ] Type customer name
- [ ] Verify results filtered

**Test 13.7: Pagination**
- [ ] Verify pagination controls
- [ ] Click "Next" page
- [ ] Verify new transactions load

**Test 13.8: Export CSV**
- [ ] Click "Export CSV"
- [ ] Verify file downloads
- [ ] Open CSV, verify data correct

---

### 14. Navigation Tests

**Test 14.1: Menu items visible**
- [ ] Login as venue_manager
- [ ] Verify "Token Cashout" in sidebar
- [ ] Verify "Transactions" in sidebar

**Test 14.2: Menu items permission-based**
- [ ] Login as regular user
- [ ] Verify cashout items NOT visible

**Test 14.3: Navigation works**
- [ ] Click "Token Cashout"
- [ ] Verify page loads
- [ ] Click "Transactions"
- [ ] Verify page loads

---

## Performance Tests

### 15. Load & Performance

**Test 15.1: Large customer search results**
- [ ] Search query returning 100+ results
- [ ] Verify limit enforced (20)
- [ ] Verify page remains responsive

**Test 15.2: Large transaction history**
- [ ] Load history with 1000+ transactions
- [ ] Verify pagination works
- [ ] Verify page load time < 3 seconds

**Test 15.3: Concurrent cashouts**
- [ ] Simulate 5 staff processing cashouts simultaneously
- [ ] Verify all transactions process correctly
- [ ] Verify no race conditions

**Test 15.4: Database query optimization**
- [ ] Check MongoDB slow query log
- [ ] Verify indexes are used
- [ ] Query time < 100ms

---

## Final Verification

### 16. Complete Workflow Test

**End-to-End Cashout Workflow:**
- [ ] Login as venue_manager
- [ ] Navigate to Token Cashout page
- [ ] Search for customer by phone
- [ ] Select customer from results
- [ ] Verify balance displays correctly
- [ ] Enter 10000 tokens
- [ ] Verify shows $10.00
- [ ] Click "Preview Transaction"
- [ ] Verify preview shows correct amounts
- [ ] Click "Confirm & Process"
- [ ] Wait for processing
- [ ] Verify receipt displays
- [ ] Note transaction ID
- [ ] Navigate to Transactions page
- [ ] Verify transaction appears in history
- [ ] Search for transaction by ID
- [ ] Verify all details match
- [ ] Export transactions to CSV
- [ ] Verify CSV contains the transaction
- [ ] Logout

### 17. Admin Reversal Workflow

- [ ] Login as super_admin
- [ ] Navigate to Transactions
- [ ] Find completed cashout
- [ ] Click reverse (if UI implemented) or use API
- [ ] Enter reversal reason
- [ ] Confirm reversal
- [ ] Verify original transaction marked reversed
- [ ] Verify customer balance restored
- [ ] Verify reversal transaction created

---

## Sign-Off

### Backend Tests
- [ ] All API endpoints functional
- [ ] All validations working
- [ ] Permissions enforced correctly
- [ ] Database integrity maintained
- [ ] Error handling comprehensive

### Frontend Tests
- [ ] All pages render correctly
- [ ] Navigation working
- [ ] Forms validate properly
- [ ] Mobile responsive
- [ ] Error messages user-friendly

### Integration Tests
- [ ] End-to-end workflow succeeds
- [ ] Data consistency between frontend/backend
- [ ] Real-time calculations accurate
- [ ] Export functionality works

### Security Tests
- [ ] Authentication required
- [ ] Authorization enforced
- [ ] RBAC working correctly
- [ ] No XSS vulnerabilities
- [ ] SQL injection prevented (NoSQL)

### Performance Tests
- [ ] Page load times acceptable
- [ ] API response times < 500ms
- [ ] No memory leaks
- [ ] Handles concurrent requests

---

**Tested By:** _______________
**Date:** _______________
**Environment:** [ ] Development [ ] Staging [ ] Production
**All Tests Passed:** [ ] Yes [ ] No

**Notes:**
```
[Any issues found, deviations, or additional observations]
```

**Ready for Production:** [ ] Yes [ ] No

---

## Post-Deployment Verification

After deploying to production:

- [ ] Run smoke tests on production environment
- [ ] Verify environment variables set correctly
- [ ] Check MongoDB replica set status
- [ ] Verify seed script ran successfully
- [ ] Test one end-to-end cashout with real user
- [ ] Monitor logs for errors
- [ ] Set up monitoring/alerts for failed transactions
- [ ] Verify backup system working
- [ ] Document any production-specific configurations
- [ ] Train venue staff on cashout process

---

**Production Deployment Approved By:** _______________
**Date:** _______________

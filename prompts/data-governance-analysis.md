# Data Governance Analysis Prompt

Use this prompt with Claude CLI to generate a comprehensive data governance overview.

---

Analyze this codebase and the backend at ~/Downloads/gambino-backend-backup-local/backend/ to create a comprehensive DATA GOVERNANCE TECHNICAL OVERVIEW document.

## What to analyze:

1. **Data Flow Architecture**
   - Where does user PII live? (MongoDB collections, fields)
   - How does data flow: User → Gambino → VDV → Venues
   - What APIs expose PII and to whom?

2. **Access Control Implementation**
   - RBAC roles and permissions (check src/middleware/rbac.js)
   - Venue-scoped access controls (userManagement.js changes we just made)
   - What can each role see/do?

3. **Current Security Measures**
   - Encryption (AES-256-GCM for wallet keys, etc.)
   - Authentication (JWT structure, token handling)
   - Audit logging (what's logged, what's not)

4. **Demo Mode / Anonymization**
   - How demo mode works (src/lib/demoAnonymizer.ts, auth.ts isDemoMode)
   - What gets anonymized, what doesn't
   - UI protections (disabled inputs, blocked mutations)

5. **Sensitive Data Inventory**
   - List all PII fields in User schema
   - List all financial data fields
   - Wallet/key storage approach

6. **Gaps & Recommendations**
   - What's missing for full GDPR/CCPA compliance?
   - Data retention policies (do we have any?)
   - Data subject request handling (delete my data, export my data)
   - Breach notification procedures

7. **Three-Party Structure**
   - Document Gambino vs VDV vs Venue responsibilities
   - Who is data controller vs processor?
   - Reference the compliance docs if they exist

## Output Format:

Create a markdown document called `DATA_GOVERNANCE_OVERVIEW.md` that:
- Has clear sections for each area above
- Includes code references (file:line) for key implementations
- Has a "Current State" and "Future Needs" subsection for each area
- Ends with a prioritized action items list

Also check for and reference:
- .env.secrets or any secrets documentation
- Any existing compliance docs in the repo
- The backend server.js User schema

This should be a living document we can evolve as the system grows.

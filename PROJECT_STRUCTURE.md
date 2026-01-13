# Gambino Project Structure

## IMPORTANT LOCATIONS

| App | Local Code | Git Remote | Deployment |
|-----|-----------|------------|------------|
| **Admin** (admin.gambino.gold) | `~/Downloads/gambino-backend-backup-local/gambino-admin-v2/` | `git@github.com:BuberryWorldwide/gambino-admin-v2.git` | Vercel |
| **Users** (app.gambino.gold) | `~/vault/gambino-users/` | `git@github.com:BuberryWorldwide/gambino-users.git` | Vercel |
| **Backend API** | `192.168.1.235:/opt/gambino/backend/` | N/A (edit directly on server) | PM2 |

## Backend Server (192.168.1.235)

**SSH:** `ssh -p 2222 nhac@192.168.1.235`

### PM2 Processes
- `gambino-backend` - Main API (port 3001)
- `gambino-admin-v2` - Admin backend
- `vdv-api` - VDV API

### Backend Commands
```bash
# Restart
pm2 restart gambino-backend

# View logs
pm2 logs gambino-backend --lines 50

# Full restart (if issues)
pm2 delete gambino-backend && cd /opt/gambino/backend && pm2 start server.js --name gambino-backend
```

## Deployment Workflow

### Frontend (Vercel auto-deploy)
```bash
cd ~/vault/gambino-users  # or admin-v2
npm run build
git add -A && git commit -m "message" && git push origin main
# Vercel auto-deploys
```

### Backend (Direct on server)
```bash
ssh -p 2222 nhac@192.168.1.235
cd /opt/gambino/backend
# Edit server.js or other files
pm2 restart gambino-backend
```

## Key Files

### Backend (/opt/gambino/backend/)
- `server.js` - Main Express server (all routes)
- `src/models/User.js` - User schema
- `src/models/Referral.js` - Referral schema
- `src/routes/referral.js` - Referral API

### Users App (~/vault/gambino-users/)
- `src/app/dashboard/page.js` - Dashboard
- `src/app/dashboard/components/tabs/` - AccountTab, ReferralTab, etc.
- `src/lib/api.js` - API client
- `src/app/onboard/page.js` - Registration

## Database
- MongoDB (via `process.env.MONGODB_URI`)
- Query: `ssh -p 2222 nhac@192.168.1.235 "cd /opt/gambino/backend && node -e '...'"`

## Notes
- Use `.lean()` in mongoose queries to get raw documents (fixes field access issues)
- SSH uses port 2222
- GitHub SSH key: `~/.ssh/id_ed25519`

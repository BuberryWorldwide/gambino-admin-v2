#!/bin/bash
#
# Gambino Admin v2 - Deployment Script
# Run this script to deploy to production server
#

set -e

LOCAL_DIR="/home/nhac/Downloads/gambino-backend-backup-local/gambino-admin-v2"
REMOTE_HOST="nhac@192.168.1.235"
REMOTE_DIR="/opt/gambino-admin-v2"
SSH_PORT="2222"
SSH_KEY="$HOME/vault/ssh-backup/id_ed25519"

echo "=========================================="
echo "Gambino Admin v2 - Deployment"
echo "=========================================="
echo ""
echo "Local:  $LOCAL_DIR"
echo "Remote: $REMOTE_HOST:$REMOTE_DIR"
echo "Port:   $SSH_PORT"
echo ""

# Step 1: Sync files
echo "Step 1: Syncing files to server..."
rsync -avz --delete \
  -e "ssh -p $SSH_PORT -i $SSH_KEY" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'backups' \
  --exclude '.env.secrets' \
  --exclude 'deploy.sh' \
  "$LOCAL_DIR/" \
  "$REMOTE_HOST:$REMOTE_DIR/"

echo ""
echo "Step 2: Installing dependencies on server..."
ssh -p $SSH_PORT -i $SSH_KEY $REMOTE_HOST "cd $REMOTE_DIR && npm install --production"

echo ""
echo "Step 3: Restarting PM2 process..."
ssh -p $SSH_PORT -i $SSH_KEY $REMOTE_HOST "pm2 restart gambino-admin-v2 || pm2 start $REMOTE_DIR/ecosystem.config.js"

echo ""
echo "Step 4: Checking status..."
ssh -p $SSH_PORT -i $SSH_KEY $REMOTE_HOST "pm2 status gambino-admin-v2"

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Create the demo user in MongoDB"
echo "2. Test at https://admin.gambino.gold/login"

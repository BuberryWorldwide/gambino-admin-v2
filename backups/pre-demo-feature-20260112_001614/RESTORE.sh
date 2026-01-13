#!/bin/bash
#
# Restore Script - Reverts Demo Feature Changes
# Created: 2026-01-12
#
# This script restores all files to their pre-demo-feature state.
# Run from the gambino-admin-v2 directory.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "=========================================="
echo "Restoring Pre-Demo Feature State"
echo "=========================================="
echo ""
echo "Project directory: $PROJECT_DIR"
echo "Backup directory: $SCRIPT_DIR"
echo ""

read -p "Are you sure you want to restore? This will overwrite current files. (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Restoring files..."

# Restore modified files
cp "$SCRIPT_DIR/types-index.ts.bak" "$PROJECT_DIR/src/types/index.ts"
echo "✓ Restored src/types/index.ts"

cp "$SCRIPT_DIR/auth.ts.bak" "$PROJECT_DIR/src/lib/auth.ts"
echo "✓ Restored src/lib/auth.ts"

cp "$SCRIPT_DIR/api.ts.bak" "$PROJECT_DIR/src/lib/api.ts"
echo "✓ Restored src/lib/api.ts"

cp "$SCRIPT_DIR/layout.tsx.bak" "$PROJECT_DIR/src/app/layout.tsx"
echo "✓ Restored src/app/layout.tsx"

cp "$SCRIPT_DIR/AdminLayout.tsx.bak" "$PROJECT_DIR/src/components/layout/AdminLayout.tsx"
echo "✓ Restored src/components/layout/AdminLayout.tsx"

cp "$SCRIPT_DIR/gitignore.bak" "$PROJECT_DIR/.gitignore"
echo "✓ Restored .gitignore"

# Remove new files created by demo feature
echo ""
echo "Removing demo feature files..."

rm -f "$PROJECT_DIR/src/components/DemoModeContext.tsx"
echo "✓ Removed src/components/DemoModeContext.tsx"

rm -f "$PROJECT_DIR/src/components/DemoBanner.tsx"
echo "✓ Removed src/components/DemoBanner.tsx"

rm -f "$PROJECT_DIR/src/components/DemoDisabled.tsx"
echo "✓ Removed src/components/DemoDisabled.tsx"

rm -f "$PROJECT_DIR/.env.secrets"
echo "✓ Removed .env.secrets"

rm -f "$PROJECT_DIR/DEMO_ACCOUNT_SETUP.md"
echo "✓ Removed DEMO_ACCOUNT_SETUP.md"

rm -rf "$PROJECT_DIR/scripts"
echo "✓ Removed scripts directory"

echo ""
echo "=========================================="
echo "Restore complete!"
echo "=========================================="
echo ""
echo "Note: The demo user in MongoDB (if created) was NOT removed."
echo "To remove it, run in mongosh:"
echo "  db.users.deleteOne({ email: 'demo@gambino.gold' })"

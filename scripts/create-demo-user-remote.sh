#!/bin/bash
#
# Create Demo User - Remote Execution Script
# This script SSHs into the server and creates the demo user in MongoDB
#

set -e

REMOTE_HOST="nhac@192.168.1.235"
SSH_PORT="2222"

DEMO_EMAIL="demo@gambino.gold"
DEMO_PASSWORD="demo2024!"
NIMBUS_STORE_ID="gallatin_nimbus_298"

echo "=========================================="
echo "Creating Demo User in MongoDB"
echo "=========================================="
echo ""
echo "Email:    $DEMO_EMAIL"
echo "Password: $DEMO_PASSWORD"
echo "Store:    Nimbus 1 ($NIMBUS_STORE_ID)"
echo ""

# Generate bcrypt hash on the server
echo "Connecting to server and creating user..."

ssh -p $SSH_PORT $REMOTE_HOST << 'ENDSSH'
cd /opt/gambino/backend

# Generate password hash
echo "Generating password hash..."
PASSWORD_HASH=$(node -e "require('bcrypt').hash('demo2024!', 10).then(h => console.log(h))")

echo "Creating/updating demo user in MongoDB..."

# Run MongoDB command
docker exec -i gambino_mongodb mongosh "mongodb://gambinouser:jhI%2BPDopCbhL%2FuAwniiKU2DSQX6Rv8LEXR5smWQZfIU%3D@localhost:27017/gambino?authSource=admin" --quiet << MONGOEOF
const passwordHash = "$PASSWORD_HASH";

const result = db.users.updateOne(
  { email: "demo@gambino.gold" },
  {
    \$set: {
      password: passwordHash,
      firstName: "Demo",
      lastName: "Account",
      role: "venue_manager",
      assignedVenues: ["gallatin_nimbus_298"],
      permissions: [],
      isDemo: true,
      isActive: true,
      isVerified: true,
      gambinoBalance: 0,
      gluckScore: 0,
      tier: "none",
      updatedAt: new Date()
    },
    \$setOnInsert: {
      createdAt: new Date()
    }
  },
  { upsert: true }
);

if (result.upsertedCount > 0) {
  print("✓ Demo user CREATED successfully!");
} else if (result.modifiedCount > 0) {
  print("✓ Demo user UPDATED successfully!");
} else {
  print("✓ Demo user already exists with correct settings.");
}

// Verify
const user = db.users.findOne({ email: "demo@gambino.gold" }, { password: 0 });
print("");
print("Demo User Details:");
print("  _id: " + user._id);
print("  email: " + user.email);
print("  role: " + user.role);
print("  isDemo: " + user.isDemo);
print("  assignedVenues: " + JSON.stringify(user.assignedVenues));
MONGOEOF

ENDSSH

echo ""
echo "=========================================="
echo "Demo user setup complete!"
echo ""
echo "Login credentials:"
echo "  URL:      https://admin.gambino.gold/login"
echo "  Email:    $DEMO_EMAIL"
echo "  Password: $DEMO_PASSWORD"
echo "=========================================="

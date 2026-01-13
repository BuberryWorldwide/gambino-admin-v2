/**
 * MongoDB Script: Create Demo User for Marketing
 *
 * This script creates a read-only demo account that displays data from the Nimbus 1 store.
 * The account has isDemo=true which triggers read-only mode in the admin frontend.
 *
 * Run this script on the production server:
 *
 * SSH into the server:
 *   ssh nhac@192.168.1.235
 *
 * Then run:
 *   docker exec -it gambino_mongodb mongosh "mongodb://gambinouser:jhI%2BPDopCbhL%2FuAwniiKU2DSQX6Rv8LEXR5smWQZfIU%3D@localhost:27017/gambino?authSource=admin" --file /path/to/create-demo-user.js
 *
 * Or copy the script content and paste into mongosh:
 *   docker exec -it gambino_mongodb mongosh "mongodb://gambinouser:jhI%2BPDopCbhL%2FuAwniiKU2DSQX6Rv8LEXR5smWQZfIU%3D@localhost:27017/gambino?authSource=admin"
 */

// Switch to gambino database
use('gambino');

// Demo user configuration
const demoEmail = 'demo@gambino.gold';
const demoPassword = '$2b$10$YourHashedPasswordHere'; // You'll need to generate this with bcrypt

// First, check if user already exists
const existingUser = db.users.findOne({ email: demoEmail });

if (existingUser) {
  print('Demo user already exists. Updating isDemo flag...');
  db.users.updateOne(
    { email: demoEmail },
    {
      $set: {
        isDemo: true,
        role: 'venue_manager',
        assignedVenues: ['gallatin_nimbus_298'],
        firstName: 'Demo',
        lastName: 'Account',
        isActive: true,
        updatedAt: new Date()
      }
    }
  );
  print('Demo user updated successfully!');
} else {
  print('Creating new demo user...');

  // Create the demo user
  // NOTE: You need to hash the password first using bcrypt
  // Use this Node.js snippet to generate hash:
  //   const bcrypt = require('bcrypt');
  //   const hash = await bcrypt.hash('demo2024!', 10);
  //   console.log(hash);

  db.users.insertOne({
    email: demoEmail,
    // IMPORTANT: Replace this with actual bcrypt hash of 'demo2024!'
    // Generate with: node -e "require('bcrypt').hash('demo2024!', 10).then(h => console.log(h))"
    password: '$2b$10$REPLACE_WITH_ACTUAL_HASH',
    firstName: 'Demo',
    lastName: 'Account',
    role: 'venue_manager',
    assignedVenues: ['gallatin_nimbus_298'], // Nimbus 1 store
    permissions: [],
    isDemo: true,        // This flag enables read-only mode
    isActive: true,
    isVerified: true,
    gambinoBalance: 0,
    gluckScore: 0,
    tier: 'none',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  print('Demo user created successfully!');
}

// Verify the user
const demoUser = db.users.findOne({ email: demoEmail });
print('\nDemo User Details:');
print('  Email:', demoUser.email);
print('  Role:', demoUser.role);
print('  isDemo:', demoUser.isDemo);
print('  Assigned Venues:', JSON.stringify(demoUser.assignedVenues));
print('\nDemo account is ready for use at the admin login page.');

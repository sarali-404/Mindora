/**
 * Create a test user with email already verified (no OTP needed).
 * Usage:
 *   node scripts/createTestUser.js <email> <password> [firstName] [lastName]
 * Example:
 *   node scripts/createTestUser.js test@example.com Test@1234 John Doe
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const [,, email, password, firstName = 'Test', lastName = 'User'] = process.argv;

if (!email || !password) {
  console.error('Usage: node scripts/createTestUser.js <email> <password> [firstName] [lastName]');
  process.exit(1);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.error(`User with email "${email}" already exists.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  let username = baseUsername;
  let counter = 1;
  while (await User.findOne({ username })) {
    username = `${baseUsername}${counter++}`;
  }

  const user = new User({
    username,
    email: email.toLowerCase(),
    password,
    authProvider: 'local',
    verificationStatus: 'email_verified',
    isEmailVerified: true,
    registrationStep: 2,
    profile: {
      firstName,
      lastName,
    },
  });

  await user.save();
  console.log(`✅ Test user created:`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Username: ${username}`);
  console.log(`   Name:     ${firstName} ${lastName}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

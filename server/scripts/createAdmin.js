/**
 * Create the first admin account.
 * Usage: node scripts/createAdmin.js <username> <password>
 * Example: node scripts/createAdmin.js myadmin SuperSecret123
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Admin = require('../src/models/Admin');

const [,, username, password] = process.argv;

if (!username || !password) {
  console.error('Usage: node scripts/createAdmin.js <username> <password>');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const exists = await Admin.findOne({ username: username.toLowerCase() });
  if (exists) {
    console.error(`Admin "${username}" already exists.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const admin = await Admin.create({ username: username.toLowerCase(), password });
  console.log(`✅ Admin created: ${admin.username} (${admin._id})`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

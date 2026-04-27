/**
 * Repair orphaned achievement entries and re-evaluate for all users.
 * Run once after a destructive reseed (deleteMany + insertMany) broke _id references.
 * Run: node scripts/repairAchievements.js
 */

require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const UserGameProfile = require('../src/models/UserGameProfile');
const gamificationService = require('../src/services/gamificationService');

async function repairAchievements() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindora');
    console.log('✅ Connected to MongoDB');

    const Achievement = require('../src/models/Achievement');
    const validIds = (await Achievement.find({}, '_id').lean()).map(a => a._id.toString());
    console.log(`🔍 Found ${validIds.length} valid achievement IDs`);

    const profiles = await UserGameProfile.find({}).lean();
    console.log(`👤 Found ${profiles.length} user profile(s)`);

    for (const profile of profiles) {
      const before = profile.achievementsEarned?.length || 0;
      const valid = (profile.achievementsEarned || []).filter(e =>
        validIds.includes(e.achievement?.toString())
      );
      const removed = before - valid.length;

      // Update in place — strip orphaned entries
      await UserGameProfile.updateOne(
        { _id: profile._id },
        { $set: { achievementsEarned: valid } }
      );

      if (removed > 0) {
        console.log(`  🗑️  User ${profile.user}: removed ${removed} orphaned entries`);
      }

      // Re-evaluate so eligible achievements are re-awarded
      const awarded = await gamificationService.evaluateAchievements(profile.user);
      if (awarded.length > 0) {
        console.log(`  🏆  User ${profile.user}: re-awarded [${awarded.map(a => a.name).join(', ')}]`);
      } else {
        console.log(`  ✓   User ${profile.user}: no new achievements`);
      }
    }

    await mongoose.connection.close();
    console.log('✅ Done — database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Repair error:', error);
    process.exit(1);
  }
}

repairAchievements();

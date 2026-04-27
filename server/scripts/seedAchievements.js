/**
 * Seed achievements into MongoDB
 * Run: node scripts/seedAchievements.js
 */

require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Achievement = require('../src/models/Achievement');

const ACHIEVEMENTS = [
  {
    key: 'welcome_aboard',
    name: 'Welcome Aboard',
    description: 'Complete your profile setup',
    image: '/assets/achievements/welcome_aborad.png',
    isTiered: false,
    oneTimeTier: {
      xpReward: 25,
      criteria: 'Complete profile setup (name, bio, avatar, university)'
    },
    category: 'profile',
    evaluationKey: 'welcome_aboard',
    enabled: true
  },
  {
    key: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first goal',
    image: '/assets/achievements/first_steps.png',
    isTiered: false,
    oneTimeTier: {
      xpReward: 50,
      criteria: 'Complete and finish first goal'
    },
    category: 'goals',
    evaluationKey: 'first_steps',
    enabled: true
  },
  {
    key: 'goal_architect',
    name: 'Goal Architect',
    description: 'Plan your learning journey one goal at a time',
    image: '/assets/achievements/goal_architect.png',
    isTiered: true,
    tiers: [
      { level: 1, xpReward: 50,  criteria: 'Create 1 goal',   description: 'First Blueprint' },
      { level: 2, xpReward: 100, criteria: 'Create 3 goals',  description: 'Habit Builder' },
      { level: 3, xpReward: 200, criteria: 'Create 5 goals',  description: 'Consistent Planner' },
      { level: 4, xpReward: 350, criteria: 'Create 10 goals', description: 'Dedicated Architect' },
      { level: 5, xpReward: 500, criteria: 'Create 20 goals', description: 'Master Strategist' }
    ],
    category: 'goals',
    evaluationKey: 'goal_architect',
    enabled: true
  },
  {
    key: 'quiz_master',
    name: 'Quiz Master',
    description: 'Prove your knowledge by scoring high on quizzes',
    image: '/assets/achievements/quiz_master.png',
    isTiered: true,
    tiers: [
      { level: 1, xpReward: 75,  criteria: 'Complete 5 quizzes with 70%+ score',   description: 'Quiz Rookie' },
      { level: 2, xpReward: 150, criteria: 'Complete 15 quizzes with 75%+ score',  description: 'Quiz Apprentice' },
      { level: 3, xpReward: 300, criteria: 'Complete 30 quizzes with 80%+ score',  description: 'Quiz Veteran' },
      { level: 4, xpReward: 500, criteria: 'Complete 60 quizzes with 85%+ score',  description: 'Quiz Expert' },
      { level: 5, xpReward: 800, criteria: 'Complete 100 quizzes with 90%+ score', description: 'Quiz Legend' }
    ],
    category: 'quizzes',
    evaluationKey: 'quiz_master',
    enabled: true
  },
  {
    key: 'reading_bird',
    name: 'Reading Bird',
    description: 'Build deep understanding through consistent reading',
    image: '/assets/achievements/reading_bird.png',
    isTiered: true,
    tiers: [
      { level: 1, xpReward: 50,  criteria: 'Accumulate 5 hours of reading',   description: 'Curious Reader' },
      { level: 2, xpReward: 100, criteria: 'Accumulate 15 hours of reading',  description: 'Avid Reader' },
      { level: 3, xpReward: 200, criteria: 'Accumulate 30 hours of reading',  description: 'Devoted Scholar' },
      { level: 4, xpReward: 350, criteria: 'Accumulate 60 hours of reading',  description: 'Knowledge Seeker' },
      { level: 5, xpReward: 500, criteria: 'Accumulate 100 hours of reading', description: 'Bibliophile' }
    ],
    category: 'reading',
    evaluationKey: 'reading_bird',
    enabled: true
  },
  {
    key: 'streak_master',
    name: 'Streak Master',
    description: 'Study every day without breaking your streak',
    image: '/assets/achievements/streak_master.png',
    isTiered: true,
    tiers: [
      { level: 1, xpReward: 75,   criteria: 'Maintain a 7-day study streak',   description: 'Week Warrior' },
      { level: 2, xpReward: 150,  criteria: 'Maintain a 30-day study streak',  description: 'Month of Focus' },
      { level: 3, xpReward: 300,  criteria: 'Maintain a 90-day study streak',  description: 'Iron Discipline' },
      { level: 4, xpReward: 500,  criteria: 'Maintain a 180-day study streak', description: 'Half-Year Grinder' },
      { level: 5, xpReward: 1000, criteria: 'Maintain a 365-day study streak', description: 'Unstoppable' }
    ],
    category: 'streaks',
    evaluationKey: 'streak_master',
    enabled: true
  },
  {
    key: 'goal_crusher',
    name: 'Goal Crusher',
    description: 'Complete your learning goals and prove your dedication',
    image: '/assets/achievements/goal_crusher.png',
    isTiered: true,
    tiers: [
      { level: 1, xpReward: 100,  criteria: 'Complete 1 goal',  description: 'First Finish' },
      { level: 2, xpReward: 200,  criteria: 'Complete 3 goals',  description: 'Goal Getter' },
      { level: 3, xpReward: 400,  criteria: 'Complete 10 goals', description: 'Overachiever' },
      { level: 4, xpReward: 600,  criteria: 'Complete 20 goals', description: 'Goal Machine' },
      { level: 5, xpReward: 1000, criteria: 'Complete 50 goals', description: 'Unstoppable Force' }
    ],
    category: 'goals',
    evaluationKey: 'goal_crusher',
    enabled: true
  },
  {
    key: 'memory_master',
    name: 'Memory Master',
    description: 'Maintain excellent quiz averages across many attempts',
    image: '/assets/achievements/memory_master.png',
    isTiered: true,
    tiers: [
      { level: 1, xpReward: 100, criteria: 'Maintain 70%+ average on 10 quizzes',  description: 'Sharp Mind' },
      { level: 2, xpReward: 200, criteria: 'Maintain 75%+ average on 20 quizzes',  description: 'Quick Recall' },
      { level: 3, xpReward: 350, criteria: 'Maintain 80%+ average on 30 quizzes',  description: 'Precision Thinker' },
      { level: 4, xpReward: 500, criteria: 'Maintain 85%+ average on 50 quizzes',  description: 'Elite Memory' },
      { level: 5, xpReward: 750, criteria: 'Maintain 90%+ average on 75 quizzes',  description: 'Photographic Mind' }
    ],
    category: 'quizzes',
    evaluationKey: 'memory_master',
    enabled: true
  },
  {
    key: 'teaching_bird',
    name: 'Teaching Bird',
    description: 'Share your knowledge and materials with the community',
    image: '/assets/achievements/teaching_bird.png',
    isTiered: true,
    tiers: [
      { level: 1, xpReward: 75,  criteria: 'Share 1 material with the community',   description: 'First Contribution' },
      { level: 2, xpReward: 150, criteria: 'Share 5 materials with the community',   description: 'Helper' },
      { level: 3, xpReward: 300, criteria: 'Share 20 materials with the community',  description: 'Community Pillar' },
      { level: 4, xpReward: 500, criteria: 'Share 50 materials with the community',  description: 'Knowledge Hub' },
      { level: 5, xpReward: 800, criteria: 'Share 100 materials with the community', description: 'Mentor' }
    ],
    category: 'social',
    evaluationKey: 'teaching_bird',
    enabled: true
  },
  {
    key: 'morning_champion',
    name: 'Morning Champion',
    description: 'Start your days early with morning study sessions',
    image: '/assets/achievements/morning_champion.png',
    isTiered: true,
    tiers: [
      { level: 1, xpReward: 50,  criteria: 'Study before 8 AM on 14 different days',  description: 'Early Riser' },
      { level: 2, xpReward: 100, criteria: 'Study before 8 AM on 30 different days',  description: 'Dawn Devotee' },
      { level: 3, xpReward: 200, criteria: 'Study before 8 AM on 60 different days',  description: 'Morning Warrior' },
      { level: 4, xpReward: 350, criteria: 'Study before 8 AM on 120 different days', description: 'Sunrise Scholar' },
      { level: 5, xpReward: 600, criteria: 'Study before 8 AM on 365 different days', description: 'Early Bird Legend' }
    ],
    category: 'streaks',
    evaluationKey: 'morning_champion',
    enabled: true
  }
];

async function seedAchievements() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindora');
    console.log('✅ Connected to MongoDB');

    // Upsert by key — preserves existing _id so user earned-entries stay valid
    for (const ach of ACHIEVEMENTS) {
      const result = await Achievement.findOneAndUpdate(
        { key: ach.key },
        { $set: ach },
        { upsert: true, new: true }
      );
      console.log(`  ✓ ${result.name} (${result.key})`);
    }

    console.log(`✅ Upserted ${ACHIEVEMENTS.length} achievements`);

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seedAchievements();

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
    description: 'Plan your learning goals with precision',
    image: '/assets/achievements/goal_architect.png',
    isTiered: true,
    tiers: {
      bronze: {
        xpReward: 50,
        criteria: 'Create 1 goal with topics extraction',
        description: 'Create your first planned goal'
      },
      silver: {
        xpReward: 100,
        criteria: 'Create 3 goals with researched topics',
        description: 'Create 3 well-planned goals'
      },
      gold: {
        xpReward: 200,
        criteria: 'Create 5 goals with full planning and sub-topics',
        description: 'Architect 5 comprehensive goals'
      }
    },
    category: 'goals',
    evaluationKey: 'goal_architect',
    enabled: true
  },
  {
    key: 'quiz_master',
    name: 'Quiz Master',
    description: 'Achieve mastery through quizzes',
    image: '/assets/achievements/quiz_master.png',
    isTiered: true,
    tiers: {
      bronze: {
        xpReward: 75,
        criteria: 'Score 70%+ on 5 quizzes',
        description: 'Pass 5 quizzes at 70% or higher'
      },
      silver: {
        xpReward: 150,
        criteria: 'Score 80%+ on 15 quizzes',
        description: 'Ace 15 quizzes at 80% or higher'
      },
      gold: {
        xpReward: 300,
        criteria: 'Score 90%+ on 30 quizzes',
        description: 'Perfect 30 quizzes at 90% or higher'
      }
    },
    category: 'quizzes',
    evaluationKey: 'quiz_master',
    enabled: true
  },
  {
    key: 'reading_bird',
    name: 'Reading Bird',
    description: 'Learn through reading and studying',
    image: '/assets/achievements/reading_bird.png',
    isTiered: true,
    tiers: {
      bronze: {
        xpReward: 50,
        criteria: 'Spend 5 hours reading notes and summaries',
        description: 'Read for 5 hours'
      },
      silver: {
        xpReward: 100,
        criteria: 'Spend 15 hours reading',
        description: 'Read for 15 hours'
      },
      gold: {
        xpReward: 200,
        criteria: 'Spend 30 hours reading',
        description: 'Read for 30 hours'
      }
    },
    category: 'reading',
    evaluationKey: 'reading_bird',
    enabled: true
  },
  {
    key: 'streak_master',
    name: 'Streak Master',
    description: 'Maintain consistent study habits',
    image: '/assets/achievements/streak_master.png',
    isTiered: true,
    tiers: {
      bronze: {
        xpReward: 75,
        criteria: 'Maintain 7-day study streak',
        description: 'Study 7 days in a row'
      },
      silver: {
        xpReward: 150,
        criteria: 'Maintain 30-day streak',
        description: 'Study 30 days in a row'
      },
      gold: {
        xpReward: 300,
        criteria: 'Maintain 90-day streak',
        description: 'Study 90 days in a row'
      }
    },
    category: 'streaks',
    evaluationKey: 'streak_master',
    enabled: true
  },
  {
    key: 'goal_crusher',
    name: 'Goal Crusher',
    description: 'Complete multiple learning goals',
    image: '/assets/achievements/goal_crusher.png',
    isTiered: true,
    tiers: {
      bronze: {
        xpReward: 100,
        criteria: 'Complete 1 goal',
        description: 'Finish your first goal'
      },
      silver: {
        xpReward: 200,
        criteria: 'Complete 3 goals',
        description: 'Complete 3 goals'
      },
      gold: {
        xpReward: 400,
        criteria: 'Complete 10 goals',
        description: 'Complete 10 goals'
      }
    },
    category: 'goals',
    evaluationKey: 'goal_crusher',
    enabled: true
  },
  {
    key: 'memory_master',
    name: 'Memory Master',
    description: 'Achieve high scores consistently',
    image: '/assets/achievements/memory_master.png',
    isTiered: true,
    tiers: {
      bronze: {
        xpReward: 100,
        criteria: 'Reach 75% average on 10 quizzes',
        description: 'Maintain 75% average'
      },
      silver: {
        xpReward: 200,
        criteria: 'Reach 80% average on 20 quizzes',
        description: 'Maintain 80% average'
      },
      gold: {
        xpReward: 400,
        criteria: 'Reach 90% average on 30 quizzes',
        description: 'Maintain 90% average'
      }
    },
    category: 'quizzes',
    evaluationKey: 'memory_master',
    enabled: true
  },
  {
    key: 'teaching_bird',
    name: 'Teaching Bird',
    description: 'Share knowledge with the community',
    image: '/assets/achievements/teaching_bird.png',
    isTiered: true,
    tiers: {
      bronze: {
        xpReward: 75,
        criteria: 'Share 1 material',
        description: 'Share your first material'
      },
      silver: {
        xpReward: 150,
        criteria: 'Share 5 materials',
        description: 'Share 5 materials'
      },
      gold: {
        xpReward: 300,
        criteria: 'Share 20 materials',
        description: 'Share 20 materials'
      }
    },
    category: 'social',
    evaluationKey: 'teaching_bird',
    enabled: true
  },
  {
    key: 'morning_champion',
    name: 'Morning Champion',
    description: 'Study before 8 AM consistently',
    image: '/assets/achievements/morning_champion.png',
    isTiered: true,
    tiers: {
      bronze: {
        xpReward: 50,
        criteria: 'Study before 8 AM for 14 consecutive days',
        description: 'Morning study for 14 days'
      },
      silver: {
        xpReward: 100,
        criteria: 'Study before 8 AM for 30 consecutive days',
        description: 'Morning study for 30 days'
      },
      gold: {
        xpReward: 200,
        criteria: 'Study before 8 AM for 60 consecutive days',
        description: 'Morning study for 60 days'
      }
    },
    category: 'streaks',
    evaluationKey: 'morning_champion',
    enabled: true
  }
];

async function seedAchievements() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindora');
    console.log('✅ Connected to MongoDB');

    // Clear existing achievements
    await Achievement.deleteMany({});
    console.log('🗑️ Cleared existing achievements');

    // Insert new achievements
    const result = await Achievement.insertMany(ACHIEVEMENTS);
    console.log(`✅ Seeded ${result.length} achievements`);

    result.forEach(a => {
      console.log(`  - ${a.name} (${a.key})`);
    });

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seedAchievements();

import { useState, useEffect } from "react";
import { 
  FaFire, 
  FaClock, 
  FaCheckCircle, 
  FaChartBar, 
  FaTrophy, 
  FaBullseye, 
  FaBolt, 
  FaChartLine,
  FaMoon,
  FaUser,
  FaMedal
} from "react-icons/fa";
import styles from "./DashboardPage.module.css";

// Import achievement images
import goalArchitectImg from "../assets/achievements/goal_architect.png";
import quizMasterImg from "../assets/achievements/quiz_master.png";
import readingBirdImg from "../assets/achievements/reading_bird.png";
import streakMasterImg from "../assets/achievements/streak_master.png";

export default function DashboardPage() {
  // Hardcoded data - will be replaced with real data later
  const userData = {
    name: "Alex",
    level: 12,
    currentXP: 2840,
    xpToNextLevel: 3500,
    totalXP: 15840,
    streak: 7,
    longestStreak: 21,
    studyTimeToday: 3.5,
    studyTimeWeek: 18.5,
    tasksCompleted: 24,
    goalsCompleted: 3,
    rank: 3,
  };

  const weeklyActivity = [
    { day: "Mon", hours: 2.5 },
    { day: "Tue", hours: 3.2 },
    { day: "Wed", hours: 1.8 },
    { day: "Thu", hours: 4.1 },
    { day: "Fri", hours: 2.9 },
    { day: "Sat", hours: 3.5 },
    { day: "Sun", hours: 0.5 },
  ];

  const recentAchievements = [
    {
      id: 1,
      name: "Goal Architect",
      description: "Create learning goals",
      image: goalArchitectImg,
      currentLevel: 2,
      maxLevel: 5,
      currentProgress: 8,
      nextLevelTarget: 20,
    },
    {
      id: 2,
      name: "Quiz Master",
      description: "Score 100% on quizzes",
      image: quizMasterImg,
      currentLevel: 3,
      maxLevel: 5,
      currentProgress: 15,
      nextLevelTarget: 25,
    },
    {
      id: 3,
      name: "Reading Bird",
      description: "Upload and study materials",
      image: readingBirdImg,
      currentLevel: 2,
      maxLevel: 5,
      currentProgress: 24,
      nextLevelTarget: 50,
    },
    {
      id: 4,
      name: "Streak Master",
      description: "Maintain daily study streak",
      image: streakMasterImg,
      currentLevel: 0,
      maxLevel: 5,
      currentProgress: 12,
      nextLevelTarget: 30,
    },
  ];

  const leaderboard = [
    { rank: 1, name: "Sarah Chen", xp: 18240, avatarColor: "#ec4899" },
    { rank: 2, name: "Mike Johnson", xp: 17150, avatarColor: "#3b82f6" },
    { rank: 3, name: "You", xp: 15840, avatarColor: "#10b981", isYou: true },
    { rank: 4, name: "Emma Davis", xp: 14920, avatarColor: "#8b5cf6" },
    { rank: 5, name: "Tom Wilson", xp: 14100, avatarColor: "#f59e0b" },
  ];

  const quotes = [
    "The expert in anything was once a beginner.",
    "Success is the sum of small efforts repeated day in and day out.",
    "Learning never exhausts the mind.",
    "The beautiful thing about learning is that no one can take it away from you.",
    "Education is the passport to the future.",
  ];

  const [currentQuote, setCurrentQuote] = useState(quotes[0]);

  useEffect(() => {
    setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  const xpPercentage = (userData.currentXP / userData.xpToNextLevel) * 100;
  const maxHours = Math.max(...weeklyActivity.map((d) => d.hours));

  return (
    <div className={styles.page}>
      {/* Hero Section with Stats */}
      <section className={styles.heroSection}>
        <div className={styles.heroCard}>
          <div className={styles.heroLeft}>
            <h1 className={styles.heroTitle}>
              Welcome back, {userData.name}!
            </h1>
            <p className={styles.heroSubtitle}>{currentQuote}</p>
            <div className={styles.quickStats}>
              <div className={styles.quickStat}>
                <span className={styles.statIcon}>
                  <FaFire style={{ color: "#f59e0b" }} />
                </span>
                <div>
                  <p className={styles.statValue}>{userData.streak} days</p>
                  <p className={styles.statLabel}>Current Streak</p>
                </div>
              </div>
              <div className={styles.quickStat}>
                <span className={styles.statIcon}>
                  <FaClock style={{ color: "#3b82f6" }} />
                </span>
                <div>
                  <p className={styles.statValue}>{userData.studyTimeToday}h</p>
                  <p className={styles.statLabel}>Today</p>
                </div>
              </div>
              <div className={styles.quickStat}>
                <span className={styles.statIcon}>
                  <FaCheckCircle style={{ color: "#10b981" }} />
                </span>
                <div>
                  <p className={styles.statValue}>{userData.tasksCompleted}</p>
                  <p className={styles.statLabel}>Tasks Done</p>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.heroRight}>
            <div className={styles.levelCircle}>
              <svg className={styles.progressRing} width="160" height="160">
                <circle
                  className={styles.progressRingBg}
                  cx="80"
                  cy="80"
                  r="70"
                />
                <circle
                  className={styles.progressRingFill}
                  cx="80"
                  cy="80"
                  r="70"
                  strokeDasharray={`${
                    (xpPercentage / 100) * 439.8
                  } 439.8`}
                />
              </svg>
              <div className={styles.levelContent}>
                <p className={styles.levelNumber}>{userData.level}</p>
                <p className={styles.levelLabel}>Level</p>
                <p className={styles.xpProgress}>
                  {userData.currentXP} / {userData.xpToNextLevel} XP
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span className={styles.statCardIcon}>
              <FaChartBar style={{ color: "#0073a0" }} />
            </span>
            <h3 className={styles.statCardTitle}>Weekly Hours</h3>
          </div>
          <p className={styles.statCardValue}>{userData.studyTimeWeek}h</p>
          <p className={styles.statCardChange}>+12% from last week</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span className={styles.statCardIcon}>
              <FaTrophy style={{ color: "#0073a0" }} />
            </span>
            <h3 className={styles.statCardTitle}>Rank</h3>
          </div>
          <p className={styles.statCardValue}>#{userData.rank}</p>
          <p className={styles.statCardChange}>Top 5% this month</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span className={styles.statCardIcon}>
              <FaBullseye style={{ color: "#0073a0" }} />
            </span>
            <h3 className={styles.statCardTitle}>Goals</h3>
          </div>
          <p className={styles.statCardValue}>{userData.goalsCompleted}</p>
          <p className={styles.statCardChange}>Completed this month</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span className={styles.statCardIcon}>
              <FaBolt style={{ color: "#0073a0" }} />
            </span>
            <h3 className={styles.statCardTitle}>Best Streak</h3>
          </div>
          <p className={styles.statCardValue}>{userData.longestStreak} days</p>
          <p className={styles.statCardChange}>Personal record</p>
        </div>
      </section>

      {/* Weekly Activity Chart */}
      <section className={styles.chartSection}>
        <div className={styles.chartCard}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>Weekly Activity</h2>
            <span className={styles.chartLegend}>
              <FaChartLine style={{ color: "#10b981", marginRight: "0.5rem" }} />
              Total: {userData.studyTimeWeek}h
            </span>
          </div>
          <div className={styles.barChart}>
            {weeklyActivity.map((day) => (
              <div key={day.day} className={styles.barWrapper}>
                <div className={styles.barContainer}>
                  <div
                    className={styles.bar}
                    style={{
                      height: `${(day.hours / maxHours) * 100}%`,
                    }}
                  >
                    <span className={styles.barValue}>{day.hours}h</span>
                  </div>
                </div>
                <span className={styles.barLabel}>{day.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.achievementsCard}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>Recent Achievements</h2>
            <button className={styles.sectionLink}>View All</button>
          </div>
          <div className={styles.achievementsGrid}>
            {recentAchievements.map((achievement) => {
              const isUnlocked = achievement.currentLevel > 0;
              const isMaxLevel = achievement.currentLevel === achievement.maxLevel;
              const progressPercentage = achievement.currentLevel === 0
                ? (achievement.currentProgress / achievement.nextLevelTarget) * 100
                : isMaxLevel
                ? 100
                : ((achievement.currentProgress / achievement.nextLevelTarget) * 100);
              
              return (
                <div
                  key={achievement.id}
                  className={`${styles.achievementBadge} ${!isUnlocked ? styles.lockedBadge : ''}`}
                >
                  {isUnlocked && (
                    <div className={styles.achievementLevelBadge}>
                      Lv {achievement.currentLevel}
                    </div>
                  )}
                  <div className={styles.achievementImageWrapper}>
                    <img 
                      src={achievement.image} 
                      alt={achievement.name}
                      className={styles.achievementImage}
                    />
                  </div>
                  <p className={styles.achievementName}>{achievement.name}</p>
                  
                  {!isMaxLevel && (
                    <div className={styles.achievementProgressContainer}>
                      <div className={styles.achievementProgressBar}>
                        <div 
                          className={styles.achievementProgressFill}
                          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                        />
                      </div>
                      <p className={styles.achievementProgressText}>
                        {achievement.currentProgress} / {achievement.nextLevelTarget}
                      </p>
                    </div>
                  )}
                  
                  {isMaxLevel && (
                    <p className={styles.achievementMaxLevel}>MAX LEVEL</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className={styles.leaderboardSection}>
        <div className={styles.leaderboardCard}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>
              <FaTrophy style={{ color: "#fbbf24", marginRight: "0.5rem" }} />
              Top Learners
            </h2>
            <button className={styles.sectionLink}>View Full Board</button>
          </div>
          <div className={styles.leaderboardList}>
            {leaderboard.map((user) => (
              <div
                key={user.rank}
                className={`${styles.leaderboardItem} ${
                  user.isYou ? styles.leaderboardItemYou : ""
                }`}
              >
                <div className={styles.leaderboardRank}>
                  {user.rank === 1 && (
                    <FaMedal style={{ color: "#fbbf24", fontSize: "1.5rem" }} />
                  )}
                  {user.rank === 2 && (
                    <FaMedal style={{ color: "#94a3b8", fontSize: "1.5rem" }} />
                  )}
                  {user.rank === 3 && (
                    <FaMedal style={{ color: "#cd7f32", fontSize: "1.5rem" }} />
                  )}
                  {user.rank > 3 && `#${user.rank}`}
                </div>
                <span className={styles.leaderboardAvatar}>
                  <FaUser style={{ color: user.avatarColor }} />
                </span>
                <span className={styles.leaderboardName}>{user.name}</span>
                <span className={styles.leaderboardXP}>
                  {user.xp.toLocaleString()} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Active goals + Upcoming sessions */}
      <section className={styles.mainGrid}>
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>Active Goals</h2>
            <button className={styles.sectionLink}>View All</button>
          </div>

          <div className={styles.goalCard}>
            <p className={styles.goalName}>Master React Fundamentals</p>
            <p className={styles.goalMeta}>750 / 1000 XP</p>
            <div className={styles.progressBarOuter}>
              <div
                className={styles.progressBarInner}
                style={{ width: "75%" }}
              />
            </div>
          </div>

          <div className={styles.goalCard}>
            <p className={styles.goalName}>Data Structures &amp; Algorithms</p>
            <p className={styles.goalMeta}>450 / 1000 XP</p>
            <div className={styles.progressBarOuter}>
              <div
                className={styles.progressBarInner}
                style={{ width: "45%" }}
              />
            </div>
          </div>

          <div className={styles.goalCard}>
            <p className={styles.goalName}>Machine Learning Basics</p>
            <p className={styles.goalMeta}>600 / 1000 XP</p>
            <div className={styles.progressBarOuter}>
              <div
                className={styles.progressBarInner}
                style={{ width: "60%" }}
              />
            </div>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>Upcoming Sessions</h2>
            <button className={styles.sectionLink}>View All</button>
          </div>

          <div className={styles.sessionCard}>
            <p className={styles.sessionTitle}>React Hooks Deep Dive</p>
            <p className={styles.sessionMeta}>Host: Sarah Chen</p>
            <p className={styles.sessionTime}>Today, 3:00 PM</p>
            <button className={styles.primaryButton}>Join Session</button>
          </div>

          <div className={styles.sessionCard}>
            <p className={styles.sessionTitle}>Binary Trees Workshop</p>
            <p className={styles.sessionMeta}>Host: Mike Johnson</p>
            <p className={styles.sessionTime}>Tomorrow, 10:00 AM</p>
            <button className={styles.primaryButton}>Join Session</button>
          </div>
        </div>
      </section>

      {/* Incomplete tasks */}
      <section className={styles.tasksSection}>
        <h2 className={styles.sectionTitle}>Incomplete Tasks</h2>
        <div className={styles.tasksRow}>
          <div className={styles.taskCard}>
            <p className={styles.taskTitle}>React State Management Quiz</p>
            <p className={styles.taskMeta}>Earn +50 XP</p>
            <button className={styles.taskButton}>Start</button>
          </div>
          <div className={styles.taskCard}>
            <p className={styles.taskTitle}>Binary Search Flashcards</p>
            <p className={styles.taskMeta}>Earn +30 XP</p>
            <button className={styles.taskButton}>Start</button>
          </div>
          <div className={styles.taskCard}>
            <p className={styles.taskTitle}>Review ML Algorithms</p>
            <p className={styles.taskMeta}>Earn +40 XP</p>
            <button className={styles.taskButton}>Start</button>
          </div>
        </div>
      </section>
    </div>
  );
}

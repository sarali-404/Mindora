import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaFire, 
  FaClock, 
  FaCheckCircle, 
  FaChartBar, 
  FaTrophy, 
  FaBullseye, 
  FaBolt, 
  FaChartLine,
  FaUser,
  FaMedal
} from "react-icons/fa";
import styles from "./DashboardPage.module.css";
import authService from "../services/authService";
import goalService from "../services/goalService";
import sessionService from "../services/sessionService";
import api from "../services/api";

// Import achievement images
import goalArchitectImg from "../assets/achievements/goal_architect.png";
import goalCrusherImg from "../assets/achievements/goal_crusher.png";
import quizMasterImg from "../assets/achievements/quiz_master.png";
import readingBirdImg from "../assets/achievements/reading_bird.png";
import streakMasterImg from "../assets/achievements/streak_master.png";
import firstStepsImg from "../assets/achievements/first_steps.png";
import memoryMasterImg from "../assets/achievements/memory_master.png";
import morningChampionImg from "../assets/achievements/morning_champion.png";
import teachingBirdImg from "../assets/achievements/teaching_bird.png";
import welcomeAboardImg from "../assets/achievements/welcome_aborad.png";

const achievementImageMap = {
  welcome_aboard: welcomeAboardImg,
  first_steps: firstStepsImg,
  goal_architect: goalArchitectImg,
  goal_crusher: goalCrusherImg,
  memory_master: memoryMasterImg,
  morning_champion: morningChampionImg,
  quiz_master: quizMasterImg,
  reading_bird: readingBirdImg,
  streak_master: streakMasterImg,
  teaching_bird: teachingBirdImg,
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const firstName = currentUser?.profile?.firstName || currentUser?.username || "Learner";

  // State
  const [loading, setLoading] = useState(true);
  const [levelInfo, setLevelInfo] = useState({ totalXP: 0, currentLevel: 'Bronze', xpToNextLevel: 5000, nextLevel: 'Silver' });
  const [streakData, setStreakData] = useState({ current: 0, longest: 0 });
  const [userStats, setUserStats] = useState({ goalsAchieved: 0, hoursStudied: 0, materialsUploaded: 0, activeGoals: 0 });
  const [rank, setRank] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);
  const [activeGoals, setActiveGoals] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [recentAchievements, setRecentAchievements] = useState([]);

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

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [levelRes, statsRes, activityRes, rankRes, leaderboardRes, goalsRes, sessionsRes, profileRes] = await Promise.allSettled([
          api.get('/gamification/level-info'),
          api.get('/users/stats'),
          api.get('/gamification/activity-stats'),
          api.get('/gamification/rank'),
          api.get('/gamification/leaderboard?limit=10'),
          goalService.getMyGoals({ status: 'active', limit: 5 }),
          sessionService.getUpcomingSessions(3),
          api.get('/gamification/profile'),
        ]);

        if (levelRes.status === 'fulfilled') setLevelInfo(levelRes.value);
        if (statsRes.status === 'fulfilled' && statsRes.value.success) setUserStats(statsRes.value.data);
        if (activityRes.status === 'fulfilled') setStreakData(activityRes.value.streaks || { current: 0, longest: 0 });
        if (rankRes.status === 'fulfilled') setRank(rankRes.value.rank?.rank ?? rankRes.value.rank);
        if (leaderboardRes.status === 'fulfilled') {
          const lb = leaderboardRes.value.leaderboard || [];
          setLeaderboard(lb.map((entry, idx) => ({
            rank: idx + 1,
            name: entry.user?.profile?.firstName
              ? `${entry.user.profile.firstName} ${entry.user.profile.lastName || ''}`.trim()
              : entry.user?.username || 'User',
            xp: entry.totalXP || 0,
            isYou: entry.user?._id === currentUser?._id,
            avatarColor: ['#ec4899', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'][idx % 5],
          })));
        }
        if (goalsRes.status === 'fulfilled') setActiveGoals((goalsRes.value.data || []).slice(0, 3));
        if (sessionsRes.status === 'fulfilled') setUpcomingSessions((sessionsRes.value.data || []).slice(0, 3));
        if (profileRes.status === 'fulfilled' && profileRes.value?.achievementsEarned) {
          const mapped = profileRes.value.achievementsEarned
            .slice(-4)
            .map((earned) => {
              const ach = earned.achievement;
              if (!ach) return null;
              return {
                id: ach._id,
                name: ach.name,
                description: ach.description,
                image: achievementImageMap[ach.key] || welcomeAboardImg,
                tier: earned.tier,
              };
            }).filter(Boolean);
          setRecentAchievements(mapped);
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // XP progress calculation
  const xpThresholds = { bronze: 0, silver: 5000, gold: 15000 };
  const currentLevelKey = (levelInfo.currentLevel || 'Bronze').toLowerCase();
  const nextLevelKey = levelInfo.nextLevel ? levelInfo.nextLevel.toLowerCase() : null;
  const currentLevelMin = xpThresholds[currentLevelKey] ?? 0;
  const nextLevelMin = nextLevelKey ? (xpThresholds[nextLevelKey] ?? (currentLevelMin + 5000)) : null;
  const xpInLevel = levelInfo.totalXP - currentLevelMin;
  const xpLevelRange = nextLevelMin !== null ? nextLevelMin - currentLevelMin : 1;
  const xpPercentage = xpLevelRange > 0 ? Math.min((xpInLevel / xpLevelRange) * 100, 100) : 100;
  const xpNeeded = nextLevelMin !== null ? Math.max(0, nextLevelMin - levelInfo.totalXP) : 0;

  return (
    <div className={styles.page}>
      {/* Hero Section with Stats */}
      <section className={styles.heroSection}>
        <div className={styles.heroCard}>
          <div className={styles.heroLeft}>
            <h1 className={styles.heroTitle}>
              Welcome back, {firstName}!
            </h1>
            <p className={styles.heroSubtitle}>{currentQuote}</p>
            <div className={styles.quickStats}>
              <div className={styles.quickStat}>
                <span className={styles.statIcon}>
                  <FaFire style={{ color: "#f59e0b" }} />
                </span>
                <div>
                  <p className={styles.statValue}>{streakData.current} days</p>
                  <p className={styles.statLabel}>Current Streak</p>
                </div>
              </div>
              <div className={styles.quickStat}>
                <span className={styles.statIcon}>
                  <FaClock style={{ color: "#3b82f6" }} />
                </span>
                <div>
                  <p className={styles.statValue}>{Math.round(userStats.hoursStudied)}h</p>
                  <p className={styles.statLabel}>Total Study</p>
                </div>
              </div>
              <div className={styles.quickStat}>
                <span className={styles.statIcon}>
                  <FaCheckCircle style={{ color: "#10b981" }} />
                </span>
                <div>
                  <p className={styles.statValue}>{userStats.goalsAchieved}</p>
                  <p className={styles.statLabel}>Goals Done</p>
                </div>
              </div>
              <div className={styles.quickStat}>
                <span className={styles.statIcon}>
                  <FaTrophy style={{ color: "#fbbf24" }} />
                </span>
                <div>
                  <p className={styles.statValue}>{rank ? `#${rank}` : '—'}</p>
                  <p className={styles.statLabel}>Global Rank</p>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.heroRight}>
            <div className={styles.levelCircle}>
                <svg className={styles.progressRing} width="160" height="160" viewBox="0 0 160 160">
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
                <p className={styles.levelNumber}>{levelInfo.currentLevel}</p>
                <p className={styles.levelLabel}>Level</p>
                <p className={styles.xpProgress}>
                  {levelInfo.totalXP?.toLocaleString()} XP
                </p>
                {xpNeeded > 0 && (
                  <p className={styles.xpNeeded}>
                    {xpNeeded.toLocaleString()} to {levelInfo.nextLevel
                      ? levelInfo.nextLevel.charAt(0).toUpperCase() + levelInfo.nextLevel.slice(1)
                      : 'Max'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Achievements + Leaderboard row */}
      <section
        className={styles.chartSection}
        style={{
          gridTemplateColumns: recentAchievements.length === 0
            ? '0fr 1fr'
            : recentAchievements.length <= 2
            ? '1fr 2fr'
            : '2fr 1fr'
        }}
      >
        <div className={styles.achievementsCard} style={recentAchievements.length === 0 ? { display: 'none' } : {}}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>Recent Achievements</h2>
            <button className={styles.sectionLink} onClick={() => navigate('/app/profile')}>View All</button>
          </div>
          <div className={styles.achievementsGrid}>
            {recentAchievements.length === 0 ? (
              <p className={styles.emptyText}>Complete activities to earn achievements!</p>
            ) : (
              recentAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={styles.achievementBadge}
                >
                  {achievement.tier && achievement.tier !== 'one-time' && (
                    <div className={styles.achievementLevelBadge}>
                      {achievement.tier.charAt(0).toUpperCase() + achievement.tier.slice(1)}
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
                </div>
              ))
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className={styles.chartCard}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>
              <FaTrophy style={{ color: "#fbbf24", marginRight: "0.5rem" }} />
              Top Learners
            </h2>
          </div>
          <div className={styles.leaderboardList}>
            {leaderboard.length === 0 ? (
              <p className={styles.emptyText}>No leaderboard data yet.</p>
            ) : (
              leaderboard.slice(0, showAllLeaderboard ? 10 : 5).map((user) => (
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
                  <span className={styles.leaderboardName}>
                    {user.isYou ? 'You' : user.name}
                  </span>
                  <span className={styles.leaderboardXP}>
                    {user.xp.toLocaleString()} XP
                  </span>
                </div>
              ))
            )}
          </div>
          {leaderboard.length > 5 && (
            <button
              className={styles.sectionLink}
              style={{ marginTop: '0.75rem', display: 'block' }}
              onClick={() => setShowAllLeaderboard(v => !v)}
            >
              {showAllLeaderboard ? 'Show Less' : 'View More'}
            </button>
          )}
        </div>
      </section>

      {/* Active goals + Upcoming sessions */}
      <section className={styles.mainGrid}>
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>Active Goals</h2>
            <button className={styles.sectionLink} onClick={() => navigate('/app/goals')}>View All</button>
          </div>
          {activeGoals.length === 0 ? (
            <p className={styles.emptyText}>No active goals. Create one to get started!</p>
          ) : (
            activeGoals.map((goal) => {
              const progress = goal.progress || 0;
              return (
                <div key={goal._id} className={styles.goalCard} onClick={() => navigate(`/app/goals/${goal._id}`)} style={{cursor:'pointer'}}>
                  <p className={styles.goalName}>{goal.title}</p>
                  <p className={styles.goalMeta}>{goal.subject || 'No subject'}</p>
                  <div className={styles.progressBarOuter}>
                    <div
                      className={styles.progressBarInner}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>Upcoming Sessions</h2>
            <button className={styles.sectionLink} onClick={() => navigate('/app/sessions')}>View All</button>
          </div>
          {upcomingSessions.length === 0 ? (
            <p className={styles.emptyText}>No upcoming sessions.</p>
          ) : (
            upcomingSessions.map((session) => (
              <div key={session._id} className={styles.sessionCard}>
                <p className={styles.sessionTitle}>{session.title}</p>
                <p className={styles.sessionMeta}>Host: {session.host?.username || 'Unknown'}</p>
                <p className={styles.sessionTime}>
                  {session.scheduledAt
                    ? new Date(session.scheduledAt).toLocaleString(undefined, {
                        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                      })
                    : 'Time not set'}
                </p>
                <button className={styles.primaryButton} onClick={() => navigate(`/app/sessions`)}>
                  View
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

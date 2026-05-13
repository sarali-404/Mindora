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
  const [rankHidden, setRankHidden] = useState(false);
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
        if (rankRes.status === 'fulfilled') {
          const rankData = rankRes.value.rank;
          setRankHidden(rankData?.hidden === true);
          setRank(rankData?.rank ?? rankData);
        }
        if (leaderboardRes.status === 'fulfilled') {
          const lb = leaderboardRes.value.leaderboard || [];
          setLeaderboard(lb.map((entry, idx) => ({
            rank: idx + 1,
            name: entry.user?.profile?.firstName
              ? `${entry.user.profile.firstName} ${entry.user.profile.lastName || ''}`.trim()
              : entry.user?.username || 'User',
            xp: entry.totalXP || 0,
            isYou: (entry.user?._id && currentUser?.id && entry.user?._id === currentUser?.id) || 
                   (entry.user?._id && currentUser?._id && entry.user?._id === currentUser?._id),
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
                  <p className={styles.statValue}>{rankHidden ? 'Hidden' : rank ? `#${rank}` : '—'}</p>
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

      {/* Modern Dashboard Grid */}
      <div className={styles.dashboardGrid}>
        {/* Row 1: Leaderboard Wide */}
        <div className={styles.gridItemFull}>
          <div className={styles.leaderboardCardHorizontal}>
            <div className={styles.sectionHeaderRow}>
              <h2 className={styles.sectionTitle}>
                <FaTrophy style={{ color: "#fbbf24", marginRight: "0.5rem" }} />
                Top Learners
              </h2>
              {leaderboard.length > 4 && (
                <button className={styles.sectionLink} onClick={() => navigate('/app/community')}>Global Leaderboard</button>
              )}
            </div>
            <div className={styles.leaderboardHorizontalScroll}>
              {leaderboard.length === 0 ? (
                <p className={styles.emptyText}>No leaderboard data yet.</p>
              ) : (
                leaderboard.slice(0, 25).map((user) => (
                  <div
                    key={user.rank}
                    className={`${styles.leaderboardItemHorizontal} ${
                      user.isYou ? styles.leaderboardItemYouHorizontal : ""
                    }`}
                  >
                    <div className={styles.rankBadge}>
                      {user.rank === 1 && <FaMedal style={{ color: "#fbbf24" }} />}
                      {user.rank === 2 && <FaMedal style={{ color: "#94a3b8" }} />}
                      {user.rank === 3 && <FaMedal style={{ color: "#cd7f32" }} />}
                      {user.rank > 3 && <span>#{user.rank}</span>}
                    </div>
                    <span className={styles.leaderboardAvatarLarge}>
                      <FaUser style={{ color: user.avatarColor }} />
                    </span>
                    <div className={styles.leaderboardUserInfo}>
                      <span className={styles.leaderboardNameMini}>
                        {user.name}
                      </span>
                      <span className={styles.leaderboardXPMini}>
                        {user.xp.toLocaleString()} XP
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Sessions + Badges */}
        <div className={styles.gridItemHalf}>
          <div className={`${styles.sectionCard} ${styles.sideCard}`}>
            <div className={styles.sectionHeaderRow}>
              <h3 className={styles.sectionTitleSmall}>Sessions</h3>
              <button className={styles.sectionLinkMini} onClick={() => navigate('/app/sessions')}>All</button>
            </div>
            <div className={styles.sessionsVerticalList}>
              {upcomingSessions.length === 0 ? (
                <p className={styles.emptyTextMini}>No sessions.</p>
              ) : (
                upcomingSessions.slice(0, 3).map((session) => {
                  const hostName = session.host?.profile?.firstName
                    ? `${session.host.profile.firstName} ${session.host.profile.lastName || ''}`.trim()
                    : session.host?.username || 'Unknown';

                  return (
                    <div key={session._id} className={styles.sessionItemMini}>
                      <div className={styles.sessionMainInfoMini}>
                        <p className={styles.sessionTitleTitle}>{session.title}</p>
                        <p className={styles.sessionHostMini}>
                          Host: {hostName}
                        </p>
                      </div>
                      <p className={styles.sessionTimeTime}>
                        {session.scheduledAt ? new Date(session.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Soon'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className={styles.gridItemHalf}>
          <div className={`${styles.sectionCard} ${styles.sideCard}`}>
            <div className={styles.sectionHeaderRow}>
              <h3 className={styles.sectionTitleSmall}>Badges</h3>
              <button className={styles.sectionLinkMini} onClick={() => navigate('/app/profile')}>View More</button>
            </div>
            <div className={styles.achievementRowMini}>
              {recentAchievements.slice(0, 4).map((ach) => (
                <div key={ach.id} className={styles.badgeLargeWrapper} title={ach.name}>
                  <img src={ach.image} alt={ach.name} className={styles.badgeLarge} />
                </div>
              ))}
              {recentAchievements.length === 0 && <span className={styles.emptyTextMini}>No badges yet.</span>}
            </div>
          </div>
        </div>

        {/* Row 3: Goals Full Width */}
        <div className={styles.gridItemFull}>
          <div className={`${styles.sectionCard} ${styles.sideCard}`}>
            <div className={styles.sectionHeaderRow}>
              <h3 className={styles.sectionTitleSmall}>Active Goals</h3>
              <button className={styles.sectionLinkMini} onClick={() => navigate('/app/goals')}>Details</button>
            </div>
            <div className={styles.goalsVerticalList}>
              {activeGoals.length === 0 ? (
                <div className={styles.emptyGoalsState}>
                  <FaBullseye className={styles.emptyIcon} />
                  <p>Set a goal to track your growth!</p>
                </div>
              ) : (
                activeGoals.slice(0, 3).map((goal) => {
                  const progress = goal.progress || 0;
                  const dueDateLabel = goal.deadline
                    ? `Due ${new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : 'No deadline';

                  return (
                    <div key={goal._id} className={styles.goalModernCard} onClick={() => navigate(`/app/goals/${goal._id}`)}>
                      <div className={styles.goalCardDecoration} style={{ backgroundColor: progress >= 100 ? '#10b981' : '#3b82f6' }} />
                      <div className={styles.goalMainContent}>
                        <div className={styles.goalHeaderMini}>
                          <span className={styles.goalSubjectTag}>{goal.subject || 'General'}</span>
                          <span className={styles.goalProgressPercent}>{progress}%</span>
                        </div>
                        <p className={styles.goalTitleModern}>{goal.title}</p>
                        <p className={styles.goalDueDate}>{dueDateLabel}</p>
                        <div className={styles.modernProgressContainer}>
                          <div className={styles.modernProgressTrack}>
                            <div 
                              className={styles.modernProgressFill} 
                              style={{ 
                                width: `${progress}%`,
                                background: progress >= 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                              }} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}

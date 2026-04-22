import Lottie from "lottie-react";
import { MdMenu } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import styles from "./TopNavbar.module.css";
import fireAnim from "../../assets/animations/Fire.json";
import starAnim from "../../assets/animations/star.json";
import authService from "../../services/authService";
import UserAvatar from "../shared/UserAvatar";

export default function TopNavbar({ onMenuClick }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(authService.getUser());
  const [xpData, setXpData] = useState({ totalXP: 0, currentLevel: 'Bronze' });
  const [streakDays, setStreakDays] = useState(0);
  const [loading, setLoading] = useState(true);

  // Re-read user whenever it's updated (e.g. after profile picture upload)
  useEffect(() => {
    const handler = (e) => setCurrentUser(e.detail || authService.getUser());
    window.addEventListener('mindora:userUpdated', handler);
    return () => window.removeEventListener('mindora:userUpdated', handler);
  }, []);
  
  // Fetch gamification data
  useEffect(() => {
    const fetchGamificationData = async () => {
      try {
        // Fetch level info and activity stats
        const levelRes = await fetch(`${import.meta.env.VITE_API_URL}/gamification/level-info`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        
        if (levelRes.ok) {
          const levelData = await levelRes.json();
          setXpData({
            totalXP: levelData.totalXP || 0,
            currentLevel: levelData.currentLevel || 'Bronze'
          });
        }

        // Fetch activity stats for streak
        const statsRes = await fetch(`${import.meta.env.VITE_API_URL}/gamification/activity-stats`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const currentStreak = statsData.streaks?.current || 0;
          setStreakDays(currentStreak);
        }
      } catch (error) {
        console.error('Failed to fetch gamification data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchGamificationData();
    }
  }, [currentUser]);
  
  // Dynamic user data
  const userName = currentUser?.profile?.firstName && currentUser?.profile?.lastName 
    ? `${currentUser.profile.firstName} ${currentUser.profile.lastName}`
    : currentUser?.username || "User";
  const userSubtitle = currentUser?.profile?.university && currentUser?.profile?.degreeProgram
    ? `${currentUser.profile.university} | ${currentUser.profile.degreeProgram}`
    : currentUser?.profile?.university || "";
  
  // Get profile picture URL
  const getProfilePictureUrl = () => {
    if (!currentUser?.profile?.avatar) return null;
    const avatar = currentUser.profile.avatar;
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
    return `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${avatar}`;
  };

  return (
    <header className={styles.navbar}>
      <button className={styles.hamburger} onClick={onMenuClick} aria-label="Toggle menu">
        <MdMenu size={24} />
      </button>
      
      <div className={styles.userBlock}>
        <div>
          <h1 className={styles.userName}>{userName}</h1>
          <p className={styles.userSubtitle}>{userSubtitle}</p>
        </div>
      </div>

      <div className={styles.statsBlock}>
        {/* Study Streak */}
        <div className={styles.inlineStat}>
          <div className={styles.inlineAnimWrap}>
            <Lottie
              animationData={fireAnim}
              loop
              autoplay
              className={styles.inlineAnim}
            />
          </div>
          <div>
            <div className={styles.inlineStatValue}>
              {loading ? '...' : `${streakDays} day${streakDays !== 1 ? 's' : ''} streak`}
            </div>
          </div>
        </div>

        {/* Total XP */}
        <div className={styles.inlineStat}>
          <div className={styles.inlineAnimStarWrap}>
            <Lottie
              animationData={starAnim}
              loop
              autoplay
              className={styles.inlineAnimStar}
            />
          </div>
          <div>
            <div className={styles.inlineStatValue}>
              {loading ? '...' : `${xpData.totalXP.toLocaleString()} XP`}
            </div>
          </div>
        </div>

        {/* Avatar - clickable to go to profile */}
        <button 
          className={styles.avatarButton}
          onClick={() => navigate('/app/profile')}
          aria-label="Go to profile"
        >
          <UserAvatar user={currentUser} size={32} />
        </button>
      </div>
    </header>
  );
}

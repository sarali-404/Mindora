import Lottie from "lottie-react";
import { MdMenu, MdNotifications, MdVerified } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import styles from "./TopNavbar.module.css";
import fireAnim from "../../assets/animations/Fire.json";
import starAnim from "../../assets/animations/star.json";
import authService from "../../services/authService";
import UserAvatar from "../shared/UserAvatar";
import chatService from "../../services/chatService";

export default function TopNavbar({ onMenuClick }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(authService.getUser());
  const [xpData, setXpData] = useState({ totalXP: 0, currentLevel: 'Bronze' });
  const [streakDays, setStreakDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [unreadMsgSenders, setUnreadMsgSenders] = useState([]); // [{name, count}]

  const totalBadge = unreadCount + unreadMsgCount;

  const fetchUnreadMsgCount = useCallback(async () => {
    try {
      const convs = await chatService.getUnreadConversations();
      const total = convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setUnreadMsgCount(total);
      setUnreadMsgSenders(
        convs.slice(0, 3).map(c => ({
          name: c.otherUser?.profile?.firstName
            ? `${c.otherUser.profile.firstName} ${c.otherUser.profile.lastName || ''}`.trim()
            : c.otherUser?.username || 'Someone',
          count: c.unreadCount
        }))
      );
    } catch (_) {}
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/notifications/count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const newCount = data.count ?? data.unreadCount ?? 0;
        // If count increased, fetch the latest notification and fire toast
        setUnreadCount(prev => {
          if (newCount > prev && prev !== 0) {
            fetch(`${import.meta.env.VITE_API_URL}/notifications?limit=1&unread=true`, {
              headers: { Authorization: `Bearer ${token}` }
            })
              .then(r => r.json())
              .then(d => {
                const latest = d.data?.[0] || d.notifications?.[0];
                if (latest) {
                  window.dispatchEvent(new CustomEvent('mindora:newNotification', { detail: latest }));
                }
              })
              .catch(() => {});
          }
          return newCount;
        });
      }
    } catch (_) {}
  }, []);

  // Reset badge when notifications page visited
  useEffect(() => {
    const handler = () => setUnreadCount(0);
    window.addEventListener('mindora:notificationsRead', handler);
    return () => window.removeEventListener('mindora:notificationsRead', handler);
  }, []);

  // Reset msg badge when community page visited
  useEffect(() => {
    const handler = () => { setUnreadMsgCount(0); setUnreadMsgSenders([]); };
    window.addEventListener('mindora:messagesRead', handler);
    return () => window.removeEventListener('mindora:messagesRead', handler);
  }, []);

  // Increment msg badge on incoming socket message (real-time)
  useEffect(() => {
    const handleIncoming = (e) => {
      const msg = e.detail;
      if (!msg) return;
      const me = authService.getUser();
      if (msg.sender?._id === me?._id) return;
      setUnreadMsgCount(prev => prev + 1);
      const senderName = msg.sender?.profile?.firstName
        ? `${msg.sender.profile.firstName} ${msg.sender.profile.lastName || ''}`.trim()
        : msg.sender?.username || 'Someone';
      setUnreadMsgSenders(prev => {
        const existing = prev.find(s => s.name === senderName);
        if (existing) return prev.map(s => s.name === senderName ? { ...s, count: s.count + 1 } : s);
        return [{ name: senderName, count: 1 }, ...prev].slice(0, 3);
      });
    };
    window.addEventListener('mindora:incomingMessage', handleIncoming);
    return () => window.removeEventListener('mindora:incomingMessage', handleIncoming);
  }, []);

  // Poll every 60s + on window focus
  useEffect(() => {
    if (!currentUser) return;
    fetchUnreadCount();
    fetchUnreadMsgCount();
    const interval = setInterval(() => { fetchUnreadCount(); fetchUnreadMsgCount(); }, 60000);
    window.addEventListener('focus', () => { fetchUnreadCount(); fetchUnreadMsgCount(); });
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', () => { fetchUnreadCount(); fetchUnreadMsgCount(); });
    };
  }, [currentUser, fetchUnreadCount, fetchUnreadMsgCount]);

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
        // Check both storages (respects rememberMe setting)
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch level info and activity stats
        const levelRes = await fetch(`${import.meta.env.VITE_API_URL}/gamification/level-info`, { headers });
        
        if (levelRes.ok) {
          const levelData = await levelRes.json();
          setXpData({
            totalXP: levelData.totalXP || 0,
            currentLevel: levelData.currentLevel || 'Bronze'
          });
        }

        // Fetch activity stats for streak
        const statsRes = await fetch(`${import.meta.env.VITE_API_URL}/gamification/activity-stats`, { headers });

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
          <h1 className={styles.userName}>
            {userName}
            {currentUser?.profile?.idPhoto?.verified === true && (
              <MdVerified className={styles.verifiedBadge} title="ID Verified" />
            )}
          </h1>
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

        {/* Notifications bell */}
        <button
          className={styles.bellButton}
          onClick={() => navigate('/app/notifications')}
          aria-label="Notifications"
        >
          <MdNotifications size={22} />
          {totalBadge > 0 && (
            <span className={styles.bellBadge}>
              {totalBadge > 99 ? '99+' : totalBadge}
            </span>
          )}
        </button>

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

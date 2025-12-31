import Lottie from "lottie-react";
import { MdMenu, MdPerson } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import styles from "./TopNavbar.module.css";
import fireAnim from "../../assets/animations/Fire.json";
import starAnim from "../../assets/animations/star.json";
import authService from "../../services/authService";

export default function TopNavbar({ onMenuClick }) {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  
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
    // Check if it's a full URL (Google picture) or a relative path
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      return avatar;
    }
    // Otherwise it's a relative path to our server
    return `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${avatar}`;
  };
  
  const profilePicture = getProfilePictureUrl();

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
            <div className={styles.inlineStatValue}>7 days streak</div>
         
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
            <div className={styles.inlineStatValue}>2,450 XP</div>
          </div>
        </div>

        {/* Avatar - clickable to go to profile */}
        <button 
          className={styles.avatarButton}
          onClick={() => navigate('/app/profile')}
          aria-label="Go to profile"
        >
          {profilePicture ? (
            <img
              src={profilePicture}
              alt="Profile"
              className={styles.avatar}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={styles.avatarFallback}
            style={{ display: profilePicture ? 'none' : 'flex' }}
          >
            <MdPerson size={20} />
          </div>
        </button>
      </div>
    </header>
  );
}

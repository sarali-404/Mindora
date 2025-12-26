import Lottie from "lottie-react";
import { MdMenu } from "react-icons/md";
import styles from "./TopNavbar.module.css";
import fireAnim from "../../assets/animations/Fire.json";
import starAnim from "../../assets/animations/star.json";

export default function TopNavbar({ onMenuClick }) {
  // Later replace with real user data
  const userName = "Sarali Balasinghe";
  const userSubtitle = "NSBM | Software Engineering";

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

        {/* Avatar */}
        <img
          src="/default-user.jpeg"
          alt="default user image"
          className={styles.avatar}
        />
      </div>
    </header>
  );
}

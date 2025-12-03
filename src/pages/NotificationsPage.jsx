import {
  FiFlag,
  FiUserPlus,
  FiClock,
  FiMessageCircle,
  FiTrendingUp,
  FiUsers,
  FiVideo,
  FiCheck,
  FiTrash2,
} from "react-icons/fi";
import styles from "./NotificationsPage.module.css";

const NOTIFICATIONS = [
  {
    id: 1,
    type: "milestone",
    title: "Goal Milestone Reached!",
    message: "You’ve completed 75% of “Master React Fundamentals”.",
    time: "5 minutes ago",
    unread: true,
    icon: <FiFlag />,
  },
  {
    id: 2,
    type: "friend",
    title: "New Friend Request",
    message: "Lisa Wang wants to connect with you.",
    time: "1 hour ago",
    unread: true,
    icon: <FiUserPlus />,
  },
  {
    id: 3,
    type: "session",
    title: "Session Reminder",
    message: "React Hooks Deep Dive starts in 2 hours.",
    time: "2 hours ago",
    unread: true,
    icon: <FiClock />,
  },
  {
    id: 4,
    type: "comment",
    title: "New Comment on Your Material",
    message: "Sarah Chen commented on “React Hooks Comprehensive Notes”.",
    time: "3 hours ago",
    unread: false,
    icon: <FiMessageCircle />,
  },
  {
    id: 5,
    type: "streak",
    title: "Daily Streak Updated",
    message: "You’ve maintained a 7‑day study streak!",
    time: "1 day ago",
    unread: false,
    icon: <FiTrendingUp />,
  },
  {
    id: 6,
    type: "friend-activity",
    title: "Friend Activity",
    message: "Mike Johnson achieved a new goal.",
    time: "1 day ago",
    unread: false,
    icon: <FiUsers />,
  },
  {
    id: 7,
    type: "recording",
    title: "Session Recording Available",
    message: "CSS Grid & Flexbox Mastery recording is now available.",
    time: "2 days ago",
    unread: false,
    icon: <FiVideo />,
  },
];

export default function NotificationsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        
        <button className={styles.markReadButton}>
          <FiCheck />
          <span>Mark All as Read</span>
        </button>
      </header>

      <section className={styles.list}>
        {NOTIFICATIONS.map((item) => (
          <NotificationCard key={item.id} item={item} />
        ))}
      </section>
    </div>
  );
}

function NotificationCard({ item }) {
  return (
    <article
      className={`${styles.card} ${item.unread ? styles.cardUnread : ""}`}
    >
      <div className={styles.cardLeft}>
        <span
          className={`${styles.iconCircle} ${styles[`icon_${item.type}`]}`}
        >
          {item.icon}
        </span>
        <div>
          <p className={styles.cardTitle}>{item.title}</p>
          <p className={styles.cardMessage}>{item.message}</p>
          <p className={styles.cardTime}>{item.time}</p>
        </div>
      </div>

      <div className={styles.cardRight}>
        {item.unread && <span className={styles.unreadDot} />}
        <button className={styles.deleteButton} aria-label="Delete notification">
          <FiTrash2 />
        </button>
      </div>
    </article>
  );
}

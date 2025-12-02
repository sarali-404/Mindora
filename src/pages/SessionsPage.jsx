import { Link } from "react-router-dom";
import styles from "./SessionsPage.module.css";

export default function SessionsPage() {
  return (
    <div className={styles.page}>
      {/* Header with search */}
      <header className={styles.header}>
        <div className={styles.searchContainer}>
          <input
            className={styles.searchInput}
            placeholder="Search by host name or session topic..."
          />
        </div>
        <Link to="/app/create-session" className={styles.createButton}>
          Create New Session
        </Link>
      </header>

      <section className={styles.filterRow}>
        <span className={styles.filterLabel}>Recommended for You</span>
        <div className={styles.filterChips}>
          <button className={`${styles.filterChip} ${styles.filterChipActive}`}>
            Today
          </button>
          <button className={styles.filterChip}>Tomorrow</button>
          <button className={styles.filterChip}>This Week</button>
        </div>
      </section>

      {/* Sessions grid */}
      <section className={styles.sessionsGrid}>
        <SessionCard
          title="React Hooks Deep Dive"
          host="Sarah Chen"
          uni="MIT"
          description="Master useState, useEffect, and build custom hooks with real projects."
          date="2025-11-01"
          time="3:00 PM – 5:00 PM"
          seats="24 / 50"
          status="Ongoing"
          statusType="green"
        />
        <SessionCard
          title="Binary Trees Workshop"
          host="Mike Johnson"
          uni="Harvard"
          description="Learn tree traversal, balanced trees, and common interview patterns."
          date="2025-11-01"
          time="5:00 PM – 6:30 PM"
          seats="18 / 30"
          status="Upcoming"
          statusType="blue"
        />
        <SessionCard
          title="Machine Learning Fundamentals"
          host="Emily Rodriguez"
          uni="Stanford"
          description="Introduction to supervised and unsupervised learning with examples."
          date="2025-11-01"
          time="7:00 PM – 9:30 PM"
          seats="32 / 40"
          status="Upcoming"
          statusType="blue"
        />
        <SessionCard
          title="Python for Data Science"
          host="James Kim"
          uni="Berkeley"
          description="Pandas, NumPy, and Matplotlib for data analysis and visualization."
          date="2025-11-02"
          time="10:00 AM – 1:00 PM"
          seats="28 / 50"
          status="Upcoming"
          statusType="blue"
        />
        <SessionCard
          title="Graph Algorithms Study Group"
          host="Anna Lee"
          uni="CMU"
          description="DFS, BFS, Dijkstra and friends. Problem solving, not just theory."
          date="2025-11-02"
          time="2:00 PM – 4:00 PM"
          seats="15 / 25"
          status="Upcoming"
          statusType="blue"
        />
        <SessionCard
          title="Advanced TypeScript Workshop"
          host="David Park"
          uni="MIT"
          description="Generics, utility types, and patterns for large React apps."
          date="2025-11-02"
          time="4:00 PM – 6:00 PM"
          seats="20 / 35"
          status="Upcoming"
          statusType="blue"
        />
      </section>
    </div>
  );
}

function SessionCard({
  title,
  host,
  uni,
  description,
  date,
  time,
  seats,
  status,
  statusType,
}) {
  return (
    <article className={styles.sessionCard}>
      <div className={styles.sessionHeaderRow}>
        <h2 className={styles.sessionTitle}>{title}</h2>
        <span
          className={`${styles.statusBadge} ${
            statusType === "green" ? styles.statusGreen : styles.statusBlue
          }`}
        >
          {status}
        </span>
      </div>

      <div className={styles.hostRow}>
        <div className={styles.hostAvatar}>{host[0]}</div>
        <div>
          <p className={styles.hostName}>{host}</p>
          <p className={styles.hostMeta}>{uni}</p>
        </div>
      </div>

      <p className={styles.description}>{description}</p>

      <div className={styles.metaList}>
        <div className={styles.metaRow}>
          <span className={styles.metaIcon}>📅</span>
          <span className={styles.metaText}>{date}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaIcon}>⏰</span>
          <span className={styles.metaText}>{time}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaIcon}>👥</span>
          <span className={styles.metaText}>{seats}</span>
        </div>
      </div>

      <button className={styles.joinButton}>Join Session</button>
    </article>
  );
}

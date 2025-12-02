import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  return (
    <div className={styles.page}>
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

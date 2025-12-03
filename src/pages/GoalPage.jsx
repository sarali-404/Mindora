import { useState } from "react";
import styles from "./GoalPage.module.css";
import TopicsBreakdown from "../features/goals/TopicsBreakdown";// later: import TopicsBreakdown from "../components/goals/TopicsBreakdown";
import FullNotes from "../features/goals/FullNotes";// later: import FullNotes from "../components/goals/FullNotes";
import Summaries from "../features/goals/Summaries";// later: import Summaries from "../components/goals/Summaries";
import Quizzes from "../features/goals/Quizzes";// later: import Quizzes from "../components/goals/Quizzes";
import EssayQuestions from "../features/goals/EssayQuestions";  

export default function GoalPage() {
  const [activeTab, setActiveTab] = useState("topics");

  return (
    <div className={styles.page}>
      {/* Header card */}
      <section className={styles.headerCard}>
        <div className={styles.topRow}>
          <div>
            <span className={styles.subjectPill}>Data Structures</span>
            <h1 className={styles.title}>
              Master Data Structures for Final Exam
            </h1>
            <div className={styles.metaRow}>
              <span className={styles.metaItem}>30 days</span>
              <span className={styles.metaDot}>•</span>
              <span className={styles.metaItem}>Due: Dec 15, 2025</span>
            </div>
          </div>
          <button className={styles.newGoalButton}>+ New Goal</button>
        </div>

        <div className={styles.progressBlock}>
          <div className={styles.progressRow}>
            <span className={styles.progressLabel}>Overall Progress</span>
            <span className={styles.progressPercent}>65%</span>
          </div>
          <div className={styles.progressBarOuter}>
            <div
              className={styles.progressBarInner}
              style={{ width: "65%" }}
            />
          </div>
          <div className={styles.progressFooter}>
            <span className={styles.progressMeta}>650 / 1000 XP</span>
            <span className={styles.progressMeta}>3 / 4 topics completed</span>
          </div>
        </div>
      </section>

      {/* Tab navigation */}
      <nav className={styles.tabsBar}>
        <Tab
          id="topics"
          label="Topics Breakdown"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <Tab
          id="notes"
          label="Notes"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <Tab
          id="summaries"
          label="Summaries"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <Tab
          id="quizzes"
          label="Quizzes"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <Tab
          id="essays"
          label="Essays"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </nav>

      {/* Content under tabs */}
      <section className={styles.contentArea}>
        {activeTab === "topics" && (
          <TopicsBreakdown />
        )}
        {activeTab === "notes" && <FullNotes />}
        {activeTab === "summaries" && <Summaries />}
        {activeTab === "quizzes" && <Quizzes />}
        {activeTab === "essays" && <EssayQuestions/>}
        
      </section>
    </div>
  );
}

function Tab({ id, label, activeTab, setActiveTab }) {
  const isActive = activeTab === id;
  return (
    <button
      type="button"
      className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
      onClick={() => setActiveTab(id)}
    >
      {label}
    </button>
  );
}

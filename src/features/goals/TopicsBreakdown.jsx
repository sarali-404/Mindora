import styles from "./TopicsBreakdown.module.css";
import { MdEmojiEvents, MdWarningAmber } from "react-icons/md";

const SECTIONS = [
  {
    id: "arrays",
    title: "Arrays & Strings",
    progress: 85,
    topics: [
      { id: "array-basics", title: "Array Basics", progress: 100, active: true },
      { id: "two-pointer", title: "Two Pointer Technique", progress: 90 },
      { id: "sliding-window", title: "Sliding Window", progress: 65 },
    ],
  },
  { id: "linked-lists", title: "Linked Lists", progress: 70 },
  { id: "stacks-queues", title: "Stacks & Queues", progress: 45 },
  { id: "trees-graphs", title: "Trees & Graphs", progress: 30 },
];

const WEAK_AREAS = [
  {
    id: "circular-ll",
    title: "Circular Linked List",
    level: "High",
    description: "Practice more problems on detecting cycles and circular references.",
  },
  {
    id: "priority-queues",
    title: "Priority Queues",
    level: "High",
    description: "Review heap data structure implementation.",
  },
  {
    id: "sliding-window",
    title: "Sliding Window",
    level: "Medium",
    description: "Complete 5 more sliding window problems.",
  },
];

export default function TopicsBreakdown() {
  return (
    <div className={styles.layout}>
      {/* Left: topics */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.iconCircle}><MdEmojiEvents size={20} style={{ color: '#10b981' }} /></div>
          <h2 className={styles.cardTitle}>Topics Breakdown</h2>
        </div>

        <div className={styles.sections}>
          {SECTIONS.map((section) => (
            <SectionRow key={section.id} section={section} />
          ))}
        </div>
      </section>

      {/* Right: weak areas */}
      <aside className={styles.weakCard}>
        <div className={styles.weakHeader}>
          <div className={styles.warningIcon}><MdWarningAmber size={18} style={{ color: '#f59e0b' }} /></div>
          <h3 className={styles.weakTitle}>Weak Areas</h3>
        </div>

        <div className={styles.weakList}>
          {WEAK_AREAS.map((item) => (
            <WeakArea key={item.id} item={item} />
          ))}
        </div>
      </aside>
    </div>
  );
}

function SectionRow({ section }) {
  return (
    <div className={styles.sectionRow}>
      <div className={styles.sectionHeader}>
        <button type="button" className={styles.chevronButton}>
          &gt;
        </button>
        <span className={styles.sectionTitle}>{section.title}</span>
        <span className={styles.sectionPercent}>{section.progress}%</span>
      </div>

      <ProgressBar value={section.progress} />

      {section.topics && (
        <div className={styles.subtopics}>
          {section.topics.map((topic) => (
            <SubtopicRow key={topic.id} topic={topic} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubtopicRow({ topic }) {
  return (
    <div className={styles.subtopicRow}>
      <div className={styles.subtopicLeft}>
        <span
          className={`${styles.radio} ${
            topic.active ? styles.radioActive : ""
          }`}
        />
        <span className={styles.subtopicTitle}>{topic.title}</span>
      </div>
      <div className={styles.subtopicRight}>
        <ProgressBar value={topic.progress} small />
        <span className={styles.subtopicPercent}>{topic.progress}%</span>
      </div>
    </div>
  );
}

function ProgressBar({ value, small = false }) {
  return (
    <div
      className={`${styles.progressOuter} ${
        small ? styles.progressOuterSmall : ""
      }`}
    >
      <div
        className={styles.progressInner}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function WeakArea({ item }) {
  return (
    <div className={styles.weakItem}>
      <div className={styles.weakTopRow}>
        <h4 className={styles.weakItemTitle}>{item.title}</h4>
        <span
          className={`${styles.badge} ${
            item.level === "High" ? styles.badgeHigh : styles.badgeMedium
          }`}
        >
          {item.level}
        </span>
      </div>
      <ProgressBar value={item.level === "High" ? 75 : 50} small />
      <p className={styles.weakDescription}>{item.description}</p>
    </div>
  );
}

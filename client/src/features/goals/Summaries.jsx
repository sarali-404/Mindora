import styles from "./Summaries.module.css";
import { MdDescription, MdEmojiEvents } from "react-icons/md";

const SUMMARIES = [
  {
    id: 1,
    title: "Week 1 Summary - Arrays",
    description:
      "Key takeaways from array study: time complexity, common patterns, and pitfalls.",
    date: "Oct 28, 2025",
  },
  {
    id: 2,
    title: "Week 2 Summary - Linked Lists",
    description:
      "Important concepts: pointer manipulation, sentinel nodes, dummy heads, and more.",
    date: "Oct 21, 2025",
  },
];

export default function Summaries() {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconCircle}><MdDescription size={20} style={{ color: '#3b82f6' }} /></div>
          <h2 className={styles.title}>Summaries</h2>
        </div>
        <button className={styles.createButton}>+ Create Summary</button>
      </header>

      <div className={styles.list}>
        {SUMMARIES.map((item) => (
          <article key={item.id} className={styles.summaryRow}>
            <div className={styles.iconBadge}><MdEmojiEvents size={18} style={{ color: '#f59e0b' }} /></div>
            <div className={styles.summaryContent}>
              <div className={styles.summaryTop}>
                <h3 className={styles.summaryTitle}>{item.title}</h3>
                <span className={styles.summaryDate}>{item.date}</span>
              </div>
              <p className={styles.summaryText}>{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

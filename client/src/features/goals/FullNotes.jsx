import styles from "./FullNotes.module.css";

const NOTES = [
  {
    id: 1,
    title: "Arrays - Complete Guide",
    description:
      "Comprehensive notes on array data structures, including common patterns.",
    date: "Nov 2, 2025",
    pages: "4 pages",
  },
  {
    id: 2,
    title: "Linked List Operations",
    description:
      "Detailed explanation of linked list operations: insertion, deletion, traversal.",
    date: "Nov 1, 2025",
    pages: "6 pages",
  },
  {
    id: 3,
    title: "Stack Applications",
    description:
      "Real-world applications of stacks: expression evaluation, backtracking, more.",
    date: "Oct 31, 2025",
    pages: "3 pages",
  },
];

export default function FullNotes() {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconCircle}>📘</div>
          <h2 className={styles.title}>Full Notes</h2>
        </div>
        <button className={styles.addButton}>+ Add Note</button>
      </header>

      <div className={styles.notesRow}>
        {NOTES.map((note) => (
          <article key={note.id} className={styles.noteCard}>
            <div className={styles.noteIcon}>📖</div>
            <h3 className={styles.noteTitle}>{note.title}</h3>
            <p className={styles.noteDescription}>{note.description}</p>
            <div className={styles.noteFooter}>
              <span className={styles.noteMeta}>{note.date}</span>
              <span className={styles.noteMeta}>{note.pages}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import { Link } from "react-router-dom";
import styles from "./LibraryPage.module.css";
import { MdDescription, MdVisibility, MdFavorite, MdBookmark } from "react-icons/md";

export default function LibraryPage() {
  return (
    <div className={styles.page}>
      {/* Header with search */}
      <header className={styles.header}>
        <div className={styles.searchContainer}>
          <input
            className={styles.searchInput}
            placeholder="Search materials by title, subject, or keywords..."
          />
        </div>
        <Link to="/app/upload-material" className={styles.uploadButton}>
          Upload Material
        </Link>
      </header>

      {/* Sort row */}
      <section className={styles.sortRow}>
        <span className={styles.sortLabel}>Recommended for You</span>
        <div className={styles.sortOptions}>
          <button className={styles.sortChip}>Sort by Views</button>
          <button className={`${styles.sortChip} ${styles.sortChipActive}`}>
            Newer First
          </button>
        </div>
      </section>

      {/* Cards grid */}
      <section className={styles.grid}>
        <ResourceCard
          title="Machine Learning Algorithms Summary"
          tag="AI & ML"
          description="Overview of supervised and unsupervised learning algorithms."
          author="Mike Johnson"
          uni="Berkeley"
          date="Oct 15, 2025"
          type="PDF"
          views="412"
          likes="126"
          saves="34"
        />
        <ResourceCard
          title="Python Data Science Toolkit"
          tag="Data Science"
          description="Essential Python libraries for data science: NumPy, Pandas, Matplotlib."
          author="James Kim"
          uni="CalTech"
          date="Oct 10, 2025"
          type="PDF"
          views="334"
          likes="92"
          saves="28"
        />
        <ResourceCard
          title="Binary Search Trees Cheat Sheet"
          tag="Data Structures"
          description="Visual guide to BST operations and traversal patterns."
          author="Sarah Chen"
          uni="Stanford"
          date="Oct 18, 2025"
          type="Document"
          views="289"
          likes="79"
          saves="23"
        />
        <ResourceCard
          title="Graph Theory Fundamentals"
          tag="Algorithms"
          description="Core graph theory concepts: vertices, edges, paths, and common uses."
          author="Anna Lee"
          uni="Yale"
          date="Oct 8, 2025"
          type="Document"
          views="245"
          likes="67"
          saves="19"
        />
        <ResourceCard
          title="CSS Grid Layout Guide"
          tag="Web Development"
          description="Modern CSS Grid techniques for responsive layouts."
          author="Emily Rodriguez"
          uni="Harvard"
          date="Oct 12, 2025"
          type="Document"
          views="198"
          likes="56"
          saves="15"
        />
        <ResourceCard
          title="React Hooks Comprehensive Notes"
          tag="Web Development"
          description="Complete notes on React Hooks for building interactive UIs."
          author="You"
          uni="MIT"
          date="Oct 20, 2025"
          type="PDF"
          views="156"
          likes="46"
          saves="12"
        />
      </section>
    </div>
  );
}

function ResourceCard({
  title,
  tag,
  description,
  author,
  uni,
  date,
  type,
  views,
  likes,
  saves,
}) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHeaderRow}>
        <div className={styles.iconCircle}>
          <MdDescription size={20} style={{ color: '#0073a0' }} />
        </div>
        <div className={styles.cardTitleBlock}>
          <h2 className={styles.cardTitle}>{title}</h2>
          <span className={styles.tagChip}>{tag}</span>
        </div>
      </div>

      <p className={styles.cardDescription}>{description}</p>

      <div className={styles.cardMetaRow}>
        <span className={styles.cardMetaText}>
          {author} · {uni}
        </span>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.footerLeft}>
          <span className={styles.footerMeta}>{date}</span>
          <span className={styles.typeBadge}>{type}</span>
        </div>
        <div className={styles.footerStats}>
          <span className={styles.statItem}>
            <MdVisibility size={16} style={{ color: '#b18fffff' }} /> {views}
          </span>
          <span className={styles.statItem}>
            <MdFavorite size={16} style={{ color: '#ff6f6fff' }} /> {likes}
          </span>
          <span className={styles.statItem}>
            <MdBookmark size={16} style={{ color: '#ffc869ff' }} /> {saves}
          </span>
        </div>
      </div>
    </article>
  );
}

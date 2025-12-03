import styles from "./ProfilePage.module.css";
import {
  MdPeople,
  MdAutoAwesome,
  MdVisibility,
  MdDelete,
  MdEdit,
} from "react-icons/md";

export default function ProfilePage() {
  // later these can come from API/user context
  const user = {
    name: "Alex Thompson",
    
    university: "Massachusetts Institute of Technology",
    major: "Computer Science",
    memberSince: "January 2024",
    initials: "AT",
  };

  return (
    <div className={styles.page}>
      {/* Top profile header */}
      <section className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.avatarCircle}>{user.initials}</div>
          <div className={styles.headerInfo}>
            <h1 className={styles.name}>{user.name}</h1>
            {/* email removed as requested */}
            <div className={styles.tagsRow}>
              <span className={styles.tag}>{user.university}</span>
              <span className={styles.tag}>{user.major}</span>
            </div>
            <p className={styles.memberSince}>
              Member since {user.memberSince}
            </p>
          </div>
        </div>
        <button className={styles.editButton}><MdEdit size={18} style={{marginRight:8}}/>Edit Profile</button>
      </section>

      {/* Stats row */}
      <section className={styles.statsRow}>
        <StatCard label="Goals Achieved" value="12" />
        <StatCard label="Hours Studied" value="156" />
        <StatCard label="Materials Uploaded" value="24" />
        <StatCard label="Active Goals" value="3" />
      </section>

      {/* Friends strip */}
      <section className={styles.friendsCard}>
        <div className={styles.friendsHeader}>
          <div className={styles.friendsTitleRow}>
            <span className={styles.friendsIcon}><MdPeople size={18} style={{color: '#8b5cf6'}}/></span>
            <h2 className={styles.sectionTitle}>Friends</h2>
          </div>
          <button className={styles.linkButton}>View All</button>
        </div>
        <div className={styles.friendsRow}>
          {["Sarah", "Mike", "Emily", "James", "Anna"].map((name) => (
            <div key={name} className={styles.friendPill}>
              <div className={styles.friendAvatar}>{name[0]}</div>
              <span className={styles.friendName}>{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Materials sections */}
      <section className={styles.materialsGrid}>
        <div className={styles.materialsCard}>
          <div className={styles.materialsHeader}>
            <div className={styles.materialsTitleRow}>
              <span className={styles.materialsIcon}><MdAutoAwesome size={18} style={{color: '#f59e0b'}}/></span>
              <h2 className={styles.sectionTitle}>Private AI-Generated Materials</h2>
              <span className={styles.countBadge}>3</span>
            </div>
          </div>
          <div className={styles.materialList}>
            <MaterialRow
              title="React Hooks Personal Notes"
              type="PDF"
              date="Oct 20, 2025"
              aiTag
              canDelete
            />
            <MaterialRow
              title="Algorithm Practice Problems"
              type="Document"
              date="Oct 18, 2025"
              aiTag
              canDelete
            />
            <MaterialRow
              title="ML Flashcards Set"
              type="Flashcards"
              date="Oct 15, 2025"
              aiTag
              canDelete
            />
          </div>
        </div>

        <div className={styles.materialsCard}>
          <div className={styles.materialsHeader}>
            <div className={styles.materialsTitleRow}>
              <span className={styles.materialsIcon}><MdVisibility size={18} style={{color: '#8b5cf6'}}/></span>
              <h2 className={styles.sectionTitle}>Public Materials</h2>
              <span className={styles.countBadge}>2</span>
            </div>
          </div>
          <div className={styles.materialList}>
            <MaterialRow
              title="React Hooks Comprehensive Guide"
              type="PDF"
              date="Oct 12, 2025"
              meta="45 views"
              actionLabel="Make Private"
            />
            <MaterialRow
              title="Binary Search Trees Tutorial"
              type="Document"
              date="Oct 18, 2025"
              meta="32 views"
              actionLabel="Make Private"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
    </div>
  );
}

function MaterialRow({ title, type, date, meta, aiTag, actionLabel, canDelete }) {
  return (
    <div className={styles.materialRow}>
      <div>
        <p className={styles.materialTitle}>{title}</p>
        <div className={styles.materialMetaRow}>
          <span className={styles.materialMeta}>
            {type} · {date}
          </span>
          {aiTag && <span className={styles.aiTag}>AI Generated</span>}
          {meta && <span className={styles.metaPill}>{meta}</span>}
        </div>
      </div>

      <div className={styles.materialActions}>
        {actionLabel && (
          <button className={styles.linkButton}>{actionLabel}</button>
        )}
        {canDelete && (
          <button className={styles.iconButton} aria-label="Delete material">
            <MdDelete size={18} style={{ color: '#ef4444' }} />
          </button>
        )}
      </div>
    </div>
  );
}

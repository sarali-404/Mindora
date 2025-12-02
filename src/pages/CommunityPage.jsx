import styles from "./CommunityPage.module.css";
import { FaMedal } from "react-icons/fa";

export default function CommunityPage() {
  return (
    <div className={styles.page}>
      {/* Header (search moved into header) */}
      <header className={styles.header}>
        <div className={styles.searchContainer}>
          <input
            className={styles.searchInput}
            placeholder="Search users by name or university..."
          />
        </div>
        <button className={styles.primaryGhostButton}>View Leaderboard</button>
      </header>

      {/* Friends */}
      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>My Friends</h2>
        </div>
        <div className={styles.friendRow}>
          <FriendCard status="One day ago" statusColor="purple" />
          <FriendCard status="Online" statusColor="green" />
          <FriendCard status="Two weeks ago" statusColor="purple" />
          <FriendCard status="Online" statusColor="green" />
           <FriendCard status="Online" statusColor="green" />
          <FriendCard status="Two weeks ago" statusColor="purple" />
          <FriendCard status="Online" statusColor="green" />
        </div>
      </section>

      {/* People you may know */}
      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>People You May Know</h2>
        </div>
        <div className={styles.friendRow}>
          <SuggestionCard />
          <SuggestionCard />
          <SuggestionCard />
          <SuggestionCard />
          <SuggestionCard />
          <SuggestionCard />
          <SuggestionCard />
        </div>
      </section>

      {/* Leaderboard */}
      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>Leaderboard - Top Learners</h2>
        </div>
        <div className={styles.leaderboardCard}>
          <LeaderboardRow
            rank={1}
            name="Anna Lee"
            major="Computer Science"
            uni="NSBM"
            badge="Top Contributor"
            relation="Friend"
            xp="5,420"
            highlight
          />
          <LeaderboardRow
            rank={2}
            name="Chris Martin"
            major="Data Science"
            uni="Stanford"
            badge="Goal Master"
            relation="Add"
            xp="4,890"
            shaded
          />
          <LeaderboardRow
            rank={3}
            name="Maya Patel"
            major="AI & ML"
            uni="Berkeley"
            badge="Study Champion"
            relation="Friend"
            xp="4,320"
          />
          <LeaderboardRow
            rank={4}
            name="James Wilson"
            major="Computer Science"
            uni="MIT"
            relation="Add"
            xp="4,100"
            shaded
          />
          <LeaderboardRow
            rank={5}
            name="Sofia Garcia"
            major="Data Science"
            uni="Harvard"
            badge="Streak Master"
            relation="Friend"
            xp="3,950"
          />
        </div>
      </section>
    </div>
  );
}

function FriendCard({ status, statusColor }) {
  return (
    <article className={styles.friendCard}>
      <div className={styles.friendTop}>
        <div className={styles.avatarCircle}>A</div>
        <div>
          <p className={styles.friendName}>Alex Turner</p>
          <p className={styles.friendMeta}>Computer Science · MIT</p>
          <div className={styles.friendStatusRow}>
            <span
              className={`${styles.statusDot} ${
                statusColor === "green" ? styles.statusGreen : styles.statusPurple
              }`}
            />
            <span className={styles.friendStatusText}>{status}</span>
          </div>
        </div>
      </div>
      <button className={styles.discordButton}>Message on Discord</button>
    </article>
  );
}

function SuggestionCard() {
  return (
    <article className={styles.suggestionCard}>
      <div className={styles.friendTop}>
        <div className={styles.avatarCircle}>A</div>
        <div>
          <p className={styles.friendName}>Alex Turner</p>
          <p className={styles.friendMeta}>Computer Science · MIT</p>
          <p className={styles.mutualText}>3 mutual friends</p>
        </div>
      </div>
      <button className={styles.addFriendButton}>Add Friend</button>
    </article>
  );
}

function LeaderboardRow({
  rank,
  name,
  major,
  uni,
  badge,
  relation,
  xp,
  highlight,
  shaded,
}) {
  return (
    <div
      className={`${styles.leaderRow} ${highlight ? styles.leaderRowHighlight : ""} ${
        shaded ? styles.leaderRowShaded : ""
      }`}
    >
      <div className={styles.leaderLeft}>
        {rank <= 3 ? (
          <FaMedal
            className={`${styles.medal} ${
              rank === 1 ? styles.gold : rank === 2 ? styles.silver : styles.bronze
            }`}
          />
        ) : (
          <span className={styles.rank}>{rank}</span>
        )}
        <div className={styles.leaderAvatar}>{name[0]}</div>
        <div>
          <p className={styles.leaderName}>{name}</p>
          <p className={styles.leaderMeta}>
            {major} · {uni}
          </p>
        </div>
      </div>

      <div className={styles.leaderRight}>
        {badge && <span className={styles.badgeChip}>{badge}</span>}
        <span
          className={`${styles.relationChip} ${
            relation === "Friend" ? styles.relationFriend : styles.relationAdd
          }`}
        >
          {relation}
        </span>
        <div className={styles.xpBlock}>
          <span className={styles.xpLabel}>Total XP</span>
          <span className={styles.xpValue}>{xp}</span>
        </div>
      </div>
    </div>
  );
}

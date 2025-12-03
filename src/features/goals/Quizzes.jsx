import styles from "./Quizzes.module.css";

const QUIZZES = [
  {
    id: 1,
    title: "Arrays Fundamentals Quiz",
    level: "Easy",
    questions: 10,
    duration: "15 min",
    bestScore: "85%",
    attempts: "2 attempts",
    cta: "Retake Quiz",
  },
  {
    id: 2,
    title: "Linked Lists Advanced",
    level: "Medium",
    questions: 15,
    duration: "20 min",
    bestScore: "70%",
    attempts: "1 attempt",
    cta: "Retake Quiz",
  },
  {
    id: 3,
    title: "Stack & Queue Problems",
    level: "Hard",
    questions: 12,
    duration: "18 min",
    bestScore: null,
    attempts: "0 attempts",
    cta: "Start Quiz",
  },
];

export default function Quizzes() {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconCircle}>🧠</div>
          <h2 className={styles.title}>Practice Quizzes</h2>
        </div>
      </header>

      <div className={styles.grid}>
        {QUIZZES.map((quiz) => (
          <QuizCard key={quiz.id} quiz={quiz} />
        ))}
      </div>
    </section>
  );
}

function QuizCard({ quiz }) {
  return (
    <article className={styles.quizCard}>
      <h3 className={styles.quizTitle}>{quiz.title}</h3>

      <div className={styles.metaRow}>
        <span
          className={`${styles.levelBadge} ${
            quiz.level === "Easy"
              ? styles.levelEasy
              : quiz.level === "Medium"
              ? styles.levelMedium
              : styles.levelHard
          }`}
        >
          {quiz.level}
        </span>
        <span className={styles.metaText}>{quiz.questions} questions</span>
        <span className={styles.metaDot}>•</span>
        <span className={styles.metaText}>{quiz.duration}</span>
      </div>

      <div className={styles.scoreBox}>
        <span className={styles.scoreLabel}>Best Score</span>
        {quiz.bestScore ? (
          <span className={styles.scoreValue}>🏆 {quiz.bestScore}</span>
        ) : (
          <span className={styles.scorePlaceholder}>No attempts yet</span>
        )}
      </div>

      <p className={styles.attemptsText}>{quiz.attempts}</p>

      <button
        className={`${styles.primaryButton} ${
          quiz.cta === "Start Quiz" ? styles.startButton : ""
        }`}
      >
        {quiz.cta}
      </button>
    </article>
  );
}


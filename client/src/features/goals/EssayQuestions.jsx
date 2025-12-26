import styles from "./EssayQuestions.module.css";

export default function EssayQuestions() {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconCircle}>✏️</div>
          <h2 className={styles.title}>Essay Questions</h2>
        </div>
      </header>

      {/* Question 1 – submitted */}
      <article className={styles.questionBlock}>
        <div className={styles.questionTopRow}>
          <span className={styles.questionLabel}>Question 1</span>
          <span className={`${styles.statusBadge} ${styles.statusSubmitted}`}>
            Submitted
          </span>
          <div className={styles.scoreBox}>
            <span className={styles.scoreValue}>18/20</span>
            <span className={styles.scoreLabel}>Score</span>
          </div>
        </div>

        <p className={styles.questionText}>
          Explain the difference between arrays and linked lists. When would you use each?
        </p>

        <div className={styles.feedbackBox}>
          <span className={styles.feedbackLabel}>Feedback:</span>
          <span className={styles.feedbackText}>
            Good explanation of time complexities. Could elaborate more on space considerations.
          </span>
        </div>
      </article>

      {/* Question 2 – pending answer */}
      <article className={styles.questionBlock}>
        <div className={styles.questionTopRow}>
          <span className={styles.questionLabel}>Question 2</span>
          <span className={`${styles.statusBadge} ${styles.statusPending}`}>
            Pending
          </span>
        </div>

        <p className={styles.questionText}>
          Describe how a stack can be used to check for balanced parentheses in an expression.
        </p>

        <textarea
          className={styles.answerArea}
          placeholder="Write your answer here..."
        />

        <div className={styles.bottomRow}>
          <span className={styles.maxScore}>Max Score: 15 points</span>
          <button className={styles.submitButton}>Submit Answer</button>
        </div>
      </article>
    </section>
  );
}

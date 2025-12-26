import { useNavigate } from "react-router-dom";
import styles from "./CreateSessionPage.module.css";

export default function CreateSessionPage() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // later: send data to backend
  };

  return (
    <div className={styles.page}>
      <div className={styles.formShell}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate(-1)}
        >
          ←
        </button>

        <header className={styles.header}>
          <h1 className={styles.title}>Create a New Session</h1>
          <p className={styles.subtitle}>
            Fill in the details to host your own study session.
          </p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="title">
              Session Title
            </label>
            <input
              id="title"
              name="title"
              className={styles.input}
              placeholder="e.g., React Hooks Deep Dive"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Describe what you'll cover in this session..."
            />
          </div>

          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="date">
                Date
              </label>
              <input
                id="date"
                name="date"
                type="date"
                className={styles.input}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="time">
                Time
              </label>
              <input
                id="time"
                name="time"
                type="time"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="maxParticipants">
              Maximum Participants
            </label>
            <input
              id="maxParticipants"
              name="maxParticipants"
              className={styles.input}
              placeholder="e.g., 50"
            />
            <p className={styles.helperText}>
              Enter the maximum number of people who can join this session.
            </p>
          </div>

          <div className={styles.actionsRow}>
            <button type="submit" className={styles.primaryButton}>
              Create Session
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

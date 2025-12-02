import { Link } from "react-router-dom";
import styles from "./NotFound.module.css";

export default function NotFound() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>404 — Page not found</h1>
      <p className={styles.desc}>The page you tried doesn't exist yet.</p>
      <div className={styles.actions}>
        <Link to="/app/dashboard" className={styles.link}>
          Go to Dashboard
        </Link>
        <Link to="/" className={styles.linkAlt}>
          Back to Landing
        </Link>
      </div>
    </div>
  );
}

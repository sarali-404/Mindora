import styles from "./GoalInfoPanel.module.css";
import { FiCpu, FiBook, FiClipboard, FiBarChart } from "react-icons/fi";

export default function GoalInfoPanel() {
  return (
    <div className={styles.infoPanel}>
      <div className={styles.infoPanelContent}>
        <h3 className={styles.infoPanelTitle}>About Goals</h3>
        <p className={styles.infoPanelText}>
          Create a focused study goal — upload materials and we’ll prepare everything
          you need to practice and improve.
        </p>

        <div className={styles.featureList}>
          <div className={styles.featureItem}>
            <FiCpu className={styles.featureIcon} />
            <div>
              <h4 className={styles.featureTitle}>Smart Notes</h4>
              <p className={styles.featureDesc}>
                We turn your files into clear notes and simple topic breakdowns.
              </p>
            </div>
          </div>

          <div className={styles.featureItem}>
            <FiClipboard className={styles.featureIcon} />
            <div>
              <h4 className={styles.featureTitle}>Adaptive Practice</h4>
              <p className={styles.featureDesc}>
                Practice with quizzes that adapt to your level so you learn efficiently.
              </p>
            </div>
          </div>

          <div className={styles.featureItem}>
            <FiBarChart className={styles.featureIcon} />
            <div>
              <h4 className={styles.featureTitle}>Progress at a Glance</h4>
              <p className={styles.featureDesc}>
                See what you’ve improved and which topics need more attention.
              </p>
            </div>
          </div>

          <div className={styles.featureItem}>
            <FiBook className={styles.featureIcon} />
            <div>
              <h4 className={styles.featureTitle}>Personalized Tips</h4>
              <p className={styles.featureDesc}>
                Receive simple, practical suggestions to help you reach your target.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

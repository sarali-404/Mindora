import { useEffect } from "react";
import styles from "./GoalInfoModal.module.css";
import { FiCpu, FiBook, FiClipboard, FiBarChart, FiX } from "react-icons/fi";

export default function GoalInfoModal({ isOpen, onClose }) {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <FiX />
        </button>

        <div className={styles.modalContent}>
          <h2 className={styles.modalTitle}>Welcome to Goals! 🎯</h2>
          <p className={styles.modalIntro}>
            Create a focused study goal — upload your materials and we'll prepare everything
            you need to practice and improve.
          </p>

          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <div className={styles.iconWrapper}>
                <FiCpu className={styles.featureIcon} />
              </div>
              <div>
                <h4 className={styles.featureTitle}>Smart Notes</h4>
                <p className={styles.featureDesc}>
                  We turn your files into clear notes and simple topic breakdowns.
                </p>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.iconWrapper}>
                <FiClipboard className={styles.featureIcon} />
              </div>
              <div>
                <h4 className={styles.featureTitle}>Adaptive Practice</h4>
                <p className={styles.featureDesc}>
                  Practice with quizzes that adapt to your level so you learn efficiently.
                </p>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.iconWrapper}>
                <FiBarChart className={styles.featureIcon} />
              </div>
              <div>
                <h4 className={styles.featureTitle}>Progress at a Glance</h4>
                <p className={styles.featureDesc}>
                  See what you've improved and which topics need more attention.
                </p>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.iconWrapper}>
                <FiBook className={styles.featureIcon} />
              </div>
              <div>
                <h4 className={styles.featureTitle}>Personalized Tips</h4>
                <p className={styles.featureDesc}>
                  Receive simple, practical suggestions to help you reach your target.
                </p>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.btnStart} onClick={onClose}>
              Let's Get Started →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

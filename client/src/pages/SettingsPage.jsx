import { useState } from "react";
import {
  FiBell,
  FiMonitor,
  FiShield,
  FiCpu,
  FiToggleLeft,
  FiToggleRight,
} from "react-icons/fi";
import styles from "./SettingsPage.module.css";

export default function SettingsPage() {
  const [emailNoti, setEmailNoti] = useState(true);
  const [pushNoti, setPushNoti] = useState(false);
  const [reminders, setReminders] = useState(true);
  const [goalUpdates, setGoalUpdates] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={styles.page}>
      

      {/* Notifications */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}>
            <FiBell />
          </span>
          <h2 className={styles.cardTitle}>Notifications</h2>
        </div>

        <ToggleRow
          label="Email Notifications"
          description="Receive updates and alerts via email."
          enabled={emailNoti}
          onToggle={() => setEmailNoti((v) => !v)}
        />
        <ToggleRow
          label="Push Notifications"
          description="Get real-time notifications in your browser."
          enabled={pushNoti}
          onToggle={() => setPushNoti((v) => !v)}
        />
        <ToggleRow
          label="Study Reminders"
          description="Daily reminders to stay on track with your goals."
          enabled={reminders}
          onToggle={() => setReminders((v) => !v)}
        />
        <ToggleRow
          label="Goal Progress Updates"
          description="Notifications when you make progress on goals."
          enabled={goalUpdates}
          onToggle={() => setGoalUpdates((v) => !v)}
          last
        />
      </section>

      {/* Appearance */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}>
            <FiMonitor />
          </span>
          <h2 className={styles.cardTitle}>Appearance</h2>
        </div>

        <ToggleRow
          label="Dark Mode"
          description="Switch to dark theme for better night-time viewing."
          enabled={darkMode}
          onToggle={() => setDarkMode((v) => !v)}
          last
        />
      </section>

      {/* Privacy & Security */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}>
            <FiShield />
          </span>
          <h2 className={styles.cardTitle}>Privacy &amp; Security</h2>
        </div>

        <LinkRow
          label="Data Privacy"
          description="Control how your data is collected and used."
        />
        <LinkRow
          label="Account Security"
          description="Manage two-factor authentication and security settings."
        />
        <LinkRow
          label="Connected Apps"
          description="View and manage third-party integrations."
          last
        />
      </section>

      {/* Performance */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}>
            <FiCpu />
          </span>
          <h2 className={styles.cardTitle}>Performance</h2>
        </div>

        <div className={styles.storageBlock}>
          <p className={styles.storageLabel}>Storage Usage</p>
          <p className={styles.storageMeta}>248 MB of 2 GB used · 12%</p>
          <div className={styles.storageBarOuter}>
            <div className={styles.storageBarInner} style={{ width: "12%" }} />
          </div>
        </div>

        <div className={styles.clearRow}>
          <div>
            <p className={styles.clearLabel}>Clear Cache</p>
            <p className={styles.clearDescription}>
              Free up space by clearing temporary files.
            </p>
          </div>
          <button className={styles.clearButton}>Clear</button>
        </div>
      </section>
    </div>
  );
}

function ToggleRow({ label, description, enabled, onToggle, last }) {
  return (
    <div className={`${styles.row} ${last ? styles.rowLast : ""}`}>
      <div>
        <p className={styles.rowLabel}>{label}</p>
        <p className={styles.rowDescription}>{description}</p>
      </div>
      <button
        type="button"
        className={styles.toggleButton}
        onClick={onToggle}
        aria-pressed={enabled}
      >
        {enabled ? (
          <FiToggleRight className={`${styles.toggleIcon} ${styles.toggleOn}`} />
        ) : (
          <FiToggleLeft className={styles.toggleIcon} />
        )}
      </button>
    </div>
  );
}

function LinkRow({ label, description, last }) {
  return (
    <button
      type="button"
      className={`${styles.linkRow} ${last ? styles.rowLast : ""}`}
    >
      <div>
        <p className={styles.rowLabel}>{label}</p>
        <p className={styles.rowDescription}>{description}</p>
      </div>
    </button>
  );
}

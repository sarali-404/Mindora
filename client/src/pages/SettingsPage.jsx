import { useState, useEffect } from "react";
import {
  FiBell,
  FiMonitor,
  FiShield,
  FiCpu,
  FiToggleLeft,
  FiToggleRight,
} from "react-icons/fi";
import styles from "./SettingsPage.module.css";
import notificationService from "../services/notificationService";
import { useTheme } from "../context/ThemeContext";

export default function SettingsPage() {
  const [emailNoti, setEmailNoti] = useState(true);
  const [pushNoti, setPushNoti] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [goalUpdates, setGoalUpdates] = useState(true);
  const { isDark, setIsDark } = useTheme();
  const darkMode = isDark;
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await notificationService.getPreferences();
        if (prefs) {
          const noti = prefs.notifications || {};
          setEmailNoti(noti.email?.achievements !== false);
          setPushNoti(noti.inApp?.achievements !== false);
          setReminders(noti.inApp?.recommendations !== false);
          setGoalUpdates(noti.inApp?.goalProgress !== false);
          // Dark mode is managed by ThemeContext (persisted in localStorage)
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };
    loadPreferences();
  }, []);

  const savePreferences = async (updates) => {
    try {
      setSaving(true);
      await notificationService.updatePreferences(updates);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleEmail = () => {
    const newVal = !emailNoti;
    setEmailNoti(newVal);
    savePreferences({
      notifications: { email: { achievements: newVal, goalProgress: newVal, social: newVal, recommendations: newVal, sessions: newVal } }
    });
  };

  const togglePush = () => {
    const newVal = !pushNoti;
    setPushNoti(newVal);
    savePreferences({
      notifications: { inApp: { achievements: newVal, social: newVal, sessions: newVal, recommendations: reminders, goalProgress: goalUpdates } }
    });
  };

  const toggleReminders = () => {
    const newVal = !reminders;
    setReminders(newVal);
    savePreferences({
      notifications: { inApp: { recommendations: newVal } }
    });
  };

  const toggleGoalUpdates = () => {
    const newVal = !goalUpdates;
    setGoalUpdates(newVal);
    savePreferences({
      notifications: { inApp: { goalProgress: newVal } }
    });
  };

  const toggleDarkMode = () => {
    const newVal = !darkMode;
    setIsDark(newVal);
    savePreferences({
      display: { theme: newVal ? 'dark' : 'light' }
    });
  };

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
          onToggle={toggleEmail}
        />
        <ToggleRow
          label="Push Notifications"
          description="Get real-time notifications in your browser."
          enabled={pushNoti}
          onToggle={togglePush}
        />
        <ToggleRow
          label="Study Reminders"
          description="Daily reminders to stay on track with your goals."
          enabled={reminders}
          onToggle={toggleReminders}
        />
        <ToggleRow
          label="Goal Progress Updates"
          description="Notifications when you make progress on goals."
          enabled={goalUpdates}
          onToggle={toggleGoalUpdates}
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
          onToggle={toggleDarkMode}
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

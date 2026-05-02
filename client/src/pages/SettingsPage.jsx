import { useState, useEffect, useRef } from "react";
import {
  FiBell,
  FiMonitor,
  FiShield,
  FiCpu,
  FiToggleLeft,
  FiToggleRight,
  FiLock,
  FiEye,
  FiEyeOff,
  FiCheck,
} from "react-icons/fi";
import styles from "./SettingsPage.module.css";
import notificationService from "../services/notificationService";
import authService from "../services/authService";
import apiClient from "../services/api";
import { useTheme } from "../context/ThemeContext";

export default function SettingsPage() {
  // ── Notification prefs ──────────────────────────────────────────────────
  const [emailNoti, setEmailNoti] = useState(true);
  const [pushNoti, setPushNoti] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [goalUpdates, setGoalUpdates] = useState(true);

  // ── Appearance ──────────────────────────────────────────────────────────
  const { isDark, setIsDark } = useTheme();
  const darkMode = isDark;

  // ── Privacy ─────────────────────────────────────────────────────────────
  const [profilePublic, setProfilePublic] = useState(true);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);
  const [allowFollowers, setAllowFollowers] = useState(true);

  // ── Change password ──────────────────────────────────────────────────────
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwShowCurrent, setPwShowCurrent] = useState(false);
  const [pwShowNew, setPwShowNew] = useState(false);
  const [pwShowConfirm, setPwShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  // ── Storage ──────────────────────────────────────────────────────────────
  const [storage, setStorage] = useState(null); // { usedMB, limitMB, pct }
  const [cacheCleared, setCacheCleared] = useState(false);

  // ── Saving indicator ─────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const savingTimer = useRef(null);

  // ── Load on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [prefs, storageRes] = await Promise.all([
          notificationService.getPreferences(),
          apiClient.get("/users/storage"),
        ]);

        if (prefs) {
          const noti = prefs.notifications || {};
          setEmailNoti(noti.email?.achievements !== false);
          setPushNoti(noti.inApp?.achievements !== false);
          setReminders(noti.inApp?.recommendations !== false);
          setGoalUpdates(noti.inApp?.goalProgress !== false);
          const priv = prefs.privacy || {};
          setProfilePublic(priv.profilePublic !== false);
          setShowOnLeaderboard(priv.showXPOnLeaderboard !== false);
          setAllowFollowers(priv.allowFollowers !== false);
        }

        if (storageRes?.data) setStorage(storageRes.data);
      } catch (e) {
        console.error("Settings load error:", e);
      }
    };

    const user = authService.getUser();
    if (user?.authProvider === "google") setIsGoogleUser(true);

    load();
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const flashSaving = () => {
    setSaving(true);
    clearTimeout(savingTimer.current);
    savingTimer.current = setTimeout(() => setSaving(false), 1200);
  };

  const savePreferences = async (updates) => {
    try {
      flashSaving();
      await notificationService.updatePreferences(updates);
    } catch (e) {
      console.error("Save prefs error:", e);
    }
  };

  // ── Notification toggles ─────────────────────────────────────────────────
  const toggleEmail = () => {
    const v = !emailNoti;
    setEmailNoti(v);
    if (v) {
      savePreferences({ notifications: { email: { achievements: true, goalProgress: goalUpdates, social: true, recommendations: reminders, sessions: true } } });
    } else {
      savePreferences({ notifications: { email: { achievements: false, goalProgress: false, social: false, recommendations: false, sessions: false } } });
    }
  };

  const togglePush = () => {
    const v = !pushNoti;
    setPushNoti(v);
    savePreferences({ notifications: { inApp: { achievements: v, social: v, sessions: v, recommendations: reminders, goalProgress: goalUpdates } } });
  };

  const toggleReminders = () => {
    const v = !reminders;
    setReminders(v);
    savePreferences({ notifications: { inApp: { recommendations: v }, email: { recommendations: v } } });
  };

  const toggleGoalUpdates = () => {
    const v = !goalUpdates;
    setGoalUpdates(v);
    savePreferences({ notifications: { inApp: { goalProgress: v }, email: { goalProgress: v } } });
  };

  // ── Appearance ────────────────────────────────────────────────────────────
  const toggleDarkMode = () => {
    const v = !darkMode;
    setIsDark(v);
    savePreferences({ display: { theme: v ? "dark" : "light" } });
  };

  // ── Privacy toggles ───────────────────────────────────────────────────────
  const togglePrivacy = (field, currentVal, setter) => {
    const v = !currentVal;
    setter(v);
    savePreferences({ privacy: { [field]: v } });
  };

  // ── Change password ───────────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    if (pwNew !== pwConfirm) { setPwError("New passwords do not match."); return; }
    if (pwNew.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    setPwLoading(true);
    try {
      await authService.changePassword({ currentPassword: pwCurrent, newPassword: pwNew });
      setPwSuccess(true);
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      setTimeout(() => { setPwOpen(false); setPwSuccess(false); }, 2000);
    } catch (err) {
      setPwError(err.message || "Failed to change password.");
    } finally {
      setPwLoading(false);
    }
  };

  // ── Clear cache ───────────────────────────────────────────────────────────
  const handleClearCache = () => {
    const keep = ["authToken", "rememberMe", "theme", "user"];
    Object.keys(localStorage).forEach((k) => {
      if (!keep.includes(k)) localStorage.removeItem(k);
    });
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  return (
    <div className={styles.page}>
      {/* Saving indicator */}
      {saving && <div className={styles.savingBadge}>Saving…</div>}

      {/* ── Notifications ── */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}><FiBell /></span>
          <h2 className={styles.cardTitle}>Notifications</h2>
        </div>
        <ToggleRow label="Email Notifications" description="Receive updates and alerts via email." enabled={emailNoti} onToggle={toggleEmail} />
        <ToggleRow label="Push Notifications" description="Get real-time notifications in your browser." enabled={pushNoti} onToggle={togglePush} />
        <ToggleRow label="Study Reminders" description="Daily streak reminders and study nudges." enabled={reminders} onToggle={toggleReminders} />
        <ToggleRow label="Goal Progress Updates" description="Notifications when you hit milestones on your goals." enabled={goalUpdates} onToggle={toggleGoalUpdates} last />
      </section>

      {/* ── Appearance ── */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}><FiMonitor /></span>
          <h2 className={styles.cardTitle}>Appearance</h2>
        </div>
        <ToggleRow label="Dark Mode" description="Switch to dark theme for better night-time viewing." enabled={darkMode} onToggle={toggleDarkMode} last />
      </section>

      {/* ── Privacy & Security ── */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}><FiShield /></span>
          <h2 className={styles.cardTitle}>Privacy &amp; Security</h2>
        </div>

        <ToggleRow
          label="Public Profile"
          description="Allow other users to view your profile and public notes."
          enabled={profilePublic}
          onToggle={() => togglePrivacy("profilePublic", profilePublic, setProfilePublic)}
        />
        <ToggleRow
          label="Show on Leaderboard"
          description="Display your XP and rank on the community leaderboard."
          enabled={showOnLeaderboard}
          onToggle={() => togglePrivacy("showXPOnLeaderboard", showOnLeaderboard, setShowOnLeaderboard)}
        />
        <ToggleRow
          label="Allow Friend Requests"
          description="Let other users send you friend requests."
          enabled={allowFollowers}
          onToggle={() => togglePrivacy("allowFollowers", allowFollowers, setAllowFollowers)}
        />

        {/* Change Password */}
        <div className={`${styles.row} ${styles.rowLast}`} style={{ flexDirection: "column", alignItems: "stretch", gap: 0 }}>
          <div className={styles.pwHeader} onClick={() => !isGoogleUser && setPwOpen((o) => !o)}>
            <div>
              <p className={styles.rowLabel}>
                <FiLock size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
                Change Password
              </p>
              <p className={styles.rowDescription}>
                {isGoogleUser ? "Not available for Google-authenticated accounts." : "Update your account password."}
              </p>
            </div>
            {!isGoogleUser && (
              <span className={`${styles.pwChevron} ${pwOpen ? styles.pwChevronOpen : ""}`}>›</span>
            )}
          </div>

          {pwOpen && !isGoogleUser && (
            <form className={styles.pwForm} onSubmit={handleChangePassword}>
              {pwSuccess ? (
                <div className={styles.pwSuccessMsg}>
                  <FiCheck size={16} /> Password changed successfully!
                </div>
              ) : (
                <>
                  <PasswordField label="Current password" value={pwCurrent} onChange={setPwCurrent} show={pwShowCurrent} onToggleShow={() => setPwShowCurrent(s => !s)} />
                  <PasswordField label="New password" value={pwNew} onChange={setPwNew} show={pwShowNew} onToggleShow={() => setPwShowNew(s => !s)} />
                  <PasswordField label="Confirm new password" value={pwConfirm} onChange={setPwConfirm} show={pwShowConfirm} onToggleShow={() => setPwShowConfirm(s => !s)} />
                  {pwError && <p className={styles.pwError}>{pwError}</p>}
                  <button type="submit" className={styles.pwSaveBtn} disabled={pwLoading || !pwCurrent || !pwNew || !pwConfirm}>
                    {pwLoading ? "Saving…" : "Update Password"}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </section>

      {/* ── Performance ── */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}><FiCpu /></span>
          <h2 className={styles.cardTitle}>Performance</h2>
        </div>

        <div className={styles.storageBlock}>
          <p className={styles.storageLabel}>Storage Usage</p>
          {storage ? (
            <>
              <p className={styles.storageMeta}>
                {storage.usedMB} MB of {storage.limitMB} MB used · {storage.pct}%
              </p>
              <div className={styles.storageBarOuter}>
                <div
                  className={styles.storageBarInner}
                  style={{ width: `${storage.pct}%`, background: storage.pct > 80 ? "linear-gradient(90deg,#dc2626,#ef4444)" : undefined }}
                />
              </div>
            </>
          ) : (
            <p className={styles.storageMeta}>Loading…</p>
          )}
        </div>

        <div className={styles.clearRow}>
          <div>
            <p className={styles.clearLabel}>Clear Cache</p>
            <p className={styles.clearDescription}>Remove locally cached preferences and temporary data.</p>
          </div>
          <button className={`${styles.clearButton} ${cacheCleared ? styles.clearButtonDone : ""}`} onClick={handleClearCache}>
            {cacheCleared ? "Cleared ✓" : "Clear"}
          </button>
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ToggleRow({ label, description, enabled, onToggle, last }) {
  return (
    <div className={`${styles.row} ${last ? styles.rowLast : ""}`}>
      <div>
        <p className={styles.rowLabel}>{label}</p>
        <p className={styles.rowDescription}>{description}</p>
      </div>
      <button type="button" className={styles.toggleButton} onClick={onToggle} aria-pressed={enabled}>
        {enabled ? (
          <FiToggleRight className={`${styles.toggleIcon} ${styles.toggleOn}`} />
        ) : (
          <FiToggleLeft className={styles.toggleIcon} />
        )}
      </button>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggleShow }) {
  return (
    <div className={styles.pwField}>
      <label className={styles.pwLabel}>{label}</label>
      <div className={styles.pwInputWrap}>
        <input
          type={show ? "text" : "password"}
          className={styles.pwInput}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          required
        />
        <button type="button" className={styles.pwEye} onClick={onToggleShow} tabIndex={-1}>
          {show ? <FiEyeOff size={15} /> : <FiEye size={15} />}
        </button>
      </div>
    </div>
  );
}

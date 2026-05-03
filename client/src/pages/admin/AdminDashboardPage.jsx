import { useState, useEffect } from 'react';
import adminService from '../../services/adminService';
import styles from './admin.module.css';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminService
      .getStats()
      .then((res) => setStats(res.data))
      .catch(() => setError('Failed to load stats.'))
      .finally(() => setLoading(false));
  }, []);

  const cards = stats
    ? [
        { label: 'Total Users', value: stats.totalUsers, cls: '' },
        { label: 'Awaiting ID Review', value: stats.awaitingReview, cls: 'warning' },
        { label: 'Verified Users', value: stats.verifiedUsers, cls: 'success' },
        { label: 'Rejected', value: stats.rejectedUsers, cls: 'danger' },
        { label: 'Total Sessions', value: stats.totalSessions, cls: 'accent' },
        { label: 'Total Materials', value: stats.totalMaterials, cls: 'accent' },
      ]
    : [];

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.pageSubtitle}>Overview of Mindora platform activity</p>
      </div>

      {loading && <div className={styles.loading}>Loading stats…</div>}
      {error && <div className={styles.empty}>{error}</div>}

      {stats && (
        <div className={styles.statsGrid}>
          {cards.map((c) => (
            <div key={c.label} className={styles.statCard}>
              <span className={styles.statLabel}>{c.label}</span>
              <span className={`${styles.statValue} ${c.cls ? styles[c.cls] : ''}`}>
                {c.value ?? '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

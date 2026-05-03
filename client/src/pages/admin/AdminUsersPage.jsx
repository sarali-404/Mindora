import { useState, useEffect, useCallback } from 'react';
import adminService from '../../services/adminService';
import styles from './admin.module.css';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'unverified', label: 'Unverified' },
  { value: 'email_verified', label: 'Email Verified' },
  { value: 'verified', label: 'Verified (ID submitted)' },
  { value: 'rejected', label: 'Rejected' },
];

function VerificationBadge({ status, idVerified }) {
  if (status === 'verified' && idVerified) {
    return <span className={`${styles.badge} ${styles.badgeVerified}`}>ID Verified</span>;
  }
  if (status === 'verified' && !idVerified) {
    return <span className={`${styles.badge} ${styles.badgePending}`}>Pending Review</span>;
  }
  if (status === 'rejected') {
    return <span className={`${styles.badge} ${styles.badgeRejected}`}>Rejected</span>;
  }
  if (status === 'email_verified') {
    return <span className={`${styles.badge} ${styles.badgeEmailVerified}`}>Email Verified</span>;
  }
  return <span className={`${styles.badge} ${styles.badgeUnverified}`}>Unverified</span>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(() => {
    setLoading(true);
    adminService
      .getUsers({ page, search, status: statusFilter })
      .then((res) => {
        setUsers(res.data.users);
        setPagination(res.data.pagination);
      })
      .catch(() => showToast('Failed to load users.', 'error'))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleToggleActive = async (user) => {
    try {
      const res = await adminService.toggleUserActive(user._id);
      showToast(res.message);
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isActive: res.data.isActive } : u))
      );
    } catch {
      showToast('Failed to update user.', 'error');
    }
  };

  const pageNumbers = [];
  for (let i = 1; i <= pagination.pages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Users</h1>
        <p className={styles.pageSubtitle}>
          {pagination.total} total user{pagination.total !== 1 ? 's' : ''}
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>All Users</h2>
          <div className={styles.toolbar}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Search name, username, email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button className={`${styles.btn} ${styles.btnView}`} type="submit">
                Search
              </button>
            </form>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <div className={styles.loading}>Loading…</div>}
        {!loading && users.length === 0 && (
          <div className={styles.empty}>No users match your search.</div>
        )}

        {!loading && users.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>University</th>
                  <th>Status</th>
                  <th>Active</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const name = [u.profile?.firstName, u.profile?.lastName]
                    .filter(Boolean)
                    .join(' ') || u.username;
                  return (
                    <tr key={u._id}>
                      <td>
                        <div className={styles.userCell}>
                          <span className={styles.userName}>{name}</span>
                          <span className={styles.userSub}>@{u.username} · {u.email}</span>
                        </div>
                      </td>
                      <td>{u.profile?.university || '—'}</td>
                      <td>
                        <VerificationBadge
                          status={u.verificationStatus}
                          idVerified={u.profile?.idPhoto?.verified}
                        />
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            u.isActive !== false ? styles.badgeActive : styles.badgeInactive
                          }`}
                        >
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{formatDate(u.createdAt)}</td>
                      <td>
                        {u.role !== 'admin' && (
                          <button
                            className={`${styles.btn} ${styles.btnSm} ${
                              u.isActive !== false ? styles.btnToggleActive : styles.btnToggle
                            }`}
                            onClick={() => handleToggleActive(u)}
                          >
                            {u.isActive !== false ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
              Page {pagination.page} of {pagination.pages} ({pagination.total} users)
            </span>
            <button
              className={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹ Prev
            </button>
            {pageNumbers.slice(
              Math.max(0, page - 3),
              Math.min(pagination.pages, page + 2)
            ).map((n) => (
              <button
                key={n}
                className={`${styles.pageBtn} ${n === page ? styles.pageBtnActive : ''}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              className={styles.pageBtn}
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next ›
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === 'error' ? styles.toastError : styles.toastSuccess
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

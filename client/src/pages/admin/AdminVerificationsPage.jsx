import { useState, useEffect, useCallback } from 'react';
import adminService from '../../services/adminService';
import styles from './admin.module.css';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminVerificationsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [lightboxUser, setLightboxUser] = useState(null);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectMessage, setRejectMessage] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(() => {
    setLoading(true);
    adminService
      .getPendingVerifications()
      .then((res) => setUsers(res.data.users))
      .catch(() => showToast('Failed to load verifications.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (userId, username) => {
    try {
      await adminService.approveVerification(userId);
      showToast(`${username} approved.`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch {
      showToast('Failed to approve.', 'error');
    }
  };

  const openReject = (user) => {
    setRejectTarget(user);
    setRejectMessage('');
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setRejectLoading(true);
    try {
      await adminService.rejectVerification(rejectTarget._id, rejectMessage);
      showToast(`${rejectTarget.username} rejected.`);
      setUsers((prev) => prev.filter((u) => u._id !== rejectTarget._id));
      setRejectTarget(null);
    } catch {
      showToast('Failed to reject.', 'error');
    } finally {
      setRejectLoading(false);
    }
  };

  const getIdPhotoUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>ID Verifications</h1>
        <p className={styles.pageSubtitle}>
          {users.length} user{users.length !== 1 ? 's' : ''} awaiting review
        </p>
      </div>

      <div className={styles.card}>
        {loading && <div className={styles.loading}>Loading…</div>}
        {!loading && users.length === 0 && (
          <div className={styles.empty}>No pending verifications — all clear!</div>
        )}

        {!loading && users.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>University</th>
                  <th>Submitted</th>
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
                      <td>{formatDate(u.profile?.idPhoto?.uploadedAt)}</td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={`${styles.btn} ${styles.btnView} ${styles.btnSm}`}
                            onClick={() => {
                              setLightboxUrl(getIdPhotoUrl(u.profile?.idPhoto?.url));
                              setLightboxUser(u);
                            }}
                          >
                            View ID
                          </button>
                          <button
                            className={`${styles.btn} ${styles.btnApprove} ${styles.btnSm}`}
                            onClick={() => handleApprove(u._id, u.username)}
                          >
                            Approve
                          </button>
                          <button
                            className={`${styles.btn} ${styles.btnReject} ${styles.btnSm}`}
                            onClick={() => openReject(u)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ID Photo Lightbox */}
      {lightboxUrl && (
        <div className={styles.backdrop} onClick={() => setLightboxUrl(null)}>
          <div
            className={`${styles.modal} ${styles.lightbox}`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className={styles.modalTitle}>
              ID Photo —{' '}
              {[lightboxUser?.profile?.firstName, lightboxUser?.profile?.lastName]
                .filter(Boolean)
                .join(' ') || lightboxUser?.username}
            </p>
            <img
              src={lightboxUrl}
              alt="ID Photo"
              className={styles.lightboxImg}
              onError={(e) => { e.target.alt = 'Image failed to load'; }}
            />
            <div className={styles.modalActions}>
              <button
                className={`${styles.btn} ${styles.btnApprove}`}
                onClick={() => {
                  handleApprove(lightboxUser._id, lightboxUser.username);
                  setLightboxUrl(null);
                }}
              >
                Approve
              </button>
              <button
                className={`${styles.btn} ${styles.btnReject}`}
                onClick={() => {
                  openReject(lightboxUser);
                  setLightboxUrl(null);
                }}
              >
                Reject
              </button>
              <button
                className={`${styles.btn} ${styles.btnCancel}`}
                onClick={() => setLightboxUrl(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className={styles.backdrop} onClick={() => setRejectTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTitle}>Reject Verification</p>
            <p className={styles.modalSubtitle}>
              Rejecting{' '}
              <strong>
                {[rejectTarget.profile?.firstName, rejectTarget.profile?.lastName]
                  .filter(Boolean)
                  .join(' ') || rejectTarget.username}
              </strong>
              . An email will be sent with your reason.
            </p>
            <label className={styles.modalLabel}>
              Reason <span style={{ fontWeight: 400, color: '#a0aec0' }}>(optional)</span>
            </label>
            <textarea
              className={styles.modalTextarea}
              placeholder="e.g. ID photo is blurry or unreadable"
              value={rejectMessage}
              onChange={(e) => setRejectMessage(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button
                className={`${styles.btn} ${styles.btnReject}`}
                onClick={handleReject}
                disabled={rejectLoading}
              >
                {rejectLoading ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button
                className={`${styles.btn} ${styles.btnCancel}`}
                onClick={() => setRejectTarget(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
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

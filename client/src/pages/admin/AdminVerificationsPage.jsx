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
  const [lightboxDocs, setLightboxDocs] = useState([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);
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
    if (url.startsWith('data:')) return url; // base64 data URL — use directly as <img src>
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const buildDocList = (user) => {
    const docs = [];
    if (user.profile?.idPhoto?.url) {
      docs.push({ docType: 'Student ID Card', url: getIdPhotoUrl(user.profile.idPhoto.url) });
    }
    (user.profile?.verificationDocs || []).forEach((d) => {
      const labelMap = {
        enrollment_letter: 'Enrollment Letter',
        university_timetable: 'University Timetable',
        fee_receipt: 'Fee Receipt',
        library_card: 'Library Card',
      };
      docs.push({ docType: labelMap[d.docType] || d.docType, url: getIdPhotoUrl(d.url) });
    });
    return docs;
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
                              const docs = buildDocList(u);
                              if (docs.length > 0) {
                                setLightboxDocs(docs);
                                setLightboxIdx(0);
                                setLightboxUser(u);
                              }
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

      {/* ID Documents Lightbox */}
      {lightboxDocs.length > 0 && (
        <div className={styles.backdrop} onClick={() => setLightboxDocs([])}>
          <div
            className={`${styles.modal} ${styles.lightbox}`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className={styles.modalTitle}>
              Documents —{' '}
              {[lightboxUser?.profile?.firstName, lightboxUser?.profile?.lastName]
                .filter(Boolean)
                .join(' ') || lightboxUser?.username}
            </p>
            {lightboxDocs.length > 1 && (
              <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                {lightboxDocs[lightboxIdx].docType} &nbsp;·&nbsp; {lightboxIdx + 1} of {lightboxDocs.length}
              </p>
            )}
            {lightboxDocs.length === 1 && (
              <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                {lightboxDocs[0].docType}
              </p>
            )}
            <img
              src={lightboxDocs[lightboxIdx]?.url}
              alt={lightboxDocs[lightboxIdx]?.docType}
              className={styles.lightboxImg}
              onError={(e) => { e.target.alt = 'Image failed to load'; }}
            />
            {lightboxDocs.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  className={`${styles.btn} ${styles.btnCancel}`}
                  disabled={lightboxIdx === 0}
                  onClick={() => setLightboxIdx((i) => i - 1)}
                >
                  ← Prev
                </button>
                <button
                  className={`${styles.btn} ${styles.btnCancel}`}
                  disabled={lightboxIdx === lightboxDocs.length - 1}
                  onClick={() => setLightboxIdx((i) => i + 1)}
                >
                  Next →
                </button>
              </div>
            )}
            <div className={styles.modalActions}>
              <button
                className={`${styles.btn} ${styles.btnApprove}`}
                onClick={() => {
                  handleApprove(lightboxUser._id, lightboxUser.username);
                  setLightboxDocs([]);
                }}
              >
                Approve
              </button>
              <button
                className={`${styles.btn} ${styles.btnReject}`}
                onClick={() => {
                  openReject(lightboxUser);
                  setLightboxDocs([]);
                }}
              >
                Reject
              </button>
              <button
                className={`${styles.btn} ${styles.btnCancel}`}
                onClick={() => setLightboxDocs([])}
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

import { useState, useEffect, useRef } from 'react';
import { MdClose, MdPersonAdd, MdCheck, MdAccessTime, MdSchool, MdVerified } from 'react-icons/md';
import friendService from '../../services/friendService';
import authService from '../../services/authService';
import styles from './AuthorModal.module.css';

const SERVER_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function resolveAvatar(avatar) {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
  return `${SERVER_BASE}${avatar}`;
}

function getDisplayName(user) {
  if (!user) return 'Unknown';
  const fn = user.profile?.firstName;
  const ln = user.profile?.lastName;
  if (fn && ln) return `${fn} ${ln}`.trim();
  if (fn) return fn;
  return user.username || 'Unknown';
}

function getInitial(user) {
  const name = getDisplayName(user);
  return name.charAt(0).toUpperCase();
}

function formatMemberSince(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * AuthorModal — clickable author section with a mini profile popup.
 *
 * Props:
 *   author  — user object: { _id, username, profile: { firstName, lastName, avatar, university }, createdAt }
 *   date    — publication date string (shown in author row subtitle)
 *   styleOverrides — optional extra class names for the outer authorSection div
 */
export default function AuthorModal({ author, date, styleOverrides = '' }) {
  const currentUser = authService.getUser();
  const currentUserId = currentUser?.id || currentUser?._id;
  const isOwnProfile = author?._id && currentUserId &&
    author._id.toString() === currentUserId.toString();

  const [open, setOpen] = useState(false);
  const [friendStatus, setFriendStatus] = useState(null); // null | 'none' | 'pending' | 'friends'
  const [statusLoading, setStatusLoading] = useState(false);
  const [reqLoading, setReqLoading] = useState(false);
  const modalRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Fetch friendship status when modal opens
  useEffect(() => {
    if (!open || !author?._id || isOwnProfile) return;
    setStatusLoading(true);
    friendService.getFriendshipStatus(author._id)
      .then((res) => {
        const s = res.data?.status || res.status || 'none';
        setFriendStatus(s);
      })
      .catch(() => setFriendStatus('none'))
      .finally(() => setStatusLoading(false));
  }, [open, author?._id, isOwnProfile]);

  const handleSendRequest = async () => {
    if (reqLoading) return;
    setReqLoading(true);
    try {
      await friendService.sendFriendRequest(author._id);
      setFriendStatus('pending');
    } catch (e) {
      console.error('Friend request error:', e);
    } finally {
      setReqLoading(false);
    }
  };

  if (!author) return null;

  const avatarUrl = resolveAvatar(author.profile?.avatar);
  const displayName = getDisplayName(author);
  const initial = getInitial(author);
  const university = author.profile?.university || '';
  const memberSince = formatMemberSince(author.createdAt);

  return (
    <div className={`${styles.authorSection} ${styleOverrides}`}>
      {/* Clickable row */}
      <button
        type="button"
        className={styles.authorTrigger}
        onClick={() => setOpen(true)}
        title="View profile"
      >
        <div className={styles.authorAvatar}>
          {avatarUrl
            ? <img src={avatarUrl} alt={displayName} className={styles.avatarImg} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            : null}
          <span className={styles.avatarInitial} style={avatarUrl ? { display: 'none' } : {}}>{initial}</span>
        </div>
        <div className={styles.authorInfo}>
          <span className={styles.authorName}>
            {displayName}
            {author?.profile?.idPhoto?.verified === true && (
              <MdVerified className={styles.verifiedBadge} title="Verified" />
            )}
          </span>
          {(university || date) && (
            <span className={styles.authorMeta}>
              {university ? `${university}${date ? ' • ' : ''}` : ''}{date || ''}
            </span>
          )}
        </div>
      </button>

      {/* Modal */}
      {open && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal} ref={modalRef}>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}><MdClose size={18} /></button>

            {/* Avatar large */}
            <div className={styles.modalAvatarWrap}>
              <div className={styles.modalAvatar}>
                {avatarUrl
                  ? <img src={avatarUrl} alt={displayName} className={styles.modalAvatarImg} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                  : null}
                <span className={styles.modalAvatarInitial} style={avatarUrl ? { display: 'none' } : {}}>{initial}</span>
              </div>
            </div>

            {/* Name */}
            <h3 className={styles.modalName}>
              {displayName}
              {author?.profile?.idPhoto?.verified === true && (
                <MdVerified className={styles.modalVerifiedBadge} title="Verified" />
              )}
            </h3>
            {author.username && <p className={styles.modalUsername}>@{author.username}</p>}

            {/* Details */}
            <div className={styles.modalDetails}>
              {university && (
                <div className={styles.modalDetail}>
                  <MdSchool size={14} className={styles.detailIcon} />
                  <span className={styles.detailLabel}>University</span>
                  <span className={styles.detailValue}>{university}</span>
                </div>
              )}
              {memberSince && (
                <div className={styles.modalDetail}>
                  <MdAccessTime size={14} className={styles.detailIcon} />
                  <span className={styles.detailLabel}>Member since</span>
                  <span className={styles.detailValue}>{memberSince}</span>
                </div>
              )}
            </div>

            {/* Friend button */}
            {!isOwnProfile && (
              <div className={styles.modalActions}>
                {statusLoading ? (
                  <span className={styles.friendStatus}>Loading…</span>
                ) : friendStatus === 'friends' ? (
                  <span className={styles.friendsBadge}>
                    <MdCheck size={15} /> Friends
                  </span>
                ) : friendStatus === 'pending' ? (
                  <button className={`${styles.friendBtn} ${styles.friendBtnPending}`} disabled>
                    <MdCheck size={16} /> Request Sent
                  </button>
                ) : (
                  <button className={styles.friendBtn} onClick={handleSendRequest} disabled={reqLoading}>
                    <MdPersonAdd size={16} /> {reqLoading ? 'Sending…' : 'Add Friend'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

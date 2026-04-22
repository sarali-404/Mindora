/**
 * UserAvatar — shows profile picture if available, otherwise first letter of name.
 * Props:
 *   user     - user object with profile.avatar, profile.firstName, username
 *   size     - number (px), default 36
 *   className - optional extra class
 */
import styles from './UserAvatar.module.css';

const SERVER_URL = (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');

export function getAvatarUrl(user) {
  const avatar = user?.profile?.avatar;
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
  return `${SERVER_URL}${avatar}`;
}

export function getInitialLetter(user) {
  if (user?.profile?.firstName) return user.profile.firstName[0].toUpperCase();
  if (user?.username) return user.username[0].toUpperCase();
  return '?';
}

export default function UserAvatar({ user, size = 36, className = '' }) {
  const avatarUrl = getAvatarUrl(user);
  const initial = getInitialLetter(user);
  const style = { width: size, height: size, fontSize: size * 0.38 };

  return (
    <div className={`${styles.avatar} ${className}`} style={style}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className={styles.img}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <span
        className={styles.initial}
        style={{ display: avatarUrl ? 'none' : 'flex' }}
      >
        {initial}
      </span>
    </div>
  );
}

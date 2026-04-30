import { useState, useEffect, useCallback } from 'react';
import styles from './ToastNotification.module.css';
import socketService from '../../services/socketService';
import authService from '../../services/authService';

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 5000;

const TYPE_ICONS = {
  achievement: '🏆',
  goal_progress: '🎯',
  social: '👥',
  session: '📚',
  system: 'ℹ️',
  chat: '💬',
  default: '🔔',
};

export default function ToastNotification() {
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((toast) => {
    setToasts(prev => {
      const updated = [toast, ...prev];
      return updated.slice(0, MAX_TOASTS);
    });
    setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // In-app notification events
  useEffect(() => {
    const handler = (e) => {
      const notification = e.detail;
      if (!notification) return;
      const id = notification._id || Date.now().toString();
      const icon = TYPE_ICONS[notification.type] || TYPE_ICONS.default;
      pushToast({ ...notification, id, icon });
    };

    window.addEventListener('mindora:newNotification', handler);
    return () => window.removeEventListener('mindora:newNotification', handler);
  }, [pushToast]);

  // Socket: new direct message
  useEffect(() => {
    const handleNewMessage = (message) => {
      const me = authService.getUser();
      // Don't toast my own messages
      if (!message?.sender || message.sender._id === me?._id) return;

      // Notify navbar badge
      window.dispatchEvent(new CustomEvent('mindora:incomingMessage', { detail: message }));

      const senderName = message.sender.profile?.firstName
        ? `${message.sender.profile.firstName} ${message.sender.profile.lastName || ''}`.trim()
        : message.sender.username || 'Someone';

      const preview = message.deletedForEveryone
        ? 'Message deleted'
        : (message.content?.length > 60 ? message.content.slice(0, 60) + '…' : message.content) || '📎 Attachment';

      pushToast({
        id: message._id || Date.now().toString(),
        icon: TYPE_ICONS.chat,
        title: senderName,
        message: preview,
        type: 'chat',
      });
    };

    const handleNewGroupMessage = (message) => {
      const me = authService.getUser();
      if (!message?.sender || message.sender._id === me?._id) return;

      const senderName = message.sender.profile?.firstName
        ? `${message.sender.profile.firstName} ${message.sender.profile.lastName || ''}`.trim()
        : message.sender.username || 'Someone';

      const groupName = message.group?.name || 'Group';
      const preview = message.deletedForEveryone
        ? 'Message deleted'
        : (message.content?.length > 60 ? message.content.slice(0, 60) + '…' : message.content) || '📎 Attachment';

      pushToast({
        id: message._id || Date.now().toString(),
        icon: TYPE_ICONS.chat,
        title: `${groupName}`,
        message: `${senderName}: ${preview}`,
        type: 'chat',
      });
    };

    const unsubDM = socketService.addListener('new_message', handleNewMessage);
    const unsubGroup = socketService.addListener('new_group_message', handleNewGroupMessage);
    return () => {
      unsubDM();
      unsubGroup();
    };
  }, [pushToast]);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.stack} aria-live="polite" aria-label="Notifications">
      {toasts.map(toast => (
        <div key={toast.id} className={styles.toast}>
          <span className={styles.icon}>{toast.icon}</span>
          <div className={styles.body}>
            <p className={styles.title}>{toast.title}</p>
            {toast.message && <p className={styles.message}>{toast.message}</p>}
          </div>
          <button
            className={styles.close}
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}


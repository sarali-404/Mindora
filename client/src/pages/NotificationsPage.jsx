import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCheck,
  FiTrash2,
  FiAward,
  FiTarget,
  FiUsers,
  FiStar,
  FiClock,
  FiInfo,
  FiMessageCircle,
} from "react-icons/fi";
import styles from "./NotificationsPage.module.css";
import notificationService from "../services/notificationService";
import chatService from "../services/chatService";

const TYPE_ICONS = {
  achievement: <FiAward />,
  goal_progress: <FiTarget />,
  social: <FiUsers />,
  recommendation: <FiStar />,
  session: <FiClock />,
  general: <FiInfo />,
};

const TYPE_STYLE_MAP = {
  achievement: "milestone",
  goal_progress: "streak",
  social: "friend",
  recommendation: "comment",
  session: "session",
  general: "recording",
};

function timeAgo(dateString) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadConvs, setUnreadConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifications = async (p = 1) => {
    try {
      setLoading(true);
      const res = await notificationService.getNotifications({
        page: p,
        limit: 20,
      });
      setNotifications(res.data || res.notifications || []);
      setTotalPages(res.pages || res.totalPages || 1);
      setPage(p);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadConvs = async () => {
    try {
      const convs = await chatService.getUnreadConversations();
      setUnreadConvs(convs);
    } catch (_) {}
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadConvs();
    // Reset the unread badge in the navbar
    window.dispatchEvent(new CustomEvent('mindora:notificationsRead'));
    window.dispatchEvent(new CustomEvent('mindora:messagesRead'));
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      window.dispatchEvent(new CustomEvent('mindora:notificationsRead'));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationService.deleteAll();
      setNotifications([]);
      setUnreadConvs([]);
      window.dispatchEvent(new CustomEvent('mindora:notificationsRead'));
      window.dispatchEvent(new CustomEvent('mindora:messagesRead'));
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.markReadButton} onClick={handleMarkAllRead}>
          <FiCheck />
          <span>Mark All as Read</span>
        </button>
        <button className={styles.clearAllButton} onClick={handleClearAll}>
          <FiTrash2 />
          <span>Clear All</span>
        </button>
      </header>

      <section className={styles.list}>
        {/* Unread message notifications */}
        {unreadConvs.map((conv) => {
          const name = conv.otherUser?.profile?.firstName
            ? `${conv.otherUser.profile.firstName} ${conv.otherUser.profile.lastName || ''}`.trim()
            : conv.otherUser?.username || 'Someone';
          return (
            <article
              key={`msg-${conv.conversationId}`}
              className={`${styles.card} ${styles.cardUnread}`}
              onClick={() => {
                setUnreadConvs(prev => prev.filter(c => c.conversationId !== conv.conversationId));
                navigate('/app/community');
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.cardLeft}>
                <span className={`${styles.iconCircle} ${styles.icon_friend}`}>
                  <FiMessageCircle />
                </span>
                <div>
                  <p className={styles.cardTitle}>
                    {conv.unreadCount === 1
                      ? `You have 1 unread message from ${name}`
                      : `You have ${conv.unreadCount} unread messages from ${name}`}
                  </p>
                  <p className={styles.cardMessage}>
                    {conv.lastMessage?.content || 'Tap to view the conversation'}
                  </p>
                  <p className={styles.cardTime}>{timeAgo(conv.lastMessage?.createdAt)}</p>
                </div>
              </div>
              <div className={styles.cardRight}>
                <span className={styles.unreadDot} />
              </div>
            </article>
          );
        })}

        {/* System notifications */}
        {loading ? (
          <p className={styles.emptyText}>Loading notifications...</p>
        ) : notifications.length === 0 && unreadConvs.length === 0 ? (
          <p className={styles.emptyText}>No notifications yet.</p>
        ) : (
          notifications.map((item) => (
            <NotificationCard
              key={item._id}
              item={item}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
            />
          ))
        )}
      </section>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageButton}
            disabled={page <= 1}
            onClick={() => fetchNotifications(page - 1)}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          <button
            className={styles.pageButton}
            disabled={page >= totalPages}
            onClick={() => fetchNotifications(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationCard({ item, onMarkRead, onDelete }) {
  const typeStyle = TYPE_STYLE_MAP[item.type] || "recording";
  const icon = TYPE_ICONS[item.type] || <FiInfo />;

  return (
    <article
      className={`${styles.card} ${!item.isRead ? styles.cardUnread : ""}`}
      onClick={() => !item.isRead && onMarkRead(item._id)}
    >
      <div className={styles.cardLeft}>
        <span
          className={`${styles.iconCircle} ${styles[`icon_${typeStyle}`]}`}
        >
          {icon}
        </span>
        <div>
          <p className={styles.cardTitle}>{item.title}</p>
          <p className={styles.cardMessage}>{item.message}</p>
          <p className={styles.cardTime}>{timeAgo(item.createdAt)}</p>
        </div>
      </div>

      <div className={styles.cardRight}>
        {!item.isRead && <span className={styles.unreadDot} />}
        <button
          className={styles.deleteButton}
          aria-label="Delete notification"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item._id);
          }}
        >
          <FiTrash2 />
        </button>
      </div>
    </article>
  );
}

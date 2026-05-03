import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './NotePage.module.css';
import aiStyles from './AiNotePage.module.css';
import goalService from '../services/goalService';
import authService from '../services/authService';
import AuthorModal from '../components/shared/AuthorModal';
import {
  MdArrowBack,
  MdAutoAwesome,
  MdVisibility,
  MdShare,
  MdFavorite,
  MdFavoriteBorder,
  MdSend,
  MdReply,
  MdDelete,
  MdClose,
  MdDownload,
} from 'react-icons/md';
import { safeJSONParse } from '../utils/parseContent';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(dateStr);
}

export default function AiNotePage() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const currentUserId = currentUser?.id || currentUser?._id;

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Likes state  
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    const fetchNote = async () => {
      if (!noteId) { setError('Note not found'); setLoading(false); return; }
      setLoading(true);
      setError('');
      try {
        const response = await goalService.getPublicNote(noteId);
        setNote(response.data);
        setIsLiked(response.data.isLiked || false);
        setLikesCount(response.data.stats?.likes || 0);
      } catch (err) {
        setError('Failed to load note. It may have been made private or deleted.');
        console.error('Fetch AI note error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNote();
  }, [noteId]);

  useEffect(() => {
    const fetchComments = async () => {
      if (!noteId) return;
      setCommentsLoading(true);
      try {
        const response = await goalService.getAiNoteComments(noteId);
        setComments(response.data || []);
      } catch (err) {
        console.error('Fetch comments error:', err);
      } finally {
        setCommentsLoading(false);
      }
    };
    if (noteId) fetchComments();
  }, [noteId]);

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      const response = await goalService.toggleAiNoteLike(noteId);
      setIsLiked(response.isLiked);
      setLikesCount(response.likes);
    } catch (err) {
      console.error('Like error:', err);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({ title: textContent?.title || note?.topic, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  const handleDownload = () => {
    if (!note) return;
    const title = textContent?.title || note.topic || 'AI Notes';
    const keyPoints = textContent?.keyPoints || [];
    const sections = textContent?.sections || [];
    const content = textContent?.content || '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 750px; margin: 40px auto; color: #111; line-height: 1.7; }
    h1 { font-size: 1.8rem; border-bottom: 2px solid #0073a0; padding-bottom: 0.5rem; }
    h2 { font-size: 1.2rem; color: #0073a0; margin-top: 1.5rem; }
    h3 { font-size: 1rem; color: #374151; margin-top: 1.2rem; }
    ul { padding-left: 1.5rem; }
    li { margin-bottom: 0.4rem; }
    .meta { color: #6b7280; font-size: 0.85rem; margin-bottom: 1.5rem; }
    p { margin: 0.5rem 0; white-space: pre-line; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">AI Generated Note &nbsp;·&nbsp; ${note.goal?.subject || ''} &nbsp;·&nbsp; ${formatDate(note.publishedAt || note.createdAt)}</p>
  ${keyPoints.length > 0 ? `<h2>Key Points</h2><ul>${keyPoints.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
  ${sections.map(s => `<h3>${s.heading}</h3><p>${s.content}</p>`).join('')}
  ${!sections.length && content ? `<h2>Content</h2><p>${content}</p>` : ''}
</body>
</html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const response = await goalService.addAiNoteComment(noteId, newComment.trim(), replyingTo?._id || null);
      if (replyingTo) {
        setComments(prev => prev.map(c => {
          if (c._id === replyingTo._id) {
            return { ...c, replies: [...(c.replies || []), response.data] };
          }
          return c;
        }));
      } else {
        setComments(prev => [response.data, ...prev]);
      }
      setNewComment('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Add comment error:', err);
    }
  };

  const handleDeleteComment = async (commentId, parentId) => {
    try {
      await goalService.deleteAiNoteComment(noteId, commentId);
      if (parentId) {
        setComments(prev => prev.map(c => {
          if (c._id === parentId) {
            return { ...c, replies: (c.replies || []).filter(r => r._id !== commentId) };
          }
          return c;
        }));
      } else {
        setComments(prev => prev.filter(c => c._id !== commentId));
      }
    } catch (err) {
      console.error('Delete comment error:', err);
    }
  };

  if (loading) {
    return (
      <div className={styles.notePage}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading note...</p>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className={styles.notePage}>
        <div className={styles.errorState}>
          <MdAutoAwesome className={styles.errorIcon} />
          <h2>Note Unavailable</h2>
          <p>{error || 'This note could not be loaded.'}</p>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            <MdArrowBack /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const textContent =
    typeof note.textContent === 'string'
      ? safeJSONParse(note.textContent)
      : note.textContent;

  const author = note.goal?.user;
  const authorName =
    author?.profile?.firstName
      ? `${author.profile.firstName} ${author.profile.lastName || ''}`.trim()
      : author?.username || 'Unknown';
  const authorUniversity = author?.profile?.university || '';

  return (
    <div className={styles.notePage}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <MdArrowBack /> Back
        </button>
      </header>

      {/* Title section */}
      <div className={styles.titleSection}>
        <div className={styles.typeIconLarge}>
          <MdAutoAwesome size={32} style={{ color: '#f59e0b' }} />
        </div>
        <div className={styles.titleInfo}>
          <h1 className={styles.title}>
            {textContent?.title || note.topic || 'AI Notes'}
          </h1>
          <div className={styles.metaRow}>
            {note.goal?.subject && (
              <span className={styles.subjectTag}>{note.goal.subject}</span>
            )}
            {note.topic && (
              <span className={styles.typeBadge}>{note.topic}</span>
            )}
            <span className={styles.typeBadge}>AI Generated</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={aiStyles.layout}>
        {/* Left: Note Content */}
        <div className={aiStyles.contentSection}>
          {/* Key Points */}
          {textContent?.keyPoints?.length > 0 && (
            <div className={aiStyles.block}>
              <h2 className={aiStyles.blockTitle}>Key Points</h2>
              <ul className={aiStyles.keyPointsList}>
                {textContent.keyPoints.map((point, i) => (
                  <li key={i} className={aiStyles.keyPoint}>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sections */}
          {textContent?.sections?.length > 0 &&
            textContent.sections.map((section, i) => (
              <div key={i} className={aiStyles.block}>
                <h3 className={aiStyles.sectionHeading}>{section.heading}</h3>
                <p className={aiStyles.sectionContent}>{section.content}</p>
              </div>
            ))}

          {/* Full content fallback */}
          {!textContent?.sections?.length && textContent?.content && (
            <div className={aiStyles.block}>
              <h2 className={aiStyles.blockTitle}>Content</h2>
              <div className={aiStyles.fullContent}>{textContent.content}</div>
            </div>
          )}

          {/* Empty fallback */}
          {!textContent?.keyPoints?.length &&
            !textContent?.sections?.length &&
            !textContent?.content && (
              <div className={aiStyles.block}>
                <p className={aiStyles.emptyContent}>
                  No content available for this note.
                </p>
              </div>
            )}
        </div>

        {/* Right: Author & Meta */}
        <div className={styles.materialInfo}>
          {/* Author */}
          <AuthorModal
            author={note.goal?.user}
            date={formatDate(note.publishedAt || note.createdAt)}
          />

          {/* Stats */}
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <MdVisibility />
              <span>{note.stats?.views || 0} views</span>
            </div>
            <div className={styles.statItem}>
              <MdFavorite />
              <span>{likesCount} likes</span>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actionButtons}>
            <button
              className={`${styles.actionBtn} ${isLiked ? styles.actionBtnActive : ''}`}
              onClick={handleLike}
              disabled={likeLoading}
            >
              {isLiked ? <MdFavorite /> : <MdFavoriteBorder />}
              {isLiked ? 'Liked' : 'Like'}
            </button>
            <button className={styles.actionBtn} onClick={handleShare}>
              <MdShare />
              Share
            </button>
            <button className={styles.actionBtn} onClick={handleDownload}>
              <MdDownload />
              Download PDF
            </button>
          </div>

          {/* Goal context */}
          {note.goal?.title && (
            <div className={styles.descriptionSection}>
              <h3>Source Goal</h3>
              <p>{note.goal.title}</p>
            </div>
          )}
        </div>
      </div>

      {/* Comments section */}
      <div className={styles.commentsSection}>
        <h2 className={styles.commentsTitle}>
          Comments ({comments.length})
        </h2>

        <form className={styles.commentForm} onSubmit={handleAddComment}>
          {replyingTo && (
            <div className={styles.replyingTo}>
              Replying to {replyingTo.author?.username || 'user'}
              <button type="button" onClick={() => setReplyingTo(null)}>
                <MdClose />
              </button>
            </div>
          )}
          <div className={styles.commentInputWrapper}>
            <textarea
              className={styles.commentInput}
              placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <button
              type="submit"
              className={styles.sendButton}
              disabled={!newComment.trim()}
            >
              <MdSend />
            </button>
          </div>
        </form>

        {commentsLoading ? (
          <div className={styles.commentsLoading}>
            <div className={styles.spinner}></div>
          </div>
        ) : comments.length === 0 ? (
          <div className={styles.noComments}>
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className={styles.commentsList}>
            {comments.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                onReply={setReplyingTo}
                onDelete={handleDeleteComment}
                formatTime={formatRelativeTime}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment, onReply, onDelete, formatTime, parentId = null, currentUserId }) {
  const isCommentOwner =
    currentUserId &&
    comment.author &&
    (comment.author._id?.toString() === currentUserId?.toString() ||
      comment.author.toString() === currentUserId?.toString());

  return (
    <div className={styles.commentItem}>
      <div className={styles.commentAvatar}>
        {comment.author?.username?.charAt(0).toUpperCase() || 'U'}
      </div>
      <div className={styles.commentContent}>
        <div className={styles.commentHeader}>
          <span className={styles.commentAuthor}>
            {comment.author?.username || 'Unknown'}
          </span>
          <span className={styles.commentTime}>
            {formatTime(comment.createdAt)}
            {comment.isEdited && ' (edited)'}
          </span>
        </div>
        <p className={styles.commentText}>{comment.content}</p>
        <div className={styles.commentActions}>
          <button onClick={() => onReply(comment)}>
            <MdReply /> Reply
          </button>
          {isCommentOwner && (
            <button onClick={() => onDelete(comment._id, parentId)}>
              <MdDelete /> Delete
            </button>
          )}
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className={styles.repliesList}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply._id}
                comment={reply}
                onReply={onReply}
                onDelete={onDelete}
                formatTime={formatTime}
                parentId={comment._id}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


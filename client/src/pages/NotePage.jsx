import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './NotePage.module.css';
import materialService from '../services/materialService';
import authService from '../services/authService';
import { 
  MdArrowBack,
  MdVisibility,
  MdFavorite,
  MdFavoriteBorder,
  MdBookmark,
  MdBookmarkBorder,
  MdDownload,
  MdShare,
  MdPictureAsPdf,
  MdSlideshow,
  MdImage,
  MdVideoLibrary,
  MdDescription,
  MdSend,
  MdMoreVert,
  MdEdit,
  MdDelete,
  MdReply,
  MdClose,
  MdFullscreen,
  MdOpenInNew,
  MdSave,
  MdCancel,
  MdLock,
  MdPublic
} from 'react-icons/md';

const NotePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  const currentUser = authService.getUser();
  
  // Material state
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    subject: '',
    materialType: '',
    visibility: '',
    tags: ''
  });
  const [saving, setSaving] = useState(false);
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  
  // UI state
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [savesCount, setSavesCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  // Get current user ID (handle both 'id' and '_id' formats)
  const currentUserId = currentUser?.id || currentUser?._id;
  
  // Check if current user is the author (compare as strings)
  const isOwner = currentUserId && material?.author && 
    (material.author._id?.toString() === currentUserId?.toString() ||
     material.author.toString() === currentUserId?.toString());

  // Fetch material details
  useEffect(() => {
    const fetchMaterial = async () => {
      if (!id) {
        setError('Material not found');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await materialService.getMaterial(id);
        setMaterial(response.data);
        setIsLiked(response.data.isLiked || false);
        setIsSaved(response.data.isSaved || false);
        setLikesCount(response.data.likesCount || 0);
        setSavesCount(response.data.savesCount || 0);
        
        // Initialize edit form with material data
        setEditForm({
          title: response.data.title || '',
          description: response.data.description || '',
          subject: response.data.subject || '',
          materialType: response.data.materialType || '',
          visibility: response.data.visibility || 'public',
          tags: response.data.tags?.join(', ') || ''
        });
      } catch (err) {
        setError('Failed to load material. It may have been deleted.');
        console.error('Fetch material error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterial();
  }, [id]);

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      if (!id) return;

      setCommentsLoading(true);
      try {
        const response = await materialService.getComments(id);
        setComments(response.data || []);
      } catch (err) {
        console.error('Fetch comments error:', err);
      } finally {
        setCommentsLoading(false);
      }
    };

    fetchComments();
  }, [id]);

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) {
      alert('Title is required');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        subject: editForm.subject,
        materialType: editForm.materialType,
        visibility: editForm.visibility,
        tags: editForm.tags.split(',').map(t => t.trim()).filter(t => t)
      };

      const response = await materialService.updateMaterial(id, updateData);
      setMaterial(response.data);
      setSearchParams({}); // Exit edit mode
    } catch (err) {
      console.error('Update material error:', err);
      alert('Failed to update material. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    // Reset form to original values
    setEditForm({
      title: material?.title || '',
      description: material?.description || '',
      subject: material?.subject || '',
      materialType: material?.materialType || '',
      visibility: material?.visibility || 'public',
      tags: material?.tags?.join(', ') || ''
    });
    setSearchParams({}); // Exit edit mode
  };

  // Handle like toggle
  const handleLike = async () => {
    if (actionLoading) return;
    setActionLoading('like');

    try {
      const response = await materialService.toggleLike(id);
      setIsLiked(response.data.isLiked);
      setLikesCount(response.data.likesCount);
    } catch (err) {
      console.error('Like error:', err);
    } finally {
      setActionLoading('');
    }
  };

  // Handle save toggle
  const handleSave = async () => {
    if (actionLoading) return;
    setActionLoading('save');

    try {
      const response = await materialService.toggleSave(id);
      setIsSaved(response.data.isSaved);
      setSavesCount(response.data.savesCount);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setActionLoading('');
    }
  };

  // Handle download
  const handleDownload = async () => {
    if (actionLoading) return;
    setActionLoading('download');

    try {
      await materialService.downloadMaterial(id, material.file?.originalName);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setActionLoading('');
    }
  };

  // Handle share
  const handleShare = async () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: material.title,
          text: material.description,
          url: shareUrl
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  // Handle add comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await materialService.addComment(
        id, 
        newComment.trim(), 
        replyingTo?._id
      );
      
      if (replyingTo) {
        // Add reply to parent comment
        setComments(prev => prev.map(c => {
          if (c._id === replyingTo._id) {
            return {
              ...c,
              replies: [...(c.replies || []), response.data]
            };
          }
          return c;
        }));
      } else {
        // Add new top-level comment
        setComments(prev => [response.data, ...prev]);
      }
      
      setNewComment('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Add comment error:', err);
      alert('Failed to add comment. Please try again.');
    }
  };

  // Handle delete comment
  const handleDeleteComment = async (commentId, parentId = null) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await materialService.deleteComment(id, commentId);
      
      if (parentId) {
        // Remove reply
        setComments(prev => prev.map(c => {
          if (c._id === parentId) {
            return {
              ...c,
              replies: c.replies?.filter(r => r._id !== commentId) || []
            };
          }
          return c;
        }));
      } else {
        // Remove top-level comment
        setComments(prev => prev.filter(c => c._id !== commentId));
      }
    } catch (err) {
      console.error('Delete comment error:', err);
      alert('Failed to delete comment.');
    }
  };

  // Get file preview URL
  const getPreviewUrl = () => {
    if (!material?.file?.path) return null;
    return materialService.getFilePreviewUrl(material.file.path);
  };

  // Get type icon
  const getTypeIcon = (type, size = 24) => {
    switch (type) {
      case 'PDF': return <MdPictureAsPdf size={size} />;
      case 'Slides': return <MdSlideshow size={size} />;
      case 'Video': return <MdVideoLibrary size={size} />;
      case 'Image': return <MdImage size={size} />;
      default: return <MdDescription size={size} />;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(dateString);
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.notePage}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading material...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !material) {
    return (
      <div className={styles.notePage}>
        <div className={styles.errorState}>
          <MdDescription className={styles.errorIcon} />
          <h2>Material Not Found</h2>
          <p>{error || 'This material may have been deleted or moved.'}</p>
          <button 
            className={styles.backButton}
            onClick={() => navigate('/app/library')}
          >
            <MdArrowBack /> Back to Library
          </button>
        </div>
      </div>
    );
  }

  // Edit mode view
  if (isEditMode) {
    // If not the owner, redirect to normal view
    if (!isOwner) {
      return (
        <div className={styles.notePage}>
          <div className={styles.errorState}>
            <MdDescription className={styles.errorIcon} />
            <h2>Cannot Edit</h2>
            <p>You don't have permission to edit this material.</p>
            <button 
              className={styles.backButton}
              onClick={() => {
                setSearchParams({});
                navigate(`/app/library/${id}`);
              }}
            >
              <MdArrowBack /> View Material
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className={styles.notePage}>
        {/* Header */}
        <header className={styles.header}>
          <button 
            className={styles.backButton}
            onClick={handleCancelEdit}
          >
            <MdArrowBack /> Cancel Edit
          </button>
          <div className={styles.editActions}>
            <button 
              className={styles.cancelEditBtn}
              onClick={handleCancelEdit}
              disabled={saving}
            >
              <MdCancel /> Cancel
            </button>
            <button 
              className={styles.saveEditBtn}
              onClick={handleSaveEdit}
              disabled={saving}
            >
              <MdSave /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </header>

        <div className={styles.editForm}>
          <h2 className={styles.editFormTitle}>Edit Material</h2>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Title *</label>
            <input
              type="text"
              className={styles.formInput}
              value={editForm.title}
              onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter material title"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Description</label>
            <textarea
              className={styles.formTextarea}
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter a description for your material"
              rows={4}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Subject</label>
              <select
                className={styles.formSelect}
                value={editForm.subject}
                onChange={(e) => setEditForm(prev => ({ ...prev, subject: e.target.value }))}
              >
                <option value="">Select subject</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Engineering">Engineering</option>
                <option value="Economics">Economics</option>
                <option value="Business">Business</option>
                <option value="Psychology">Psychology</option>
                <option value="Literature">Literature</option>
                <option value="History">History</option>
                <option value="Languages">Languages</option>
                <option value="Art">Art</option>
                <option value="Music">Music</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Material Type</label>
              <select
                className={styles.formSelect}
                value={editForm.materialType}
                onChange={(e) => setEditForm(prev => ({ ...prev, materialType: e.target.value }))}
              >
                <option value="">Select type</option>
                <option value="PDF">PDF</option>
                <option value="Document">Document</option>
                <option value="Slides">Slides</option>
                <option value="Image">Image</option>
                <option value="Video">Video</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Visibility</label>
            <div className={styles.visibilityOptions}>
              <label className={`${styles.visibilityOption} ${editForm.visibility === 'public' ? styles.active : ''}`}>
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={editForm.visibility === 'public'}
                  onChange={(e) => setEditForm(prev => ({ ...prev, visibility: e.target.value }))}
                />
                <MdPublic size={20} />
                <span>Public</span>
              </label>
              <label className={`${styles.visibilityOption} ${editForm.visibility === 'private' ? styles.active : ''}`}>
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={editForm.visibility === 'private'}
                  onChange={(e) => setEditForm(prev => ({ ...prev, visibility: e.target.value }))}
                />
                <MdLock size={20} />
                <span>Private</span>
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tags</label>
            <input
              type="text"
              className={styles.formInput}
              value={editForm.tags}
              onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="Enter tags separated by commas (e.g., react, javascript, tutorial)"
            />
            <span className={styles.formHint}>Separate tags with commas</span>
          </div>

          {/* Preview of current file */}
          <div className={styles.currentFile}>
            <h3>Current File</h3>
            <div className={styles.filePreview}>
              {getTypeIcon(material.materialType, 24)}
              <span>{material.file?.originalName}</span>
              <span className={styles.fileSize}>{formatFileSize(material.file?.size)}</span>
            </div>
            <p className={styles.fileNote}>Note: To change the file, you need to delete this material and upload a new one.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.notePage}>
      {/* Header */}
      <header className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={() => navigate(-1)}
        >
          <MdArrowBack /> Back
        </button>
        {isOwner && (
          <button 
            className={styles.editModeBtn}
            onClick={() => setSearchParams({ edit: 'true' })}
          >
            <MdEdit /> Edit Material
          </button>
        )}
      </header>

      {/* Title section */}
      <div className={styles.titleSection}>
        <div className={styles.typeIconLarge}>
          {getTypeIcon(material.materialType, 32)}
        </div>
        <div className={styles.titleInfo}>
          <h1 className={styles.title}>{material.title}</h1>
          <div className={styles.metaRow}>
            <span className={styles.subjectTag}>{material.subject}</span>
            <span className={styles.typeBadge}>{material.materialType}</span>
          </div>
        </div>
      </div>

      {/* Main content - Preview left, Details right */}
      <div className={styles.mainContent}>
        {/* Left side - Preview */}
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <h2>Preview</h2>
            <div className={styles.previewActions}>
              <button 
                className={styles.previewBtn}
                onClick={() => setShowPreview(true)}
              >
                <MdFullscreen /> Fullscreen
              </button>
              <a 
                href={getPreviewUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.previewBtn}
              >
                <MdOpenInNew /> Open
              </a>
            </div>
          </div>
          
          <div className={styles.previewContainer}>
            {material.materialType === 'Image' || material.file?.mimeType?.startsWith('image/') ? (
              <img 
                src={getPreviewUrl()} 
                alt={material.title}
                className={styles.previewImage}
              />
            ) : material.materialType === 'Video' || material.file?.mimeType?.startsWith('video/') ? (
              <video 
                src={getPreviewUrl()}
                controls
                className={styles.previewVideo}
              />
            ) : material.materialType === 'PDF' || material.file?.mimeType === 'application/pdf' ? (
              <iframe
                src={`${getPreviewUrl()}#toolbar=0`}
                className={styles.previewPdf}
                title={material.title}
              />
            ) : (
              <div className={styles.previewPlaceholder}>
                {getTypeIcon(material.materialType, 64)}
                <p>Preview not available for this file type</p>
                <button 
                  className={styles.downloadBtn}
                  onClick={handleDownload}
                >
                  <MdDownload /> Download to View
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Material Details */}
        <div className={styles.materialInfo}>
          {/* Author info */}
          <div className={styles.authorSection}>
            <div className={styles.authorAvatar}>
              {material.author?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className={styles.authorInfo}>
              <span className={styles.authorName}>
                {material.author?.username || 'Unknown'}
              </span>
              <span className={styles.authorMeta}>
                {material.author?.university && `${material.author.university} • `}
                {formatDate(material.createdAt)}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <MdVisibility />
              <span>{material.views || 0} views</span>
            </div>
            <div className={styles.statItem}>
              <MdFavorite />
              <span>{likesCount} likes</span>
            </div>
            <div className={styles.statItem}>
              <MdBookmark />
              <span>{savesCount} saves</span>
            </div>
            <div className={styles.statItem}>
              <MdDownload />
              <span>{material.downloads || 0} downloads</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className={styles.actionButtons}>
            <button 
              className={`${styles.actionBtn} ${isLiked ? styles.actionBtnActive : ''}`}
              onClick={handleLike}
              disabled={actionLoading === 'like'}
            >
              {isLiked ? <MdFavorite /> : <MdFavoriteBorder />}
              {isLiked ? 'Liked' : 'Like'}
            </button>
            <button 
              className={`${styles.actionBtn} ${isSaved ? styles.actionBtnActive : ''}`}
              onClick={handleSave}
              disabled={actionLoading === 'save'}
            >
              {isSaved ? <MdBookmark /> : <MdBookmarkBorder />}
              {isSaved ? 'Saved' : 'Save'}
            </button>
            <button 
              className={styles.actionBtn}
              onClick={handleDownload}
              disabled={actionLoading === 'download'}
            >
              <MdDownload />
              Download
            </button>
            <button 
              className={styles.actionBtn}
              onClick={handleShare}
            >
              <MdShare />
              Share
            </button>
          </div>

          {/* Description */}
          {material.description && (
            <div className={styles.descriptionSection}>
              <h3>Description</h3>
              <p>{material.description}</p>
            </div>
          )}

          {/* Tags */}
          {material.tags && material.tags.length > 0 && (
            <div className={styles.tagsSection}>
              <h4>Tags</h4>
              <div className={styles.tagsList}>
                {material.tags.map((tag, index) => (
                  <span key={index} className={styles.tag}>#{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* File info */}
          <div className={styles.fileInfoSection}>
            <h4>File Information</h4>
            <div className={styles.fileDetails}>
              <div className={styles.fileDetail}>
                <span className={styles.fileLabel}>Filename:</span>
                <span>{material.file?.originalName}</span>
              </div>
              <div className={styles.fileDetail}>
                <span className={styles.fileLabel}>Size:</span>
                <span>{formatFileSize(material.file?.size)}</span>
              </div>
              <div className={styles.fileDetail}>
                <span className={styles.fileLabel}>Type:</span>
                <span>{material.file?.mimeType}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comments section */}
      <div className={styles.commentsSection}>
        <h2 className={styles.commentsTitle}>
          Comments ({comments.length})
        </h2>

        {/* Add comment form */}
        <form className={styles.commentForm} onSubmit={handleAddComment}>
          {replyingTo && (
            <div className={styles.replyingTo}>
              Replying to {replyingTo.author?.username}
              <button 
                type="button"
                onClick={() => setReplyingTo(null)}
              >
                <MdClose />
              </button>
            </div>
          )}
          <div className={styles.commentInputWrapper}>
            <textarea
              className={styles.commentInput}
              placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
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

        {/* Comments list */}
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen preview modal */}
      {showPreview && (
        <div className={styles.previewModal} onClick={() => setShowPreview(false)}>
          <button className={styles.closeModal}>
            <MdClose />
          </button>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            {material.materialType === 'Image' || material.file?.mimeType?.startsWith('image/') ? (
              <img src={getPreviewUrl()} alt={material.title} />
            ) : material.materialType === 'Video' || material.file?.mimeType?.startsWith('video/') ? (
              <video src={getPreviewUrl()} controls autoPlay />
            ) : material.materialType === 'PDF' ? (
              <iframe src={getPreviewUrl()} title={material.title} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

// Comment Item Component
function CommentItem({ comment, onReply, onDelete, formatTime, parentId = null }) {
  const [showActions, setShowActions] = useState(false);

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
          <button onClick={() => onDelete(comment._id, parentId)}>
            <MdDelete /> Delete
          </button>
        </div>

        {/* Replies */}
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function for file size
function formatFileSize(bytes) {
  if (!bytes) return 'Unknown';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default NotePage;

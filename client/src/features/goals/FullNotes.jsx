import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import styles from "./FullNotes.module.css";
import goalService from "../../services/goalService";
import { extractTextContent } from "../../utils/parseContent";

export default function FullNotes({ notes = [], topics = [], goalId }) {
  const [selectedNote, setSelectedNote] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [error, setError] = useState(null);
  const [readNotes, setReadNotes] = useState(new Set());
  const viewStartTime = useRef(null);
  const currentTopic = useRef(null);
  const scrollRef = useRef(null);
  const maxScrollPercent = useRef(0);
  const completionSent = useRef(false);

  // Build initial set of read note IDs from readBy data
  useEffect(() => {
    const ids = new Set();
    for (const note of notes) {
      if (note.readBy?.some(r => r.userId)) {
        ids.add(note._id);
      }
    }
    setReadNotes(ids);
  }, [notes]);

  // --- Scroll tracking ---
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const scrollPercent = Math.round(
      ((el.scrollTop + el.clientHeight) / el.scrollHeight) * 100
    );
    if (scrollPercent > maxScrollPercent.current) {
      maxScrollPercent.current = scrollPercent;
    }

    // Check completion: scrolled ≥80% AND spent ≥120 seconds
    if (!completionSent.current && maxScrollPercent.current >= 80 && viewStartTime.current) {
      const elapsed = (Date.now() - viewStartTime.current) / 1000;
      if (elapsed >= 120) {
        completionSent.current = true;
        const topicName = currentTopic.current;
        goalService.trackActivity(goalId, topicName, 'note_completed', {
          duration: Math.round(elapsed),
          scrollPercent: maxScrollPercent.current
        }).catch(() => {});
        // Mark locally
        if (selectedNote) {
          setReadNotes(prev => new Set(prev).add(selectedNote._id));
        }
      }
    }
  }, [goalId, selectedNote]);

  // --- ML Activity Tracking: note view + time spent ---
  useEffect(() => {
    if (selectedNote && goalId) {
      const topicName = selectedNote.topic;
      currentTopic.current = topicName;
      viewStartTime.current = Date.now();
      maxScrollPercent.current = 0;
      completionSent.current = readNotes.has(selectedNote._id); // don't re-send if already read

      // Log note_view event
      goalService.trackActivity(goalId, topicName, 'note_view').catch(() => { });

      // Cleanup: log time spent when navigating away
      return () => {
        if (viewStartTime.current && currentTopic.current) {
          const duration = Math.round((Date.now() - viewStartTime.current) / 1000);
          if (duration >= 5) { // Only log if they spent at least 5 seconds
            goalService.trackActivity(goalId, currentTopic.current, 'note_time_spent', { duration }).catch(() => { });
          }
        }
        viewStartTime.current = null;
        currentTopic.current = null;
      };
    }
  }, [selectedNote, goalId]);

  // Generate notes for a topic
  const handleGenerateNotes = async (topicName) => {
    try {
      setGenerating(topicName);
      setError(null);
      await goalService.generateNotes(goalId, topicName);
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Failed to generate notes');
    } finally {
      setGenerating(null);
    }
  };

  // Topics without notes
  const topicsWithoutNotes = topics.filter(
    topic => !notes.some(note => note.topic === topic.name)
  );

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  /** Extract usable content from note data (handles all storage formats) */
  const getTextContent = (note) => extractTextContent(note, note.topic);

  /** Get a plain text preview for note cards */
  const getPreview = (content) => {
    if (content.keyPoints?.length > 0) return content.keyPoints[0];
    const raw = (content.content || '')
      .replace(/#{1,6}\s*/g, '')      // remove headings
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1') // remove bold/italic
      .replace(/[`\[\]()]/g, '')      // remove code/link chars
      .trim();
    return raw.length > 100 ? raw.substring(0, 100) + '...' : raw || 'Click to view notes';
  };

  // ── Full note view ──
  if (selectedNote) {
    const content = getTextContent(selectedNote);
    const isRead = readNotes.has(selectedNote._id);

    return (
      <section className={styles.card}>
        <header className={styles.header}>
          <button onClick={() => setSelectedNote(null)} className={styles.backButton}>
            ← Back to Notes
          </button>
          {isRead && <span className={styles.readBadgeHeader}>✓ Read</span>}
        </header>
        <article className={styles.fullNoteContent} ref={scrollRef} onScroll={handleScroll}>
          <h2 className={styles.fullNoteTitle}>
            {content.title || selectedNote.topic}
          </h2>

          {content.keyPoints?.length > 0 && (
            <div className={styles.keyPoints}>
              <h3>📌 Key Points</h3>
              <ul>
                {content.keyPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Render markdown content properly */}
          <div className={styles.noteMarkdown}>
            <ReactMarkdown>{content.content || 'No content available'}</ReactMarkdown>
          </div>

          {/* Sections */}
          {content.sections?.length > 0 && (
            <div className={styles.sectionsContainer}>
              <h3>📑 Sections</h3>
              {content.sections.map((section, i) => (
                <div key={i} className={styles.sectionBlock}>
                  <h4>{section.heading}</h4>
                  <ReactMarkdown>{section.content || ''}</ReactMarkdown>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    );
  }

  // ── Notes list view ──
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconCircle}>📘</div>
          <h2 className={styles.title}>Full Notes</h2>
        </div>
      </header>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {notes.length === 0 && topicsWithoutNotes.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📝</div>
          <h3>No Notes Yet</h3>
          <p>Notes will be generated from your study materials.</p>
        </div>
      ) : (
        <>
          {notes.length > 0 && (
            <div className={styles.notesRow}>
              {notes.map((note) => {
                const content = getTextContent(note);
                const isRead = readNotes.has(note._id);
                return (
                  <article
                    key={note._id}
                    className={`${styles.noteCard} ${isRead ? styles.noteCardRead : ''}`}
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className={styles.noteIcon}>{isRead ? '✅' : '📖'}</div>
                    <h3 className={styles.noteTitle}>
                      {content.title || note.topic || 'Notes'}
                    </h3>
                    <p className={styles.noteDescription}>
                      {getPreview(content)}
                    </p>
                    <div className={styles.noteFooter}>
                      <span className={styles.noteMeta}>{formatDate(note.createdAt)}</span>
                      <span className={styles.noteMeta}>
                        {content.sections?.length || 0} sections
                      </span>
                      {isRead && <span className={styles.readBadge}>✓ Read</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {topicsWithoutNotes.length > 0 && (
            <div className={styles.generateSection}>
              <h3 className={styles.generateTitle}>Generate Notes</h3>
              <p className={styles.generateDescription}>
                Click to generate AI notes for these topics:
              </p>
              <div className={styles.topicButtons}>
                {topicsWithoutNotes.map((topic) => (
                  <button
                    key={topic._id || topic.name}
                    className={styles.generateButton}
                    onClick={() => handleGenerateNotes(topic.name)}
                    disabled={generating === topic.name}
                  >
                    {generating === topic.name ? '⏳ Generating...' : `📝 ${topic.name}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

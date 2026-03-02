import { useState } from "react";
import ReactMarkdown from "react-markdown";
import styles from "./FullNotes.module.css";
import goalService from "../../services/goalService";
import { extractTextContent } from "../../utils/parseContent";

export default function FullNotes({ notes = [], topics = [], goalId }) {
  const [selectedNote, setSelectedNote] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [error, setError] = useState(null);

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
    
    return (
      <section className={styles.card}>
        <header className={styles.header}>
          <button onClick={() => setSelectedNote(null)} className={styles.backButton}>
            ← Back to Notes
          </button>
        </header>
        <article className={styles.fullNoteContent}>
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
                return (
                  <article 
                    key={note._id} 
                    className={styles.noteCard}
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className={styles.noteIcon}>📖</div>
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

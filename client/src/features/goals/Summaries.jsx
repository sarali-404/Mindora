import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import styles from "./Summaries.module.css";
import { MdDescription, MdEmojiEvents } from "react-icons/md";
import { extractTextContent } from "../../utils/parseContent";
import goalService from "../../services/goalService";

export default function Summaries({ summaries = [], topics = [], goalId }) {
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [error, setError] = useState(null);
  const [readSummaries, setReadSummaries] = useState(new Set());
  const viewStartTime = useRef(null);
  const currentTopic = useRef(null);
  const scrollRef = useRef(null);
  const maxScrollPercent = useRef(0);
  const completionSent = useRef(false);

  // Build initial set of read summary IDs from readBy data
  useEffect(() => {
    const ids = new Set();
    for (const s of summaries) {
      if (s.readBy?.some(r => r.userId)) {
        ids.add(s._id);
      }
    }
    setReadSummaries(ids);
  }, [summaries]);

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

    // Check completion: scrolled ≥80% AND spent ≥60 seconds (summaries are shorter)
    if (!completionSent.current && maxScrollPercent.current >= 80 && viewStartTime.current) {
      const elapsed = (Date.now() - viewStartTime.current) / 1000;
      if (elapsed >= 60) {
        completionSent.current = true;
        const topicName = currentTopic.current;
        goalService.trackActivity(goalId, topicName, 'summary_completed', {
          duration: Math.round(elapsed),
          scrollPercent: maxScrollPercent.current
        }).catch(() => {});
        if (selectedSummary) {
          setReadSummaries(prev => new Set(prev).add(selectedSummary._id));
        }
      }
    }
  }, [goalId, selectedSummary]);

  // --- ML Activity Tracking: summary view + time spent ---
  useEffect(() => {
    if (selectedSummary && goalId) {
      const topicName = selectedSummary.topic;
      currentTopic.current = topicName;
      viewStartTime.current = Date.now();
      maxScrollPercent.current = 0;
      completionSent.current = readSummaries.has(selectedSummary._id);

      // Log summary_view event
      goalService.trackActivity(goalId, topicName, 'summary_view').catch(() => { });

      // Cleanup: log time spent when navigating away
      return () => {
        if (viewStartTime.current && currentTopic.current) {
          const duration = Math.round((Date.now() - viewStartTime.current) / 1000);
          if (duration >= 5) {
            goalService.trackActivity(goalId, currentTopic.current, 'summary_time_spent', { duration }).catch(() => { });
          }
        }
        viewStartTime.current = null;
        currentTopic.current = null;
      };
    }
  }, [selectedSummary, goalId]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  /** Extract usable content (handles all storage formats) */
  const getTextContent = (item) => extractTextContent(item, item.topic);

  // Generate summary for a topic
  const handleGenerateSummary = async (topicName) => {
    try {
      setGenerating(topicName);
      setError(null);
      await goalService.generateSummary(goalId, topicName);
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Failed to generate summary');
    } finally {
      setGenerating(null);
    }
  };

  // Topics without summaries
  const topicsWithoutSummaries = topics.filter(
    topic => !summaries.some(s => s.topic === topic.name)
  );

  // View full summary
  if (selectedSummary) {
    const content = getTextContent(selectedSummary);
    const isRead = readSummaries.has(selectedSummary._id);

    return (
      <section className={styles.card}>
        <header className={styles.header}>
          <button
            onClick={() => setSelectedSummary(null)}
            className={styles.backButton}
          >
            ← Back to Summaries
          </button>
          {isRead && <span className={styles.readBadgeHeader}>✓ Read</span>}
        </header>
        <article className={styles.fullSummary} ref={scrollRef} onScroll={handleScroll}>
          <h2 className={styles.fullTitle}>
            {content.title || 'Summary'}
          </h2>

          {content.quickReview && (
            <div className={styles.quickReview}>
              <strong>Quick Review:</strong> {content.quickReview}
            </div>
          )}

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

          <div className={styles.summaryMarkdown}>
            <ReactMarkdown>{content.content || 'No content available'}</ReactMarkdown>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconCircle}><MdDescription size={20} style={{ color: '#3b82f6' }} /></div>
          <h2 className={styles.title}>Summaries</h2>
        </div>
      </header>

      {summaries.length === 0 && topicsWithoutSummaries.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h3>No Summaries Yet</h3>
          <p>AI summaries will be generated from your study materials.</p>
        </div>
      ) : (
        <>
          {error && <div className={styles.errorBanner}>{error}</div>}

          {summaries.length > 0 && (
            <div className={styles.list}>
              {summaries.map((item) => {
                const content = getTextContent(item);
                const isRead = readSummaries.has(item._id);
                return (
                  <article
                    key={item._id}
                    className={`${styles.summaryRow} ${isRead ? styles.summaryRowRead : ''}`}
                    onClick={() => setSelectedSummary(item)}
                  >
                    <div className={styles.iconBadge}>{isRead ? <span style={{ fontSize: '1rem' }}>✅</span> : <MdEmojiEvents size={18} style={{ color: '#f59e0b' }} />}</div>
                    <div className={styles.summaryContent}>
                      <div className={styles.summaryTop}>
                        <h3 className={styles.summaryTitle}>
                          {content.title || item.topic || 'Summary'}
                        </h3>
                        <div className={styles.summaryMeta}>
                          {isRead && <span className={styles.readBadge}>✓ Read</span>}
                          <span className={styles.summaryDate}>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                      <p className={styles.summaryText}>
                        {content.quickReview ||
                          content.keyPoints?.[0] ||
                          'Click to view summary'}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {topicsWithoutSummaries.length > 0 && (
            <div className={styles.generateSection}>
              <h3 className={styles.generateTitle}>Generate Summaries</h3>
              <p className={styles.generateDescription}>
                Click to generate AI summaries for these topics:
              </p>
              <div className={styles.topicButtons}>
                {topicsWithoutSummaries.map((topic) => (
                  <button
                    key={topic._id || topic.name}
                    className={styles.generateButton}
                    onClick={() => handleGenerateSummary(topic.name)}
                    disabled={generating === topic.name}
                  >
                    {generating === topic.name ? '⏳ Generating...' : `📋 ${topic.name}`}
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

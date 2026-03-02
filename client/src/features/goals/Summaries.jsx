import { useState } from "react";
import ReactMarkdown from "react-markdown";
import styles from "./Summaries.module.css";
import { MdDescription, MdEmojiEvents } from "react-icons/md";
import { extractTextContent } from "../../utils/parseContent";
import goalService from "../../services/goalService";

export default function Summaries({ summaries = [], topics = [], goalId }) {
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [error, setError] = useState(null);

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

    return (
      <section className={styles.card}>
        <header className={styles.header}>
          <button 
            onClick={() => setSelectedSummary(null)}
            className={styles.backButton}
          >
            ← Back to Summaries
          </button>
        </header>
        <article className={styles.fullSummary}>
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
                return (
                  <article 
                    key={item._id} 
                    className={styles.summaryRow}
                    onClick={() => setSelectedSummary(item)}
                  >
                    <div className={styles.iconBadge}><MdEmojiEvents size={18} style={{ color: '#f59e0b' }} /></div>
                    <div className={styles.summaryContent}>
                      <div className={styles.summaryTop}>
                        <h3 className={styles.summaryTitle}>
                          {content.title || item.topic || 'Summary'}
                        </h3>
                        <span className={styles.summaryDate}>{formatDate(item.createdAt)}</span>
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

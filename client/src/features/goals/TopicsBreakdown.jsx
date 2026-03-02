import { useState } from "react";
import styles from "./TopicsBreakdown.module.css";
import { MdEmojiEvents, MdWarningAmber, MdAutoAwesome } from "react-icons/md";

export default function TopicsBreakdown({ 
  topics = [], 
  onProgressUpdate, 
  goalId,
  topicsWithContent = new Set(),
  onGenerateContent 
}) {
  // Identify weak topics (low progress or low quiz scores)
  const weakTopics = topics.filter(t => 
    t.progress < 50 || (t.averageScore && t.averageScore < 60)
  );

  // No topics yet
  if (topics.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📚</div>
        <h3>No Topics Yet</h3>
        <p>AI is analyzing your materials to extract topics. This may take a few minutes.</p>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {/* Left: topics */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.iconCircle}><MdEmojiEvents size={20} style={{ color: '#10b981' }} /></div>
          <h2 className={styles.cardTitle}>Topics Breakdown</h2>
        </div>

        <div className={styles.sections}>
          {topics.map((topic, index) => (
            <TopicRow 
              key={topic._id || index} 
              topic={topic}
              onProgressUpdate={onProgressUpdate}
              hasContent={topicsWithContent.has(topic.name)}
              onGenerateContent={onGenerateContent}
            />
          ))}
        </div>
      </section>

      {/* Right: weak areas */}
      <aside className={styles.weakCard}>
        <div className={styles.weakHeader}>
          <div className={styles.warningIcon}><MdWarningAmber size={18} style={{ color: '#f59e0b' }} /></div>
          <h3 className={styles.weakTitle}>Weak Areas</h3>
        </div>

        {weakTopics.length === 0 ? (
          <div className={styles.noWeakAreas}>
            <p>Great job! No weak areas identified yet.</p>
          </div>
        ) : (
          <div className={styles.weakList}>
            {weakTopics.map((topic, index) => (
              <WeakArea key={topic._id || index} topic={topic} />
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function TopicRow({ topic, onProgressUpdate, hasContent, onGenerateContent }) {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '#10b981';
      case 'hard': return '#ef4444';
      default: return '#f59e0b';
    }
  };

  const handleGenerateContent = async () => {
    setGenerating(true);
    setError(null);
    try {
      await onGenerateContent(topic.name, false);
    } catch (err) {
      setError(err.message || 'Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={styles.sectionRow}>
      <div className={styles.sectionHeader}>
        <button 
          type="button" 
          className={styles.chevronButton}
          onClick={() => setExpanded(!expanded)}
          style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}
        >
          &gt;
        </button>
        <span className={styles.sectionTitle}>{topic.name}</span>
        <span 
          className={styles.difficultyBadge}
          style={{ backgroundColor: getDifficultyColor(topic.difficultyLevel) }}
        >
          {topic.difficultyLevel || 'medium'}
        </span>
        
        {/* Content status indicator */}
        {hasContent ? (
          <span className={styles.contentBadge} title="Content generated">
            ✓
          </span>
        ) : (
          <button
            className={styles.generateButton}
            onClick={handleGenerateContent}
            disabled={generating}
            title="Generate notes and quiz for this topic"
          >
            {generating ? (
              <>
                <span className={styles.spinnerSmall}></span>
                Generating...
              </>
            ) : (
              <>
                <MdAutoAwesome size={14} />
                Generate
              </>
            )}
          </button>
        )}
        
        <span className={styles.sectionPercent}>{topic.progress || 0}%</span>
      </div>

      <ProgressBar value={topic.progress || 0} />

      {expanded && (
        <div className={styles.topicDescription}>
          {topic.description && <p>{topic.description}</p>}

          {topic.subTopics?.length > 0 && (
            <div className={styles.subTopicsList}>
              <h4 className={styles.subTopicsTitle}>Sub-topics</h4>
              {topic.subTopics.map((sub, i) => (
                <div key={i} className={styles.subTopicItem}>
                  <span className={styles.subTopicDot} />
                  <div>
                    <span className={styles.subTopicName}>{sub.name}</span>
                    {sub.description && (
                      <p className={styles.subTopicDesc}>{sub.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {topic.quizAttempts > 0 && (
            <div className={styles.topicStats}>
              <span>Quiz attempts: {topic.quizAttempts}</span>
              <span>Avg score: {topic.averageScore || 'N/A'}%</span>
            </div>
          )}
          {error && <p className={styles.errorText}>{error}</p>}
          {!hasContent && !generating && (
            <p className={styles.noContentText}>
              Click "Generate" to create notes and quiz for this topic.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ value, small = false }) {
  return (
    <div
      className={`${styles.progressOuter} ${
        small ? styles.progressOuterSmall : ""
      }`}
    >
      <div
        className={styles.progressInner}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function WeakArea({ topic }) {
  const level = topic.progress < 30 || (topic.averageScore && topic.averageScore < 50) ? 'High' : 'Medium';
  
  const getRecommendation = () => {
    if (topic.averageScore && topic.averageScore < 60) {
      return `Quiz average is ${topic.averageScore}%. Review notes and try again.`;
    }
    if (topic.progress < 30) {
      return 'Start with the basics and build up gradually.';
    }
    return 'Continue practicing to improve your understanding.';
  };

  return (
    <div className={styles.weakItem}>
      <div className={styles.weakTopRow}>
        <h4 className={styles.weakItemTitle}>{topic.name}</h4>
        <span
          className={`${styles.badge} ${
            level === "High" ? styles.badgeHigh : styles.badgeMedium
          }`}
        >
          {level}
        </span>
      </div>
      <ProgressBar value={topic.progress || 0} small />
      <p className={styles.weakDescription}>{getRecommendation()}</p>
    </div>
  );
}

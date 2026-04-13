import { useState, useEffect } from "react";
import styles from "./TopicsBreakdown.module.css";
import { MdEmojiEvents, MdWarningAmber, MdAutoAwesome, MdMenuBook, MdTrendingUp, MdTrendingDown, MdAssignment, MdCheckCircle } from "react-icons/md";
import goalService from "../../services/goalService";

export default function TopicsBreakdown({ 
  topics = [], 
  onProgressUpdate, 
  goalId,
  topicsWithContent = new Set(),
  onGenerateContent 
}) {
  const [analytics, setAnalytics] = useState(null);

  // Fetch topic analytics
  useEffect(() => {
    if (!goalId) return;
    goalService.getTopicAnalytics(goalId)
      .then(res => { if (res.success) setAnalytics(res.data); })
      .catch(() => {});
  }, [goalId]);

  // Identify weak topics (low progress or low quiz scores)
  const weakTopics = topics.filter(t => 
    t.progress < 50 || (t.averageScore && t.averageScore < 60)
  );

  // No topics yet
  if (topics.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}><MdMenuBook size={32} /></div>
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
              analytics={analytics?.[topic.name]}
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

function TopicRow({ topic, onProgressUpdate, hasContent, onGenerateContent, analytics }) {
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

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <MdTrendingUp size={14} color="#10b981" />;
    if (trend === 'declining') return <MdTrendingDown size={14} color="#ef4444" />;
    return null;
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds < 60) return seconds ? `${seconds}s` : '0m';
    const min = Math.round(seconds / 60);
    return min >= 60 ? `${Math.round(min / 60)}h ${min % 60}m` : `${min}m`;
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

        {/* Reading status icons */}
        {analytics && (
          <span className={styles.readingIcons}>
            <span title={`Notes: ${analytics.notes.read}/${analytics.notes.total} read`}>
              {analytics.notes.total > 0 ? (<><MdMenuBook size={14} color={analytics.notes.read >= analytics.notes.total ? '#10b981' : '#6b7280'} />{analytics.notes.read >= analytics.notes.total && <MdCheckCircle size={10} color="#10b981" />}</>) : ''}
            </span>
            <span title={`Summaries: ${analytics.summaries.read}/${analytics.summaries.total} read`}>
              {analytics.summaries.total > 0 ? (<><MdAssignment size={14} color={analytics.summaries.read >= analytics.summaries.total ? '#10b981' : '#6b7280'} />{analytics.summaries.read >= analytics.summaries.total && <MdCheckCircle size={10} color="#10b981" />}</>) : ''}
            </span>
            {analytics.quizzes.trend && analytics.quizzes.trend !== 'stable' && (
              <span title={`Quiz trend: ${analytics.quizzes.trend}`}>{getTrendIcon(analytics.quizzes.trend)}</span>
            )}
            {analytics.needsAttention && (
              <span className={styles.attentionBadge} title="Needs attention">!</span>
            )}
          </span>
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

          {/* Detailed analytics */}
          {analytics && (
            <div className={styles.analyticsGrid}>
              <div className={styles.analyticItem}>
                <span className={styles.analyticLabel}>Study Time</span>
                <span className={styles.analyticValue}>{formatTime(analytics.totalStudyTime)}</span>
              </div>
              <div className={styles.analyticItem}>
                <span className={styles.analyticLabel}>Notes</span>
                <span className={styles.analyticValue}>{analytics.notes.read}/{analytics.notes.total} read</span>
              </div>
              <div className={styles.analyticItem}>
                <span className={styles.analyticLabel}>Summaries</span>
                <span className={styles.analyticValue}>{analytics.summaries.read}/{analytics.summaries.total} read</span>
              </div>
              <div className={styles.analyticItem}>
                <span className={styles.analyticLabel}>Quizzes</span>
                <span className={styles.analyticValue}>
                  {analytics.quizzes.attempts > 0 ? `${analytics.quizzes.avgScore}% avg (${analytics.quizzes.attempts})` : 'None'}
                </span>
              </div>
              <div className={styles.analyticItem}>
                <span className={styles.analyticLabel}>Essays</span>
                <span className={styles.analyticValue}>
                  {analytics.essays.submissions > 0 ? `${analytics.essays.avgScore}% avg (${analytics.essays.submissions})` : 'None'}
                </span>
              </div>
              <div className={styles.analyticItem}>
                <span className={styles.analyticLabel}>Engagement</span>
                <span className={styles.analyticValue}>{analytics.engagementScore}%</span>
              </div>
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

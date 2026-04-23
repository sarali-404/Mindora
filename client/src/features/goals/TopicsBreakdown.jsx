import { useState, useEffect } from "react";
import styles from "./TopicsBreakdown.module.css";
import { MdEmojiEvents, MdWarningAmber, MdAutoAwesome, MdMenuBook, MdTrendingUp, MdTrendingDown, MdAssignment, MdCheckCircle, MdRefresh } from "react-icons/md";
import goalService from "../../services/goalService";

export default function TopicsBreakdown({ 
  topics = [], 
  onProgressUpdate, 
  goalId,
  topicsWithContent = new Set(),
  onGenerateContent 
}) {
  const [analytics, setAnalytics] = useState(null);
  const [knowledgeState, setKnowledgeState] = useState(null);
  const [ksLoading, setKsLoading] = useState(false);

  // Fetch topic analytics and knowledge state
  useEffect(() => {
    if (!goalId) return;
    goalService.getTopicAnalytics(goalId)
      .then(res => { if (res.success) setAnalytics(res.data); })
      .catch(() => {});
    fetchKnowledgeState();
  }, [goalId]);

  const fetchKnowledgeState = () => {
    setKsLoading(true);
    goalService.getKnowledgeState(goalId)
      .then(res => { if (res.data) setKnowledgeState(res.data); })
      .catch(() => {})
      .finally(() => setKsLoading(false));
  };

  // Derive weak topics: use BKT scores if available, fall back to progress/averageScore
  const weakTopics = knowledgeState
    ? knowledgeState.weakTopics
        .map(name => topics.find(t => t.name === name))
        .filter(Boolean)
    : topics.filter(t => t.progress < 50 || (t.averageScore && t.averageScore < 60));

  // Also include untouched topics (never studied) as low-priority weak areas
  const untouchedTopics = knowledgeState
    ? knowledgeState.untouchedTopics
        .map(name => topics.find(t => t.name === name))
        .filter(Boolean)
    : [];

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
          <button className={styles.ksRefreshBtn} onClick={fetchKnowledgeState} title="Refresh" disabled={ksLoading}>
            <MdRefresh size={15} className={ksLoading ? styles.spinning : ''} />
          </button>
        </div>

        {!knowledgeState && !ksLoading && (
          <p className={styles.ksHint}>Complete quizzes or read notes to unlock dynamic weak area analysis.</p>
        )}

        {weakTopics.length === 0 && (!untouchedTopics.length || !knowledgeState) ? (
          <div className={styles.noWeakAreas}>
            <p>{knowledgeState ? '🎉 No weak areas! Keep it up.' : 'No weak areas identified yet.'}</p>
          </div>
        ) : (
          <div className={styles.weakList}>
            {weakTopics.map((topic, index) => (
              <WeakArea
                key={topic._id || index}
                topic={topic}
                topicScore={knowledgeState?.topicScores?.[topic.name]}
              />
            ))}
            {untouchedTopics.length > 0 && (
              <>
                {weakTopics.length > 0 && <div className={styles.weakDivider}>Not started</div>}
                {untouchedTopics.map((topic, index) => (
                  <WeakArea
                    key={`u-${topic._id || index}`}
                    topic={topic}
                    topicScore={knowledgeState?.topicScores?.[topic.name]}
                    untouched
                  />
                ))}
              </>
            )}
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

  const getDifficultyLabel = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'Beginner';
      case 'hard': return 'Advanced';
      default: return 'Intermediate';
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
          title="AI-adapted content difficulty based on your performance"
        >
          {getDifficultyLabel(topic.difficultyLevel)}
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

        {/* Reading status pills */}
        {analytics && (
          <span className={styles.readingPills}>
            {analytics.notes.total > 0 && (
              <span
                className={`${styles.readPill} ${
                  analytics.notes.read >= analytics.notes.total
                    ? styles.readPillComplete
                    : analytics.notes.read > 0
                    ? styles.readPillPartial
                    : styles.readPillNone
                }`}
                title={`Notes: ${analytics.notes.read}/${analytics.notes.total} read`}
              >
                N {analytics.notes.read}/{analytics.notes.total}
              </span>
            )}
            {analytics.summaries.total > 0 && (
              <span
                className={`${styles.readPill} ${
                  analytics.summaries.read >= analytics.summaries.total
                    ? styles.readPillComplete
                    : analytics.summaries.read > 0
                    ? styles.readPillPartial
                    : styles.readPillNone
                }`}
                title={`Summaries: ${analytics.summaries.read}/${analytics.summaries.total} read`}
              >
                S {analytics.summaries.read}/{analytics.summaries.total}
              </span>
            )}
            {analytics.essays.total > 0 && (
              <span
                className={`${styles.readPill} ${
                  analytics.essays.submissions >= analytics.essays.total
                    ? styles.readPillComplete
                    : analytics.essays.submissions > 0
                    ? styles.readPillPartial
                    : styles.readPillNone
                }`}
                title={`Essays: ${analytics.essays.submissions}/${analytics.essays.total} submitted`}
              >
                E {analytics.essays.submissions}/{analytics.essays.total}
              </span>
            )}
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

function WeakArea({ topic, topicScore, untouched = false }) {
  // Determine priority level
  const score = topicScore?.score ?? null;
  const level = untouched ? 'Untouched'
    : score !== null ? (score < 25 ? 'High' : 'Medium')
    : (topic.progress < 30 || (topic.averageScore && topic.averageScore < 50) ? 'High' : 'Medium');

  const getRecommendation = () => {
    if (untouched) return 'You haven\'t studied this topic yet. Start with the notes.';
    if (topicScore) {
      const { details } = topicScore;
      if (details.quizAttempts === 0 && details.totalActivities === 0)
        return 'No activity recorded. Read the notes and attempt the quiz.';
      if (details.quizAttempts === 0)
        return 'You\'ve read some content but haven\'t taken the quiz yet.';
      if (details.avgQuizScore < 50)
        return `Quiz average is ${details.avgQuizScore}%. Re-read the notes and retry.`;
      if (details.trend === 'declining')
        return 'Your scores are declining. Review recent material and practice more.';
      if (details.trend === 'improving')
        return `Improving! Keep going — you're at ${score}/100.`;
      return `Knowledge score is ${score}/100. More practice will push you higher.`;
    }
    if (topic.averageScore && topic.averageScore < 60)
      return `Quiz average is ${topic.averageScore}%. Review notes and try again.`;
    if (topic.progress < 30)
      return 'Start with the basics and build up gradually.';
    return 'Continue practicing to improve your understanding.';
  };

  const scoreColor = score === null ? '#6b7280'
    : score < 25 ? '#ef4444'
    : score < 40 ? '#f59e0b'
    : '#10b981';

  return (
    <div className={`${styles.weakItem} ${untouched ? styles.weakItemUntouched : ''}`}>
      <div className={styles.weakTopRow}>
        <h4 className={styles.weakItemTitle}>{topic.name}</h4>
        <span className={`${styles.badge} ${
          level === 'High' ? styles.badgeHigh
          : level === 'Untouched' ? styles.badgeUntouched
          : styles.badgeMedium
        }`}>{level}</span>
      </div>
      {score !== null ? (
        <div className={styles.weakScoreRow}>
          <div className={styles.weakScoreBar}>
            <div className={styles.weakScoreFill} style={{ width: `${score}%`, backgroundColor: scoreColor }} />
          </div>
          <span className={styles.weakScoreNum} style={{ color: scoreColor }}>{score}</span>
        </div>
      ) : (
        <ProgressBar value={topic.progress || 0} small />
      )}
      {topicScore?.details?.trend && topicScore.details.trend !== 'stable' && (
        <div className={styles.weakTrend}>
          {topicScore.details.trend === 'improving'
            ? <MdTrendingUp size={13} color="#10b981" />
            : <MdTrendingDown size={13} color="#ef4444" />}
          <span style={{ color: topicScore.details.trend === 'improving' ? '#10b981' : '#ef4444' }}>
            {topicScore.details.trend}
          </span>
        </div>
      )}
      <p className={styles.weakDescription}>{getRecommendation()}</p>

      {/* Wrong answers stat from quiz history */}
      {topicScore?.details?.totalAnswerCount > 0 && (
        <div className={styles.weakQuizStat}>
          <span className={styles.weakQuizWrong}>
            ✗ {topicScore.details.wrongAnswerCount}/{topicScore.details.totalAnswerCount} questions wrong
          </span>
        </div>
      )}

      {/* Sub-topics checklist */}
      {topic.subTopics?.length > 0 && (
        <div className={styles.weakSubTopics}>
          <p className={styles.weakSubTopicsLabel}>Sub-topics to review:</p>
          <ul className={styles.weakSubTopicsList}>
            {topic.subTopics.map((st, i) => (
              <li key={i} className={styles.weakSubTopicItem}>
                <span className={styles.weakSubTopicDot} />
                {st.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

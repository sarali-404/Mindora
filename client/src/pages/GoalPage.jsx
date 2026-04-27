import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./GoalPage.module.css";
import TopicsBreakdown from "../features/goals/TopicsBreakdown";
import FullNotes from "../features/goals/FullNotes";
import Summaries from "../features/goals/Summaries";
import Quizzes from "../features/goals/Quizzes";
import EssayQuestions from "../features/goals/EssayQuestions";
import KnowledgeDashboard from "../features/goals/KnowledgeDashboard";
import { MdRocketLaunch, MdMenuBook, MdDelete, MdCheckCircle, MdWarning, MdError, MdPsychology, MdHourglassTop, MdCalendarMonth, MdFlag } from "react-icons/md";
import goalService from "../services/goalService";

export default function GoalPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("topics");
  const [goal, setGoal] = useState(null);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Deadline-passed actions state
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendDate, setExtendDate] = useState('');
  const [updatingGoal, setUpdatingGoal] = useState(false);

  // ML state
  const [difficultySuggestions, setDifficultySuggestions] = useState([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());
  const [regenerating, setRegenerating] = useState(null);
  const [healthData, setHealthData] = useState(null);

  // Fetch goal data
  const fetchGoal = async () => {
    try {
      const response = await goalService.getGoal(goalId);
      if (response.success) {
        setGoal(response.data.goal);
        setContent(response.data.content || []);
      }
    } catch (err) {
      console.error('Fetch goal error:', err);
      setError(err.message || 'Failed to load goal');
    }
  };

  // Initial fetch
  useEffect(() => {
    const initialFetch = async () => {
      setLoading(true);
      setError(null);
      await fetchGoal();
      setLoading(false);
    };

    if (goalId) {
      initialFetch();
    }
  }, [goalId]);

  // Poll for updates while processing
  useEffect(() => {
    if (!goal) return;

    const isProcessing = goal.aiProcessingStatus &&
      !['completed', 'failed'].includes(goal.aiProcessingStatus);

    if (isProcessing) {
      const pollInterval = setInterval(() => {
        console.log('Polling for goal updates...');
        fetchGoal();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(pollInterval);
    }
  }, [goal?.aiProcessingStatus, goalId]);

  // Fetch ML data once goal is loaded and processing is complete
  useEffect(() => {
    if (!goal || goal.aiProcessingStatus !== 'completed') return;

    // Difficulty suggestions
    goalService.getDifficultySuggestions(goalId)
      .then(res => { if (res.success) setDifficultySuggestions(res.data || []); })
      .catch(() => {});

    // Health data: predictions + knowledge state
    Promise.all([
      goalService.getPredictions(goalId).catch(() => null),
      goalService.getKnowledgeState(goalId).catch(() => null)
    ]).then(([predictions, knowledge]) => {
      if (predictions?.data || knowledge?.data) {
        setHealthData({
          examReadiness: predictions?.data?.examReadiness?.readiness ?? null,
          overallKnowledge: knowledge?.data?.overallScore ?? null,
          overallTrend: knowledge?.data?.overallTrend ?? null,
          weakCount: knowledge?.data?.weakTopics?.length ?? 0,
          untouchedCount: knowledge?.data?.untouchedTopics?.length ?? 0
        });
      }
    });
  }, [goal?.aiProcessingStatus, goalId]);

  // Handle regeneration from difficulty suggestion
  const handleRegenerate = async (suggestion) => {
    const key = `${suggestion.topicName}-${suggestion.direction}`;
    setRegenerating(key);
    try {
      for (const contentType of suggestion.contentTypes) {
        await goalService.regenerateContent(goalId, suggestion.topicName, contentType);
      }
      setDismissedSuggestions(prev => new Set(prev).add(key));
      await fetchGoal();
    } catch (err) {
      console.error('Regeneration error:', err);
    } finally {
      setRegenerating(null);
    }
  };

  const dismissSuggestion = (suggestion) => {
    const key = `${suggestion.topicName}-${suggestion.direction}`;
    setDismissedSuggestions(prev => new Set(prev).add(key));
  };

  // Calculate days remaining
  const calculateDaysRemaining = () => {
    if (!goal?.deadline) return null;
    const today = new Date();
    const deadline = new Date(goal.deadline);
    const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calculate completed topics
  const getCompletedTopicsCount = () => {
    if (!goal?.topics) return 0;
    return goal.topics.filter(t => t.progress === 100).length;
  };

  // Filter content by type
  const getContentByType = (type) => {
    return content.filter(c => c.contentType === type);
  };

  // Handle topic progress update
  const handleTopicProgressUpdate = async (topicId, progress) => {
    try {
      const response = await goalService.updateTopicProgress(goalId, topicId, { progress });
      if (response.success) {
        setGoal(response.data);
      }
    } catch (err) {
      console.error('Update progress error:', err);
    }
  };

  // Handle generating content for a topic
  const handleGenerateTopicContent = async (topicName, includeEssay = false) => {
    try {
      const response = await goalService.generateTopicContent(goalId, topicName, includeEssay);
      if (response.success) {
        // Refresh data to get new content
        await fetchGoal();
        return response.data;
      }
    } catch (err) {
      console.error('Generate content error:', err);
      throw err;
    }
  };

  // Check if a topic has content generated
  const getTopicsWithContent = () => {
    const topicsSet = new Set();
    content.forEach(c => {
      if (c.topic && (c.contentType === 'notes' || c.contentType === 'quiz')) {
        topicsSet.add(c.topic);
      }
    });
    return topicsSet;
  };

  // Auto-complete goal with coverage when deadline passes (no extension chosen)
  const handleAutoComplete = async () => {
    const coverage = goal.progress || 0;
    try {
      setUpdatingGoal(true);
      const res = await goalService.updateGoal(goalId, {
        status: 'completed',
        completedCoverage: coverage
      });
      if (res.success) setGoal(res.data);
    } catch (err) {
      setError(err.message || 'Failed to complete goal');
    } finally {
      setUpdatingGoal(false);
    }
  };

  // Extend deadline
  const handleExtendDeadline = async () => {
    if (!extendDate) return;
    try {
      setUpdatingGoal(true);
      const res = await goalService.updateGoal(goalId, { deadline: new Date(extendDate).toISOString() });
      if (res.success) {
        setGoal(res.data);
        setShowExtendModal(false);
        setExtendDate('');
      }
    } catch (err) {
      setError(err.message || 'Failed to extend deadline');
    } finally {
      setUpdatingGoal(false);
    }
  };

  // Delete goal
  const handleDeleteGoal = async () => {
    try {
      setDeleting(true);
      await goalService.deleteGoal(goalId);
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to delete goal');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading goal...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <h2>Unable to load goal</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/app/dashboard')} className={styles.backButton}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // No goal found
  if (!goal) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <h2>Goal not found</h2>
          <button onClick={() => navigate('/app/dashboard')} className={styles.backButton}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const daysRemaining = calculateDaysRemaining();
  const completedTopics = getCompletedTopicsCount();
  const totalTopics = goal.topics?.length || 0;

  return (
    <div className={styles.page}>
      {/* Processing status banner */}
      {goal.aiProcessingStatus && goal.aiProcessingStatus !== 'completed' && (
        <div className={styles.processingBanner}>
          <span className={styles.processingIcon}><MdHourglassTop size={18} /></span>
          <span>
            {goal.aiProcessingStatus === 'extracting' && 'Extracting text from your materials...'}
            {goal.aiProcessingStatus === 'analyzing' && 'AI is analyzing your materials...'}
            {goal.aiProcessingStatus === 'generating' && 'Generating study content...'}
            {goal.aiProcessingStatus === 'pending' && 'Preparing to process your materials...'}
            {goal.aiProcessingStatus === 'failed' && `Processing failed: ${goal.aiProcessingError || 'Unknown error'}`}
          </span>
        </div>
      )}

      {/* Difficulty suggestion banners */}
      {difficultySuggestions
        .filter(s => !dismissedSuggestions.has(`${s.topicName}-${s.direction}`))
        .map((suggestion, i) => {
          const key = `${suggestion.topicName}-${suggestion.direction}`;
          return (
            <div key={i} className={styles.suggestionBanner}>
              <div className={styles.suggestionContent}>
                <span className={styles.suggestionIcon}>
                  {suggestion.direction === 'harder' ? <MdRocketLaunch size={20} /> : <MdMenuBook size={20} />}
                </span>
                <div>
                  <strong>{suggestion.topicName}</strong>
                  <p className={styles.suggestionText}>{suggestion.reason}</p>
                </div>
              </div>
              <div className={styles.suggestionActions}>
                <button
                  className={styles.regenerateButton}
                  onClick={() => handleRegenerate(suggestion)}
                  disabled={regenerating === key}
                >
                  {regenerating === key ? 'Regenerating...' : `Regenerate (${suggestion.suggestedDifficulty})`}
                </button>
                <button
                  className={styles.dismissButton}
                  onClick={() => dismissSuggestion(suggestion)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        })}

      {/* Deadline passed banner — only for active goals past their deadline */}
      {daysRemaining !== null && daysRemaining <= 0 && goal.status === 'active' && (
        <div className={styles.deadlineBanner}>
          <div className={styles.deadlineBannerLeft}>
            <MdHourglassTop size={20} className={styles.deadlineIcon} />
            <div>
              <strong>
                Deadline passed{goal.progress > 0 ? ` — ${goal.progress}% covered` : ''}
              </strong>
              <p>
                This goal was due {formatDate(goal.deadline)}.
                {goal.progress >= 80
                  ? ' You\'re nearly done — complete it or extend to finish up.'
                  : ' Choose how you\'d like to proceed.'}
              </p>
            </div>
          </div>
          <div className={styles.deadlineBannerActions}>
            <button
              className={styles.completeBtn}
              onClick={handleAutoComplete}
              disabled={updatingGoal}
              title={`Complete with ${goal.progress || 0}% topic coverage`}
            >
              <MdFlag size={15} />
              Complete ({goal.progress || 0}%)
            </button>
            <button
              className={styles.extendBtn}
              onClick={() => setShowExtendModal(true)}
              disabled={updatingGoal}
            >
              <MdCalendarMonth size={15} />
              Extend Deadline
            </button>
            <button
              className={styles.deleteDeadlineBtn}
              onClick={() => setShowDeleteConfirm(true)}
              disabled={updatingGoal}
            >
              <MdDelete size={15} />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Header card */}
      <section className={styles.headerCard}>
        <div className={styles.topRow}>
          <div>
            <span className={styles.subjectPill}>{goal.subject}</span>
            <h1 className={styles.title}>
              {goal.refinedTitle || goal.title}
            </h1>
            <div className={styles.metaRow}>
              <span className={styles.metaItem}>
                {goal.status === 'completed'
                  ? 'Completed'
                  : daysRemaining !== null
                  ? (daysRemaining <= 0 ? 'Deadline passed' : `${daysRemaining} days left`)
                  : 'No deadline'}
              </span>
              <span className={styles.metaDot}>•</span>
              <span className={styles.metaItem}>Due: {formatDate(goal.deadline)}</span>
              {/* Coverage badge for deadline-completed goals */}
              {goal.status === 'completed' && goal.completedCoverage != null && (
                <>
                  <span className={styles.metaDot}>•</span>
                  <span
                    className={`${styles.coverageBadge} ${
                      goal.completedCoverage >= 80 ? styles.coverageHigh
                      : goal.completedCoverage >= 50 ? styles.coverageMid
                      : styles.coverageLow
                    }`}
                  >
                    <MdCheckCircle size={12} />
                    {goal.completedCoverage}% coverage
                  </span>
                </>
              )}
            </div>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.newGoalButton}
              onClick={() => navigate('/app/goals/create')}
            >
              + New Goal
            </button>
            <button
              className={styles.deleteGoalButton}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <MdDelete size={18} /> Delete
            </button>
          </div>
        </div>

        <div className={styles.progressBlock}>
          <div className={styles.progressRow}>
            <span className={styles.progressLabel}>Overall Progress</span>
            <span className={styles.progressPercent}>{goal.progress || 0}%</span>
          </div>
          <div className={styles.progressBarOuter}>
            <div
              className={styles.progressBarInner}
              style={{ width: `${goal.progress || 0}%` }}
            />
          </div>
          <div className={styles.progressFooter}>
            <span className={styles.progressMeta}>{goal.xpEarned || 0} XP earned</span>
            <span className={styles.progressMeta}>
              {completedTopics} / {totalTopics} topics completed
            </span>
          </div>
        </div>

        {/* Goal health summary */}
        {healthData && (
          <div className={styles.healthRow}>
            {healthData.overallKnowledge !== null && (
              <div className={styles.healthStat}>
                <span className={styles.healthValue}>{healthData.overallKnowledge}%</span>
                <span className={styles.healthLabel}>Knowledge</span>
              </div>
            )}
            {healthData.examReadiness !== null && (
              <div className={styles.healthStat}>
                <span className={styles.healthValue}>{healthData.examReadiness}%</span>
                <span className={styles.healthLabel}>Exam Ready</span>
              </div>
            )}
            {daysRemaining !== null && (
              <div className={styles.healthStat}>
                <span className={styles.healthValue}>
                  {healthData.overallKnowledge !== null && daysRemaining > 0
                    ? (healthData.overallKnowledge >= 70 ? <MdCheckCircle size={18} color="#10b981" /> : healthData.overallKnowledge >= 40 ? <MdWarning size={18} color="#f59e0b" /> : <MdError size={18} color="#ef4444" />)
                    : '—'}
                </span>
                <span className={styles.healthLabel}>
                  {healthData.overallKnowledge >= 70 ? 'On Track' : healthData.overallKnowledge >= 40 ? 'Needs Work' : 'Behind'}
                </span>
              </div>
            )}
            {(healthData.weakCount > 0 || healthData.untouchedCount > 0) && (
              <div className={styles.healthStat}>
                <span className={styles.healthValue}>{healthData.weakCount + healthData.untouchedCount}</span>
                <span className={styles.healthLabel}>Need Attention</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Tab navigation */}
      <nav className={styles.tabsBar}>
        <Tab
          id="knowledge"
          label="Knowledge"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <Tab
          id="topics"
          label="Topics Breakdown"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <Tab
          id="notes"
          label="Notes"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          count={getContentByType('notes').length}
        />
        <Tab
          id="summaries"
          label="Summaries"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          count={getContentByType('summary').length}
        />
        <Tab
          id="quizzes"
          label="Quizzes"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          count={getContentByType('quiz').length}
        />
        <Tab
          id="essays"
          label="Essays"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          count={getContentByType('essay').length}
        />
      </nav>

      {/* Content under tabs */}
      <section className={styles.contentArea}>
        {activeTab === "knowledge" && (
          <KnowledgeDashboard
            goalId={goalId}
            topics={goal.topics || []}
          />
        )}
        {activeTab === "topics" && (
          <TopicsBreakdown
            topics={goal.topics || []}
            onProgressUpdate={handleTopicProgressUpdate}
            goalId={goalId}
            topicsWithContent={getTopicsWithContent()}
            onGenerateContent={handleGenerateTopicContent}
          />
        )}
        {activeTab === "notes" && (
          <FullNotes
            notes={getContentByType('notes')}
            topics={goal.topics || []}
            goalId={goalId}
          />
        )}
        {activeTab === "summaries" && (
          <Summaries
            summaries={getContentByType('summary')}
            topics={goal.topics || []}
            goalId={goalId}
          />
        )}
        {activeTab === "quizzes" && (
          <Quizzes
            quizzes={getContentByType('quiz')}
            topics={goal.topics || []}
            goalId={goalId}
          />
        )}
        {activeTab === "essays" && (
          <EssayQuestions
            essays={getContentByType('essay')}
            topics={goal.topics || []}
            goalId={goalId}
          />
        )}
      </section>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Delete Goal</h3>
            <p className={styles.confirmText}>
              Are you sure you want to delete <strong>"{goal.refinedTitle || goal.title}"</strong>?
              This will permanently remove all notes, quizzes, summaries, and essays associated with this goal.
            </p>
            <div className={styles.confirmActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className={styles.confirmDeleteButton}
                onClick={handleDeleteGoal}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend deadline modal */}
      {showExtendModal && (
        <div className={styles.modalOverlay} onClick={() => setShowExtendModal(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Extend Deadline</h3>
            <p className={styles.confirmText}>
              Choose a new deadline for <strong>"{goal.refinedTitle || goal.title}"</strong>.
              Your progress and all study content will be kept.
            </p>
            <input
              type="date"
              className={styles.dateInput}
              value={extendDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setExtendDate(e.target.value)}
            />
            <div className={styles.confirmActions}>
              <button
                className={styles.cancelButton}
                onClick={() => { setShowExtendModal(false); setExtendDate(''); }}
                disabled={updatingGoal}
              >
                Cancel
              </button>
              <button
                className={styles.extendConfirmButton}
                onClick={handleExtendDeadline}
                disabled={!extendDate || updatingGoal}
              >
                {updatingGoal ? 'Saving...' : 'Extend Deadline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tab({ id, label, activeTab, setActiveTab, count }) {
  const isActive = activeTab === id;
  return (
    <button
      type="button"
      className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
      onClick={() => setActiveTab(id)}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={styles.tabCount}>{count}</span>
      )}
    </button>
  );
}

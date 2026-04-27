import { useState } from "react";
import { MdEdit, MdDescription } from "react-icons/md";
import styles from "./EssayQuestions.module.css";
import goalService from "../../services/goalService";

export default function EssayQuestions({ essays = [], topics = [], goalId }) {
  const [generating, setGenerating] = useState(null);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(null);
  const [feedbackMap, setFeedbackMap] = useState({});
  const [expandedFeedback, setExpandedFeedback] = useState(new Set());

  const toggleFeedback = (answerId) => {
    setExpandedFeedback(prev => {
      const next = new Set(prev);
      if (next.has(answerId)) next.delete(answerId);
      else next.add(answerId);
      return next;
    });
  };

  // Submit an essay answer
  const handleSubmitAnswer = async (essayId, questionId) => {
    const answerId = `${essayId}-${questionId}`;
    const userAnswer = answers[answerId];
    if (!userAnswer?.trim()) return;

    try {
      setSubmitting(answerId);
      setError(null);
      const res = await goalService.submitEssayAnswer(essayId, questionId, userAnswer);
      if (res.success) {
        setFeedbackMap(prev => ({ ...prev, [answerId]: res.data }));
        // Clear the textarea
        setAnswers(prev => { const copy = { ...prev }; delete copy[answerId]; return copy; });
      }
    } catch (err) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setSubmitting(null);
    }
  };

  // Generate essays for a topic
  const handleGenerateEssays = async (topicName) => {
    try {
      setGenerating(topicName);
      setError(null);
      await goalService.generateEssay(goalId, topicName, 'medium', 5);
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Failed to generate essay questions');
    } finally {
      setGenerating(null);
    }
  };

  // Handle answer change
  const handleAnswerChange = (essayId, questionId, value) => {
    setAnswers({
      ...answers,
      [`${essayId}-${questionId}`]: value
    });
  };

  // Topics without essays
  const topicsWithoutEssays = topics.filter(
    topic => !essays.some(essay => essay.topic === topic.name)
  );

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconCircle}><MdEdit size={20} style={{ color: '#8b5cf6' }} /></div>
          <h2 className={styles.title}>Essay Questions</h2>
        </div>
      </header>

      {error && (
        <div className={styles.errorBanner}>{error}</div>
      )}

      {essays.length === 0 && topicsWithoutEssays.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><MdDescription size={32} /></div>
          <h3>No Essay Questions Yet</h3>
          <p>Essay questions will be generated from your study materials.</p>
        </div>
      ) : (
        <>
          {essays.map((essay) => (
            <div key={essay._id} className={styles.essaySection}>
              <h3 className={styles.essayTopic}>
                {essay.essayContent?.title || essay.topic || 'Essay Questions'}
              </h3>
              {essay.essayContent?.description && (
                <p className={styles.essayDescription}>{essay.essayContent.description}</p>
              )}
              
              {essay.essayContent?.questions?.map((question, qIndex) => {
                const answerId = `${essay._id}-${question._id}`;
                const existingAnswer = feedbackMap[`${essay._id}-${question._id}`] ||
                  essay.essayAnswers?.find(
                    a => a.questionId?.toString() === question._id?.toString()
                  );
                
                return (
                  <article key={question._id || qIndex} className={styles.questionBlock}>
                    <div className={styles.questionTopRow}>
                      <span className={styles.questionLabel}>Question {qIndex + 1}</span>
                      <span 
                        className={`${styles.difficultyBadge} ${
                          question.difficulty === 'easy' ? styles.difficultyEasy :
                          question.difficulty === 'hard' ? styles.difficultyHard :
                          styles.difficultyMedium
                        }`}
                      >
                        {question.difficulty || 'medium'}
                      </span>
                      {existingAnswer && (
                        <>
                          <span className={`${styles.statusBadge} ${styles.statusSubmitted}`}>
                            Submitted
                          </span>
                          {existingAnswer.aiFeedback?.score !== undefined && (
                            <div className={styles.scoreBox}>
                              <span className={styles.scoreValue}>{existingAnswer.aiFeedback.score}%</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <p className={styles.questionText}>{question.question}</p>

                    {existingAnswer ? (
                      <>
                        <div className={styles.submittedAnswer}>
                          <strong>Your Answer:</strong>
                          <p>{existingAnswer.userAnswer}</p>
                        </div>
                        
                        {existingAnswer.aiFeedback && (
                          <div className={styles.feedbackBox}>
                            <div className={styles.feedbackHeader}>
                              <span className={styles.feedbackLabel}>AI Feedback</span>
                              {existingAnswer.aiFeedback.score !== undefined && (
                                <span className={styles.feedbackScore}>{existingAnswer.aiFeedback.score}%</span>
                              )}
                            </div>
                            <div className={`${styles.feedbackBody} ${expandedFeedback.has(answerId) ? styles.feedbackExpanded : styles.feedbackCollapsed}`}>
                              <p className={styles.feedbackText}>
                                {existingAnswer.aiFeedback.feedback}
                              </p>

                              {existingAnswer.aiFeedback.strengths?.length > 0 && (
                                <div className={styles.strengthsWeaknesses}>
                                  <strong>Strengths:</strong>
                                  <ul>
                                    {existingAnswer.aiFeedback.strengths.map((s, i) => (
                                      <li key={i}>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {existingAnswer.aiFeedback.improvements?.length > 0 && (
                                <div className={styles.strengthsWeaknesses}>
                                  <strong>Areas for Improvement:</strong>
                                  <ul>
                                    {existingAnswer.aiFeedback.improvements.map((s, i) => (
                                      <li key={i}>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            <button
                              className={styles.readMoreBtn}
                              onClick={() => toggleFeedback(answerId)}
                            >
                              {expandedFeedback.has(answerId) ? 'Read less ↑' : 'Read more ↓'}
                            </button>
                          </div>
                        )}
                        
                        {question.sampleAnswer && (
                          <details className={styles.sampleAnswer}>
                            <summary>View Sample Answer</summary>
                            <p>{question.sampleAnswer}</p>
                          </details>
                        )}
                      </>
                    ) : (
                      <>
                        <textarea
                          className={styles.answerArea}
                          placeholder="Write your answer here..."
                          value={answers[answerId] || ''}
                          onChange={(e) => handleAnswerChange(essay._id, question._id, e.target.value)}
                        />

                        {question.keyPoints?.length > 0 && (
                          <div className={styles.hintBox}>
                            <strong>Hint:</strong> Make sure to address: {question.keyPoints.slice(0, 2).join(', ')}...
                          </div>
                        )}

                        <div className={styles.bottomRow}>
                          <button 
                            className={styles.submitButton}
                            disabled={!answers[answerId]?.trim() || submitting === answerId}
                            onClick={() => handleSubmitAnswer(essay._id, question._id)}
                          >
                            {submitting === answerId ? 'Grading...' : 'Submit Answer'}
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          ))}

          {topicsWithoutEssays.length > 0 && (
            <div className={styles.generateSection}>
              <h3 className={styles.generateTitle}>Generate Essay Questions</h3>
              <p className={styles.generateDescription}>
                Click to generate essay questions for these topics:
              </p>
              <div className={styles.topicButtons}>
                {topicsWithoutEssays.map((topic) => (
                  <button
                    key={topic._id || topic.name}
                    className={styles.generateButton}
                    onClick={() => handleGenerateEssays(topic.name)}
                    disabled={generating === topic.name}
                  >
                    {generating === topic.name ? 'Generating...' : topic.name}
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

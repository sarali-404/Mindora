import { useState } from "react";
import styles from "./Quizzes.module.css";
import { MdQuiz, MdEmojiEvents, MdCheckCircle, MdCancel } from "react-icons/md";
import goalService from "../../services/goalService";

export default function Quizzes({ quizzes = [], topics = [], goalId }) {
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizState, setQuizState] = useState('list'); // list, taking, result
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [error, setError] = useState(null);

  // Generate quiz for a topic
  const handleGenerateQuiz = async (topicName) => {
    try {
      setGenerating(topicName);
      setError(null);
      await goalService.generateQuiz(goalId, topicName, 'medium', 10);
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Failed to generate quiz');
    } finally {
      setGenerating(null);
    }
  };

  // Start taking a quiz
  const handleStartQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setQuizState('taking');
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setQuizResult(null);
  };

  // Select an answer
  const handleSelectAnswer = (questionIndex, optionIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionIndex]: optionIndex
    });
  };

  // Submit quiz
  const handleSubmitQuiz = async () => {
    try {
      const questions = activeQuiz.quizContent?.questions || [];
      const answers = questions.map((q, i) => ({
        questionId: q._id,
        selectedOption: selectedAnswers[i] ?? -1
      }));

      const response = await goalService.submitQuizAttempt(
        activeQuiz._id,
        answers,
        0 // timeTaken - could track this
      );

      if (response.success) {
        setQuizResult(response.data);
        setQuizState('result');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit quiz');
    }
  };

  // Back to list
  const handleBackToList = () => {
    setActiveQuiz(null);
    setQuizState('list');
    setQuizResult(null);
    window.location.reload(); // Refresh to get updated scores
  };

  // Topics without quizzes
  const topicsWithoutQuizzes = topics.filter(
    topic => !quizzes.some(quiz => quiz.topic === topic.name)
  );

  // Quiz result view
  if (quizState === 'result' && quizResult) {
    return (
      <section className={styles.card}>
        <div className={styles.resultContainer}>
          <div className={styles.resultHeader}>
            <h2>Quiz Complete!</h2>
            <div className={styles.scoreCircle}>
              {quizResult.percentage}%
            </div>
          </div>
          
          <p className={styles.resultSummary}>
            You got {quizResult.score} out of {quizResult.total} questions correct
          </p>
          
          {quizResult.xpEarned > 0 && (
            <p className={styles.xpEarned}>+{quizResult.xpEarned} XP earned!</p>
          )}

          <div className={styles.answersReview}>
            <h3>Review Answers</h3>
            {quizResult.answers?.map((answer, i) => {
              const question = activeQuiz.quizContent?.questions[i];
              return (
                <div 
                  key={i} 
                  className={`${styles.answerItem} ${answer.isCorrect ? styles.correct : styles.incorrect}`}
                >
                  <div className={styles.answerHeader}>
                    {answer.isCorrect ? 
                      <MdCheckCircle className={styles.correctIcon} /> : 
                      <MdCancel className={styles.incorrectIcon} />
                    }
                    <span>Question {i + 1}</span>
                  </div>
                  <p className={styles.questionText}>{question?.question}</p>
                  {!answer.isCorrect && answer.correctOption !== undefined && (
                    <p className={styles.correctAnswer}>
                      Correct answer: {question?.options[answer.correctOption]?.text}
                    </p>
                  )}
                  {answer.explanation && (
                    <p className={styles.explanation}>{answer.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>

          <button 
            className={styles.primaryButton}
            onClick={handleBackToList}
          >
            Back to Quizzes
          </button>
        </div>
      </section>
    );
  }

  // Quiz taking view
  if (quizState === 'taking' && activeQuiz) {
    const questions = activeQuiz.quizContent?.questions || [];
    const question = questions[currentQuestion];

    return (
      <section className={styles.card}>
        <header className={styles.quizHeader}>
          <h2>{activeQuiz.quizContent?.title || activeQuiz.topic}</h2>
          <span className={styles.progress}>
            Question {currentQuestion + 1} of {questions.length}
          </span>
        </header>

        <div className={styles.questionContainer}>
          <h3 className={styles.questionText}>{question?.question}</h3>
          
          <div className={styles.options}>
            {question?.options.map((option, i) => (
              <button
                key={i}
                className={`${styles.optionButton} ${
                  selectedAnswers[currentQuestion] === i ? styles.selected : ''
                }`}
                onClick={() => handleSelectAnswer(currentQuestion, i)}
              >
                <span className={styles.optionLetter}>
                  {String.fromCharCode(65 + i)}
                </span>
                {option.text}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.quizNav}>
          {currentQuestion > 0 && (
            <button 
              className={styles.navButton}
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
            >
              ← Previous
            </button>
          )}
          <div className={styles.spacer} />
          {currentQuestion < questions.length - 1 ? (
            <button 
              className={styles.navButton}
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
            >
              Next →
            </button>
          ) : (
            <button 
              className={styles.submitButton}
              onClick={handleSubmitQuiz}
              disabled={Object.keys(selectedAnswers).length < questions.length}
            >
              Submit Quiz
            </button>
          )}
        </div>
      </section>
    );
  }

  // Quiz list view
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconCircle}><MdQuiz size={20} style={{ color: '#8b5cf6' }} /></div>
          <h2 className={styles.title}>Practice Quizzes</h2>
        </div>
      </header>

      {error && (
        <div className={styles.errorBanner}>{error}</div>
      )}

      {quizzes.length === 0 && topicsWithoutQuizzes.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><MdQuiz size={32} /></div>
          <h3>No Quizzes Yet</h3>
          <p>Quizzes will be generated from your study materials.</p>
        </div>
      ) : (
        <>
          {quizzes.length > 0 && (
            <div className={styles.grid}>
              {quizzes.map((quiz) => (
                <QuizCard 
                  key={quiz._id} 
                  quiz={quiz}
                  onStart={() => handleStartQuiz(quiz)}
                />
              ))}
            </div>
          )}

          {topicsWithoutQuizzes.length > 0 && (
            <div className={styles.generateSection}>
              <h3 className={styles.generateTitle}>Generate Quizzes</h3>
              <p className={styles.generateDescription}>
                Click to generate quizzes for these topics:
              </p>
              <div className={styles.topicButtons}>
                {topicsWithoutQuizzes.map((topic) => (
                  <button
                    key={topic._id || topic.name}
                    className={styles.generateButton}
                    onClick={() => handleGenerateQuiz(topic.name)}
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

function QuizCard({ quiz, onStart }) {
  const questions = quiz.quizContent?.questions || [];
  const attempts = quiz.quizAttempts?.length || 0;
  const bestScore = attempts > 0 
    ? Math.max(...quiz.quizAttempts.map(a => a.percentage))
    : null;
  
  const difficulty = quiz.currentDifficulty || quiz.quizContent?.difficulty || 'medium';

  return (
    <article className={styles.quizCard}>
      <h3 className={styles.quizTitle}>
        {quiz.quizContent?.title || quiz.topic || 'Quiz'}
      </h3>

      <div className={styles.metaRow}>
        <span
          className={`${styles.levelBadge} ${
            difficulty === 'easy'
              ? styles.levelEasy
              : difficulty === 'medium'
              ? styles.levelMedium
              : styles.levelHard
          }`}
        >
          {difficulty}
        </span>
        <span className={styles.metaText}>{questions.length} questions</span>
      </div>

      <div className={styles.scoreBox}>
        <span className={styles.scoreLabel}>Best Score</span>
        {bestScore !== null ? (
          <span className={styles.scoreValue}>
            <MdEmojiEvents style={{ marginRight: 6, color: '#10b981', verticalAlign: 'middle' }} /> 
            {bestScore}%
          </span>
        ) : (
          <span className={styles.scorePlaceholder}>No attempts yet</span>
        )}
      </div>

      <p className={styles.attemptsText}>
        {attempts} attempt{attempts !== 1 ? 's' : ''}
      </p>

      <button
        className={`${styles.primaryButton} ${
          attempts === 0 ? styles.startButton : ''
        }`}
        onClick={onStart}
      >
        {attempts === 0 ? 'Start Quiz' : 'Retake Quiz'}
      </button>
    </article>
  );
}


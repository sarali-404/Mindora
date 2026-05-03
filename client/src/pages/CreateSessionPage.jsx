import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowBack, MdSchedule, MdPlayArrow, MdInfo } from "react-icons/md";
import { FaDiscord } from "react-icons/fa";
import styles from "./CreateSessionPage.module.css";
import sessionService from "../services/sessionService";
import authService from "../services/authService";

export default function CreateSessionPage() {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const isVerified = currentUser?.profile?.idPhoto?.verified === true;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    tags: '',
    date: '',
    time: '',
    duration: 60,
    maxParticipants: 10,
    isImmediate: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // If not verified, show message
  if (!isVerified) {
    return (
      <div className={styles.page}>
        <div className={styles.formShell}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate(-1)}
          >
            <MdArrowBack />
          </button>

          <div className={styles.verificationRequired}>
            <MdInfo size={48} color="#f59e0b" />
            <h2>Verification Required</h2>
            <p>You must complete ID verification to create study sessions.</p>
            <button 
              className={styles.primaryButton}
              onClick={() => navigate('/app/profile')}
            >
              Go to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Session title is required');
      return;
    }
    if (!formData.subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!formData.isImmediate && (!formData.date || !formData.time)) {
      setError('Please select a date and time for scheduled sessions');
      return;
    }

    try {
      setLoading(true);

      // Prepare data
      const sessionData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        subject: formData.subject.trim(),
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        duration: parseInt(formData.duration),
        maxParticipants: parseInt(formData.maxParticipants),
        isImmediate: formData.isImmediate
      };

      if (formData.isImmediate) {
        sessionData.scheduledAt = new Date().toISOString();
      } else {
        sessionData.scheduledAt = new Date(`${formData.date}T${formData.time}`).toISOString();
      }

      const response = await sessionService.createSession(sessionData);

      // If session is live and has Discord link, open it
      if (response.data?.discord?.inviteLink && formData.isImmediate) {
        window.open(response.data.discord.inviteLink, '_blank');
      }

      navigate('/app/sessions');
    } catch (err) {
      console.error('Create session error:', err);
      setError(err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className={styles.page}>
      <div className={styles.formShell}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate(-1)}
        >
          <MdArrowBack />
        </button>

        <header className={styles.header}>
          <h1 className={styles.title}>Create a Study Session</h1>
          <p className={styles.subtitle}>
            Host a voice study session on Discord with other verified students.
          </p>
        </header>

        <div className={styles.discordInfo}>
          <FaDiscord size={20} />
          <span>Sessions are hosted on Discord voice channels. A channel will be created automatically.</span>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Session Type Toggle */}
          <div className={styles.sessionTypeToggle}>
            <button
              type="button"
              className={`${styles.typeBtn} ${!formData.isImmediate ? styles.typeBtnActive : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, isImmediate: false }))}
            >
              <MdSchedule size={18} />
              Schedule for Later
            </button>
            <button
              type="button"
              className={`${styles.typeBtn} ${formData.isImmediate ? styles.typeBtnActive : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, isImmediate: true }))}
            >
              <MdPlayArrow size={18} />
              Start Now
            </button>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="title">
              Session Title *
            </label>
            <input
              id="title"
              name="title"
              className={styles.input}
              placeholder="e.g., React Hooks Deep Dive"
              value={formData.title}
              onChange={handleChange}
              maxLength={100}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="subject">
              Subject *
            </label>
            <input
              id="subject"
              name="subject"
              className={styles.input}
              placeholder="e.g., Computer Science, Mathematics, Physics"
              value={formData.subject}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Describe what you'll cover in this session..."
              value={formData.description}
              onChange={handleChange}
              maxLength={500}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="tags">
              Tags (comma-separated)
            </label>
            <input
              id="tags"
              name="tags"
              className={styles.input}
              placeholder="e.g., react, javascript, beginner-friendly"
              value={formData.tags}
              onChange={handleChange}
            />
          </div>

          {!formData.isImmediate && (
            <div className={styles.row}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="date">
                  Date *
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  className={styles.input}
                  value={formData.date}
                  onChange={handleChange}
                  min={today}
                  required={!formData.isImmediate}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="time">
                  Time *
                </label>
                <input
                  id="time"
                  name="time"
                  type="time"
                  className={styles.input}
                  value={formData.time}
                  onChange={handleChange}
                  required={!formData.isImmediate}
                />
              </div>
            </div>
          )}

          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="duration">
                Duration (minutes)
              </label>
              <select
                id="duration"
                name="duration"
                className={styles.input}
                value={formData.duration}
                onChange={handleChange}
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
                <option value={240}>4 hours</option>
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="maxParticipants">
                Max Participants
              </label>
              <input
                id="maxParticipants"
                name="maxParticipants"
                type="number"
                className={styles.input}
                value={formData.maxParticipants}
                onChange={handleChange}
                min={2}
                max={50}
              />
              <p className={styles.helperText}>
                2-50 participants allowed
              </p>
            </div>
          </div>

          <div className={styles.actionsRow}>
            <button 
              type="submit" 
              className={styles.primaryButton}
              disabled={loading}
            >
              {loading ? 'Creating...' : formData.isImmediate ? 'Start Session Now' : 'Create Session'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

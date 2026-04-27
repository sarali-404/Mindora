import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  MdCalendarToday, 
  MdAccessTime, 
  MdPeople, 
  MdSearch,
  MdRefresh,
  MdPlayCircle,
  MdSchedule,
  MdOpenInNew,
  MdVerified,
  MdWarning,
  MdAdd
} from "react-icons/md";
import { FaDiscord } from "react-icons/fa";
import styles from "./SessionsPage.module.css";
import sessionService from "../services/sessionService";
import authService from "../services/authService";

export default function SessionsPage() {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const isVerified = currentUser?.verificationStatus === 'verified';

  const [sessions, setSessions] = useState([]);
  const [mySessions, setMySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' or 'my-sessions'
  const [discordInfo, setDiscordInfo] = useState(null);

  // Fetch sessions
  useEffect(() => {
    fetchSessions();
    fetchMySessions();
    fetchDiscordInfo();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (activeFilter === 'live') {
        params.live = 'true';
      } else if (activeFilter === 'upcoming') {
        params.upcoming = 'true';
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await sessionService.getSessions(params);
      setSessions(response.data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMySessions = async () => {
    try {
      const response = await sessionService.getMySessions();
      setMySessions(response.data || []);
    } catch (err) {
      console.error('Error fetching my sessions:', err);
    }
  };

  const fetchDiscordInfo = async () => {
    try {
      const response = await sessionService.getDiscordInvite();
      setDiscordInfo(response.data);
    } catch (err) {
      console.error('Error fetching Discord info:', err);
    }
  };

  // Refetch when filter changes
  useEffect(() => {
    fetchSessions();
  }, [activeFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSessions();
  };

  const handleJoinSession = async (sessionId) => {
    if (!isVerified) {
      alert('You must be verified to join sessions. Please complete ID verification in your profile.');
      return;
    }

    try {
      const response = await sessionService.joinSession(sessionId);
      // Update local state
      setSessions(prev => prev.map(s => 
        s._id === sessionId ? response.data : s
      ));
      fetchMySessions();
      
      // If session has Discord link, offer to open it
      if (response.data?.discord?.inviteLink) {
        if (confirm('Successfully joined! Would you like to open the Discord voice channel?')) {
          window.open(response.data.discord.inviteLink, '_blank');
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to join session');
    }
  };

  const handleLeaveSession = async (sessionId) => {
    if (!confirm('Are you sure you want to leave this session?')) return;

    try {
      await sessionService.leaveSession(sessionId);
      fetchSessions();
      fetchMySessions();
    } catch (err) {
      alert(err.message || 'Failed to leave session');
    }
  };

  const handleStartSession = async (sessionId) => {
    try {
      const response = await sessionService.startSession(sessionId);
      fetchSessions();
      fetchMySessions();
      
      if (response.data?.discord?.inviteLink) {
        window.open(response.data.discord.inviteLink, '_blank');
      }
    } catch (err) {
      alert(err.message || 'Failed to start session');
    }
  };

  const handleEndSession = async (sessionId) => {
    if (!confirm('Are you sure you want to end this session?')) return;

    try {
      await sessionService.endSession(sessionId);
      fetchSessions();
      fetchMySessions();
    } catch (err) {
      alert(err.message || 'Failed to end session');
    }
  };

  const handleCancelSession = async (sessionId) => {
    if (!confirm('Are you sure you want to cancel this session? This cannot be undone.')) return;

    try {
      await sessionService.cancelSession(sessionId);
      fetchSessions();
      fetchMySessions();
    } catch (err) {
      alert(err.message || 'Failed to cancel session');
    }
  };

  const currentUserId = currentUser?.id || currentUser?._id;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <form className={styles.searchContainer} onSubmit={handleSearch}>
          <MdSearch className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search sessions by topic, host, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
        
        <div className={styles.headerActions}>
          {discordInfo?.serverInvite && (
            <a 
              href={discordInfo.serverInvite} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.discordButton}
            >
              <FaDiscord size={18} />
              Join Discord
            </a>
          )}
          
          {isVerified ? (
            <Link to="/app/create-session" className={styles.createButton}>
              <MdAdd size={18} />
              <span className={styles.createBtnText}>Create Session</span>
            </Link>
          ) : (
            <button 
              className={styles.createButtonDisabled}
              onClick={() => alert('You must be verified to create sessions. Please complete ID verification.')}
              title="Verification required"
            >
              <MdAdd size={18} />
              <span className={styles.createBtnText}>Create Session</span>
            </button>
          )}
        </div>
      </header>

      {/* Verification Banner */}
      {!isVerified && (
        <div className={styles.verificationBanner}>
          <MdWarning size={20} />
          <span>You need to complete ID verification to create or join sessions.</span>
          <Link to="/app/profile" className={styles.verifyLink}>Verify Now</Link>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'browse' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          Browse Sessions
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'my-sessions' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('my-sessions')}
        >
          My Sessions ({mySessions.length})
        </button>
      </div>

      {activeTab === 'browse' ? (
        <>
          {/* Filter Row */}
          <section className={styles.filterRow}>
            <span className={styles.filterLabel}>Filter by:</span>
            <div className={styles.filterChips}>
              <button 
                className={`${styles.filterChip} ${activeFilter === 'all' ? styles.filterChipActive : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All
              </button>
              <button 
                className={`${styles.filterChip} ${activeFilter === 'live' ? styles.filterChipActive : ''}`}
                onClick={() => setActiveFilter('live')}
              >
                <MdPlayCircle size={14} /> Live Now
              </button>
              <button 
                className={`${styles.filterChip} ${activeFilter === 'upcoming' ? styles.filterChipActive : ''}`}
                onClick={() => setActiveFilter('upcoming')}
              >
                <MdSchedule size={14} /> Upcoming
              </button>
            </div>
            <button className={styles.refreshBtn} onClick={fetchSessions} title="Refresh">
              <MdRefresh size={18} />
            </button>
          </section>

          {/* Sessions Grid */}
          <section className={styles.sessionsGrid}>
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Loading sessions...</p>
              </div>
            ) : error ? (
              <div className={styles.errorState}>
                <p>Error: {error}</p>
                <button onClick={fetchSessions}>Try Again</button>
              </div>
            ) : sessions.length === 0 ? (
              <div className={styles.emptyState}>
                <MdCalendarToday size={48} />
                <h3>No sessions found</h3>
                <p>Be the first to create a study session!</p>
                {isVerified && (
                  <Link to="/app/create-session" className={styles.createButton}>
                    Create Session
                  </Link>
                )}
              </div>
            ) : (
              sessions.map((session) => (
                <SessionCard
                  key={session._id}
                  session={session}
                  currentUserId={currentUserId}
                  onJoin={() => handleJoinSession(session._id)}
                  onLeave={() => handleLeaveSession(session._id)}
                  onStart={() => handleStartSession(session._id)}
                  onEnd={() => handleEndSession(session._id)}
                  onCancel={() => handleCancelSession(session._id)}
                  isVerified={isVerified}
                />
              ))
            )}
          </section>
        </>
      ) : (
        /* My Sessions Tab */
        <section className={styles.sessionsGrid}>
          {mySessions.length === 0 ? (
            <div className={styles.emptyState}>
              <MdCalendarToday size={48} />
              <h3>No sessions yet</h3>
              <p>You haven't joined or created any sessions yet.</p>
            </div>
          ) : (
            mySessions.map((session) => (
              <SessionCard
                key={session._id}
                session={session}
                currentUserId={currentUserId}
                onJoin={() => handleJoinSession(session._id)}
                onLeave={() => handleLeaveSession(session._id)}
                onStart={() => handleStartSession(session._id)}
                onEnd={() => handleEndSession(session._id)}
                onCancel={() => handleCancelSession(session._id)}
                isVerified={isVerified}
                showActions
              />
            ))
          )}
        </section>
      )}
    </div>
  );
}

function SessionCard({ 
  session, 
  currentUserId, 
  onJoin, 
  onLeave, 
  onStart, 
  onEnd, 
  onCancel,
  isVerified,
  showActions = false 
}) {
  const isHost = sessionService.isHost(session, currentUserId);
  const isParticipant = sessionService.isParticipant(session, currentUserId);
  const canJoin = sessionService.canJoinSession(session, currentUserId);

  const hostName = session.host?.profile?.firstName && session.host?.profile?.lastName
    ? `${session.host.profile.firstName} ${session.host.profile.lastName}`
    : session.host?.username || 'Unknown';

  const hostUni = session.host?.profile?.university || '';

  const getStatusBadge = () => {
    switch (session.status) {
      case 'live':
        return { text: '🔴 Live', className: styles.statusLive };
      case 'scheduled':
        return { text: 'Upcoming', className: styles.statusBlue };
      case 'ended':
        return { text: 'Ended', className: styles.statusGray };
      case 'cancelled':
        return { text: 'Cancelled', className: styles.statusRed };
      default:
        return { text: session.status, className: styles.statusBlue };
    }
  };

  const statusBadge = getStatusBadge();

  const formatTime = () => {
    const start = new Date(session.scheduledAt);
    const end = new Date(start.getTime() + session.duration * 60000);
    return `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  };

  const formatDate = () => {
    return new Date(session.scheduledAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <article className={styles.sessionCard}>
      <div className={styles.sessionHeaderRow}>
        <h2 className={styles.sessionTitle}>{session.title}</h2>
        <span className={`${styles.statusBadge} ${statusBadge.className}`}>
          {statusBadge.text}
        </span>
      </div>

      <div className={styles.hostRow}>
        {session.host?.profile?.avatar ? (
          <img 
            src={session.host.profile.avatar.startsWith('http') 
              ? session.host.profile.avatar 
              : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${session.host.profile.avatar}`
            }
            alt={hostName}
            className={styles.hostAvatarImg}
          />
        ) : (
          <div className={styles.hostAvatar}>{hostName[0]}</div>
        )}
        <div>
          <p className={styles.hostName}>
            {hostName}
            {isHost && <span className={styles.hostBadge}>Host</span>}
          </p>
          {hostUni && <p className={styles.hostMeta}>{hostUni}</p>}
        </div>
      </div>

      {session.description && (
        <p className={styles.description}>{session.description}</p>
      )}

      <div className={styles.subjectTag}>{session.subject}</div>

      {session.tags && session.tags.length > 0 && (
        <div className={styles.tagsRow}>
          {session.tags.map((tag, i) => (
            <span key={i} className={styles.tag}>{tag}</span>
          ))}
        </div>
      )}

      <div className={styles.metaList}>
        <div className={styles.metaRow}>
          <MdCalendarToday className={styles.metaIcon} style={{ color: '#10b981' }} />
          <span className={styles.metaText}>{formatDate()}</span>
        </div>
        <div className={styles.metaRow}>
          <MdAccessTime className={styles.metaIcon} style={{ color: '#f59e0b' }} />
          <span className={styles.metaText}>{formatTime()}</span>
        </div>
        <div className={styles.metaRow}>
          <MdPeople className={styles.metaIcon} style={{ color: '#8b5cf6' }} />
          <span className={styles.metaText}>
            {session.participants?.length || 0} / {session.maxParticipants}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.cardActions}>
        {session.status === 'live' && session.discord?.inviteLink && (
          <a 
            href={session.discord.inviteLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.discordJoinBtn}
          >
            <FaDiscord size={16} />
            Join Voice
            <MdOpenInNew size={14} />
          </a>
        )}

        {isHost ? (
          <>
            {session.status === 'scheduled' && (
              <button className={styles.startButton} onClick={onStart}>
                Start Now
              </button>
            )}
            {session.status === 'live' && (
              <button className={styles.endButton} onClick={onEnd}>
                End Session
              </button>
            )}
            {['scheduled', 'live'].includes(session.status) && (
              <button className={styles.cancelButton} onClick={onCancel}>
                Cancel
              </button>
            )}
          </>
        ) : isParticipant ? (
          <button className={styles.leaveButton} onClick={onLeave}>
            Leave Session
          </button>
        ) : canJoin && isVerified ? (
          <button className={styles.joinButton} onClick={onJoin}>
            Join Session
          </button>
        ) : !isVerified ? (
          <button className={styles.joinButtonDisabled} disabled>
            Verify to Join
          </button>
        ) : session.participants?.length >= session.maxParticipants ? (
          <button className={styles.joinButtonDisabled} disabled>
            Session Full
          </button>
        ) : null}
      </div>
    </article>
  );
}

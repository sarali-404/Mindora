import styles from "./ProfilePage.module.css";
import {
  MdPeople,
  MdAutoAwesome,
  MdVisibility,
  MdDelete,
  MdEdit,
  MdLock,
  MdEmojiEvents,
  MdFlag,
  MdAccessTime,
  MdUpload,
  MdPlayCircleOutline,
  MdClose,
  MdWarning,
  MdLogout,
  MdCameraAlt,
  MdCheckCircle,
  MdCalendarToday,
} from "react-icons/md";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";
import materialService from "../services/materialService";
import friendService from "../services/friendService";
import goalService from "../services/goalService";
import api from "../services/api";

// Import achievement images
import firstStepsImg from "../assets/achievements/first_steps.png";
import goalArchitectImg from "../assets/achievements/goal_architect.png";
import goalCrusherImg from "../assets/achievements/goal_crusher.png";
import memoryMasterImg from "../assets/achievements/memory_master.png";
import morningChampionImg from "../assets/achievements/morning_champion.png";
import quizMasterImg from "../assets/achievements/quiz_master.png";
import readingBirdImg from "../assets/achievements/reading_bird.png";
import streakMasterImg from "../assets/achievements/streak_master.png";
import teachingBirdImg from "../assets/achievements/teaching_bird.png";
import welcomeAboardImg from "../assets/achievements/welcome_aborad.png";

const achievementImageMap = {
  welcome_aboard: welcomeAboardImg,
  first_steps: firstStepsImg,
  goal_architect: goalArchitectImg,
  goal_crusher: goalCrusherImg,
  memory_master: memoryMasterImg,
  morning_champion: morningChampionImg,
  quiz_master: quizMasterImg,
  reading_bird: readingBirdImg,
  streak_master: streakMasterImg,
  teaching_bird: teachingBirdImg,
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Get current user from authService
  const [currentUser, setCurrentUser] = useState(authService.getUser());
  const [uploadingPicture, setUploadingPicture] = useState(false);

  // Inline name edit
  const [nameEditing, setNameEditing] = useState(false);
  const [nameFirst, setNameFirst] = useState(currentUser?.profile?.firstName || '');
  const [nameLast, setNameLast] = useState(currentUser?.profile?.lastName || '');
  const [nameSaving, setNameSaving] = useState(false);

  const handleSaveName = async () => {
    if (!nameFirst.trim()) return;
    setNameSaving(true);
    try {
      const res = await api.put('/users/profile', { firstName: nameFirst.trim(), lastName: nameLast.trim() });
      if (res.success && res.data?.user) {
        const updated = { ...currentUser, profile: { ...currentUser.profile, firstName: nameFirst.trim(), lastName: nameLast.trim() } };
        authService.setUser(updated);
        setCurrentUser(updated);
      }
      setNameEditing(false);
    } catch (e) {
      console.error('Name update error:', e);
    } finally {
      setNameSaving(false);
    }
  };
  
  // Dynamic user data
  const user = {
    name: currentUser?.profile?.firstName && currentUser?.profile?.lastName 
      ? `${currentUser.profile.firstName} ${currentUser.profile.lastName}`
      : currentUser?.profile?.firstName || currentUser?.username || "User",
    university: currentUser?.profile?.university || "University not set",
    major: currentUser?.profile?.degreeProgram || "Major not set",
    memberSince: currentUser?.createdAt 
      ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : "Recently joined",
    initials: currentUser?.profile?.firstName && currentUser?.profile?.lastName
      ? `${currentUser.profile.firstName[0]}${currentUser.profile.lastName[0]}`
      : currentUser?.username?.substring(0, 2).toUpperCase() || "U",
  };

  // Get profile picture URL
  const getProfilePictureUrl = () => {
    if (!currentUser?.profile?.avatar) return null;
    const avatar = currentUser.profile.avatar;
    // Check if it's a full URL (Google picture) or a relative path
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      return avatar;
    }
    // Otherwise it's a relative path to our server
    return `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${avatar}`;
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/'); // Redirect to landing page
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate even if logout API fails
      navigate('/');
    }
  };

  // Handle profile picture upload
  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB.');
      return;
    }

    try {
      setUploadingPicture(true);
      const response = await authService.uploadProfilePicture(file);
      
      if (response.success) {
        // Update local user data
        const updatedUser = { ...currentUser, profile: { ...currentUser.profile, avatar: response.data.avatar } };
        authService.setUser(updatedUser);
        setCurrentUser(updatedUser);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingPicture(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Materials state
  const [myMaterials, setMyMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ show: false, material: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Dynamic stats state
  const [stats, setStats] = useState({ goalsAchieved: 0, hoursStudied: 0, materialsUploaded: 0, activeGoals: 0 });

  // Friends state
  const [friends, setFriends] = useState([]);

  // AI-generated public notes state
  const [aiNotes, setAiNotes] = useState([]);
  const [aiNotesLoading, setAiNotesLoading] = useState(true);

  // Achievements from gamification profile
  const [achievements, setAchievements] = useState([]);

  // Goals section state
  const [allProfileGoals, setAllProfileGoals] = useState([]);
  const [profileGoalsLoading, setProfileGoalsLoading] = useState(true);
  const [goalFilter, setGoalFilter] = useState('active');
  const [goalAction, setGoalAction] = useState({ loading: false, goalId: null });
  const [extendModal, setExtendModal] = useState({ show: false, goal: null, date: '' });

  // Fetch all profile data
  useEffect(() => {
    const fetchMyMaterials = async () => {
      try {
        setMaterialsLoading(true);
        const response = await materialService.getMyMaterials({ limit: 50 });
        setMyMaterials(response.data || []);
      } catch (error) {
        console.error('Error fetching materials:', error);
      } finally {
        setMaterialsLoading(false);
      }
    };

    const fetchStats = async () => {
      try {
        const response = await api.get('/users/stats');
        if (response.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    const fetchFriends = async () => {
      try {
        const response = await friendService.getFriends();
        setFriends((response.data || []).slice(0, 8));
      } catch (error) {
        console.error('Error fetching friends:', error);
      }
    };

    const fetchAiNotes = async () => {
      try {
        setAiNotesLoading(true);
        const response = await goalService.getPublicNotes({ limit: 10 });
        setAiNotes(response.data || []);
      } catch (error) {
        console.error('Error fetching AI notes:', error);
      } finally {
        setAiNotesLoading(false);
      }
    };

    const fetchAchievements = async () => {
      try {
        const response = await api.get('/gamification/achievements');
        if (response.success && response.data) {
          const mapped = response.data.map((ach) => ({
            id: ach._id,
            key: ach.key,
            name: ach.name,
            description: ach.description,
            image: achievementImageMap[ach.key] || welcomeAboardImg,
            unlocked: ach.earned,
            tier: ach.tier,
            isTiered: ach.isTiered,
            hasLevels: ach.isTiered,
            tiers: ach.tiers,
            oneTimeTier: ach.oneTimeTier,
            unlockedAt: ach.unlockedAt,
          }));
          setAchievements(mapped);
        }
      } catch (error) {
        console.error('Error fetching achievements:', error);
      }
    };

    fetchMyMaterials();
    fetchStats();
    fetchFriends();
    fetchAiNotes();
    fetchAchievements();

    const fetchProfileGoals = async () => {
      try {
        setProfileGoalsLoading(true);
        const res = await goalService.getMyGoals({ limit: 100 });
        setAllProfileGoals(res.data || []);
      } catch (err) {
        console.error('Error fetching profile goals:', err);
      } finally {
        setProfileGoalsLoading(false);
      }
    };
    fetchProfileGoals();
  }, []);

  // Handle edit material - navigate to NotePage with edit mode
  const handleEditMaterial = (materialId) => {
    navigate(`/app/note/${materialId}?edit=true`);
  };

  // Handle delete material
  const handleDeleteMaterial = async () => {
    if (!deleteModal.material) return;
    
    try {
      setDeleteLoading(true);
      await materialService.deleteMaterial(deleteModal.material._id);
      setMyMaterials(prev => prev.filter(m => m._id !== deleteModal.material._id));
      setDeleteModal({ show: false, material: null });
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Failed to delete material. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Goal filter helper
  const now = new Date();
  const filteredGoals = allProfileGoals.filter(g => {
    if (goalFilter === 'active') return g.status === 'active' && (!g.deadline || new Date(g.deadline) > now);
    if (goalFilter === 'completed') return g.status === 'completed';
    if (goalFilter === 'unachieved') return g.status === 'active' && g.deadline && new Date(g.deadline) <= now;
    return false;
  });

  // Goal action handlers
  const handleGoalComplete = async (goal) => {
    setGoalAction({ loading: true, goalId: goal._id });
    try {
      await goalService.updateGoal(goal._id, {
        status: 'completed',
        completedCoverage: Math.round(goal.progress || 0),
      });
      setAllProfileGoals(prev =>
        prev.map(g => g._id === goal._id ? { ...g, status: 'completed', completedCoverage: Math.round(goal.progress || 0) } : g)
      );
    } catch (err) {
      console.error('Error completing goal:', err);
    } finally {
      setGoalAction({ loading: false, goalId: null });
    }
  };

  const handleGoalDelete = async (goal) => {
    setGoalAction({ loading: true, goalId: goal._id });
    try {
      await goalService.deleteGoal(goal._id);
      setAllProfileGoals(prev => prev.filter(g => g._id !== goal._id));
    } catch (err) {
      console.error('Error deleting goal:', err);
    } finally {
      setGoalAction({ loading: false, goalId: null });
    }
  };

  const handleGoalExtend = async () => {
    if (!extendModal.goal || !extendModal.date) return;
    setGoalAction({ loading: true, goalId: extendModal.goal._id });
    try {
      const newDeadline = new Date(extendModal.date).toISOString();
      await goalService.updateGoal(extendModal.goal._id, { deadline: newDeadline });
      setAllProfileGoals(prev =>
        prev.map(g => g._id === extendModal.goal._id ? { ...g, deadline: newDeadline } : g)
      );
      setExtendModal({ show: false, goal: null, date: '' });
    } catch (err) {
      console.error('Error extending deadline:', err);
    } finally {
      setGoalAction({ loading: false, goalId: null });
    }
  };

  return (
    <div className={styles.page}>
      {/* Top profile header */}
      <section className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.avatarWrapper}>
            {getProfilePictureUrl() ? (
              <img 
                src={getProfilePictureUrl()} 
                alt="Profile" 
                className={styles.avatarImage}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={styles.avatarCircle}
              style={{ display: getProfilePictureUrl() ? 'none' : 'flex' }}
            >
              {user.initials}
            </div>
            <button 
              className={styles.avatarEditBtn}
              onClick={handleProfilePictureClick}
              disabled={uploadingPicture}
              title="Change profile picture"
            >
              {uploadingPicture ? (
                <div className={styles.uploadSpinner}></div>
              ) : (
                <MdCameraAlt size={16} />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              style={{ display: 'none' }}
            />
          </div>
          <div className={styles.headerInfo}>
            {nameEditing ? (
              <div className={styles.nameEditRow}>
                <input
                  className={styles.nameEditInput}
                  value={nameFirst}
                  onChange={(e) => setNameFirst(e.target.value)}
                  placeholder="First name"
                  autoFocus
                />
                <input
                  className={styles.nameEditInput}
                  value={nameLast}
                  onChange={(e) => setNameLast(e.target.value)}
                  placeholder="Last name"
                />
                <button
                  className={styles.nameEditSave}
                  onClick={handleSaveName}
                  disabled={nameSaving || !nameFirst.trim()}
                >
                  {nameSaving ? '…' : 'Save'}
                </button>
                <button className={styles.nameEditCancel} onClick={() => {
                  setNameEditing(false);
                  setNameFirst(currentUser?.profile?.firstName || '');
                  setNameLast(currentUser?.profile?.lastName || '');
                }}>✕</button>
              </div>
            ) : (
              <div className={styles.nameRow}>
                <h1 className={styles.name}>{user.name}</h1>
                <button className={styles.namePencil} onClick={() => setNameEditing(true)} title="Edit name">
                  <MdEdit size={15} />
                </button>
              </div>
            )}
            <div className={styles.tagsRow}>
              <span className={styles.tag}>{user.university}</span>
              <span className={styles.tag}>{user.major}</span>
            </div>
            <p className={styles.memberSince}>
              Member since {user.memberSince}
            </p>
          </div>
        </div>
        <button className={styles.logoutButton} onClick={handleLogout}>
          <MdLogout size={18} style={{marginRight:8}}/>Logout
        </button>
      </section>

      {/* Stats row */}
      <section className={styles.statsRow}>
        <StatCard label="Goals Achieved" value={stats.goalsAchieved} icon={MdFlag} />
        <StatCard label="Hours Studied" value={Math.round(stats.hoursStudied)} icon={MdAccessTime} />
        <StatCard label="Materials Uploaded" value={stats.materialsUploaded} icon={MdUpload} />
        <StatCard label="Active Goals" value={stats.activeGoals} icon={MdPlayCircleOutline} />
      </section>

      {/* Goals section */}
      <section className={styles.goalsSection}>
        <div className={styles.goalsHeader}>
          <div className={styles.goalsTitleRow}>
            <span className={styles.goalsIcon}><MdFlag size={18} style={{ color: '#0073a0' }} /></span>
            <h2 className={styles.sectionTitle}>My Goals</h2>
            <span className={styles.countBadge}>{allProfileGoals.length}</span>
          </div>
        </div>
        <div className={styles.goalsFilterTabs}>
          {['active', 'completed', 'unachieved'].map(tab => (
            <button
              key={tab}
              className={`${styles.filterTab} ${goalFilter === tab ? styles.filterTabActive : ''}`}
              onClick={() => setGoalFilter(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        {profileGoalsLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading goals...</p>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              {goalFilter === 'active' ? 'No active goals. Create one to get started!' :
               goalFilter === 'completed' ? 'No completed goals yet.' :
               'No goals with passed deadlines.'}
            </p>
            {goalFilter === 'active' && (
              <button className={styles.uploadButton} onClick={() => navigate('/app/create-goal')}>
                Create Goal
              </button>
            )}
          </div>
        ) : (
          <div className={styles.goalCardsList}>
            {filteredGoals.map(goal => (
              <div
                key={goal._id}
                className={styles.goalCard}
                onClick={() => navigate(`/app/goals/${goal._id}`)}
              >
                <div className={styles.goalCardMain}>
                  <div className={styles.goalCardHeader}>
                    <p className={styles.goalCardTitle}>{goal.title}</p>
                    <span className={styles.goalSubjectBadge}>{goal.subject}</span>
                  </div>
                  <div className={styles.goalProgressBar}>
                    <div
                      className={styles.goalProgressFill}
                      style={{ width: `${Math.min(Math.round(goal.progress || 0), 100)}%` }}
                    />
                  </div>
                  <div className={styles.goalCardMeta}>
                    {goalFilter === 'completed' && goal.completedCoverage != null ? (
                      <span
                        className={styles.goalCoverageBadge}
                        style={{
                          color: goal.completedCoverage >= 80 ? '#15803d'
                            : goal.completedCoverage >= 50 ? '#b45309' : '#b91c1c'
                        }}
                      >
                        <MdCheckCircle size={13} /> {goal.completedCoverage}% coverage
                      </span>
                    ) : goalFilter === 'completed' && goal.completedAt ? (
                      <span className={styles.goalDeadline}>Completed {formatDate(goal.completedAt)}</span>
                    ) : goal.deadline ? (
                      <span className={styles.goalDeadline}>
                        <MdCalendarToday size={12} />
                        {goalFilter === 'unachieved'
                          ? `Deadline passed ${formatDate(goal.deadline)}`
                          : `Due ${formatDate(goal.deadline)}`}
                      </span>
                    ) : null}
                    <span className={styles.goalProgressText}>{Math.round(goal.progress || 0)}% covered</span>
                  </div>
                </div>

                {goalFilter === 'unachieved' && (
                  <div className={styles.goalActionsRow} onClick={e => e.stopPropagation()}>
                    <button
                      className={styles.goalCompleteBtn}
                      disabled={goalAction.loading && goalAction.goalId === goal._id}
                      onClick={() => handleGoalComplete(goal)}
                    >
                      Complete ({Math.round(goal.progress || 0)}%)
                    </button>
                    <button
                      className={styles.goalExtendBtn}
                      onClick={() => setExtendModal({ show: true, goal, date: '' })}
                    >
                      Extend
                    </button>
                    <button
                      className={styles.goalDeleteBtn}
                      disabled={goalAction.loading && goalAction.goalId === goal._id}
                      onClick={() => handleGoalDelete(goal)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Achievements section */}
      <section className={styles.achievementsCard}>        <div className={styles.achievementsHeader}>
          <div className={styles.achievementsTitleRow}>
            <span className={styles.achievementsIcon}>
              <MdEmojiEvents size={18} style={{ color: '#f59e0b' }} />
            </span>
            <h2 className={styles.sectionTitle}>Achievements</h2>
            <span className={styles.countBadge}>
              {achievements.filter(a => a.unlocked).length}/{achievements.length}
            </span>
          </div>
        </div>
        <div className={styles.achievementsGrid}>
          {achievements.length === 0 ? (
            <p className={styles.emptyText}>Complete activities to earn achievements!</p>
          ) : (
            achievements.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))
          )}
        </div>
      </section>

      {/* Friends strip */}
      <section className={styles.friendsCard}>
        <div className={styles.friendsHeader}>
          <div className={styles.friendsTitleRow}>
            <span className={styles.friendsIcon}><MdPeople size={18} style={{color: '#8b5cf6'}}/></span>
            <h2 className={styles.sectionTitle}>Friends</h2>
          </div>
          <button className={styles.linkButton} onClick={() => navigate('/app/community')}>View All</button>
        </div>
        <div className={styles.friendsRow}>
          {friends.length === 0 ? (
            <p className={styles.emptyText}>No friends yet. Visit the community page to connect!</p>
          ) : (
            friends.map((f) => {
              const u = f.user;
              const name = u?.profile?.firstName
                ? `${u.profile.firstName} ${u.profile.lastName || ''}`.trim()
                : u?.username || 'User';
              const initial = name[0]?.toUpperCase() || 'U';
              const avatarUrl = u?.profile?.avatar
                ? u.profile.avatar.startsWith('http')
                  ? u.profile.avatar
                  : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${u.profile.avatar}`
                : null;
              return (
                <div key={u?._id || name} className={styles.friendPill}>
                  <div className={styles.friendAvatar}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={name} className={styles.friendAvatarImg} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                    ) : null}
                    <span style={{ display: avatarUrl ? 'none' : 'flex' }}>{initial}</span>
                  </div>
                  <span className={styles.friendName}>{name.split(' ')[0]}</span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Materials sections */}
      <section className={styles.materialsGrid}>
        <div className={styles.materialsCard}>
          <div className={styles.materialsHeader}>
            <div className={styles.materialsTitleRow}>
              <span className={styles.materialsIcon}><MdAutoAwesome size={18} style={{color: '#f59e0b'}}/></span>
              <h2 className={styles.sectionTitle}>Public AI-Generated Notes</h2>
              <span className={styles.countBadge}>{aiNotes.length}</span>
            </div>
          </div>
          <div className={styles.materialList}>
            {aiNotesLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Loading AI notes...</p>
              </div>
            ) : aiNotes.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No public AI notes yet. Make notes public from your goals.</p>
              </div>
            ) : (
              aiNotes.map((note) => {
                const textContent = typeof note.textContent === 'string' ? JSON.parse(note.textContent) : note.textContent;
                return (
                  <div key={note._id} className={styles.materialRow}>
                    <div className={styles.materialInfo}>
                      <p className={styles.materialTitle}>{textContent?.title || note.topic || 'AI Notes'}</p>
                      <div className={styles.materialMetaRow}>
                        <span className={styles.materialMeta}>
                          Notes · {formatDate(note.publishedAt || note.createdAt)}
                        </span>
                        <span className={styles.aiTag}>AI Generated</span>
                      </div>
                    </div>
                    <div className={styles.materialActions}>
                      <button
                        className={styles.deleteBtn}
                        onClick={async () => {
                          try {
                            await goalService.toggleContentVisibility(note.goal?._id, note._id);
                            setAiNotes(prev => prev.filter(n => n._id !== note._id));
                          } catch (err) {
                            console.error('Failed to make note private:', err);
                          }
                        }}
                        title="Make Private"
                      >
                        <MdLock size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* My Uploaded Materials - Dynamic */}
        <div className={styles.materialsCard}>
          <div className={styles.materialsHeader}>
            <div className={styles.materialsTitleRow}>
              <span className={styles.materialsIcon}><MdUpload size={18} style={{color: '#0073a0'}}/></span>
              <h2 className={styles.sectionTitle}>Materials Uploaded by Me</h2>
              <span className={styles.countBadge}>{myMaterials.length}</span>
            </div>
          </div>
          <div className={styles.materialList}>
            {materialsLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Loading materials...</p>
              </div>
            ) : myMaterials.length === 0 ? (
              <div className={styles.emptyState}>
                <p>You haven't uploaded any materials yet.</p>
                <button 
                  className={styles.uploadButton}
                  onClick={() => navigate('/app/upload')}
                >
                  <MdUpload size={18} />
                  Upload Material
                </button>
              </div>
            ) : (
              myMaterials.map((material) => (
                <div key={material._id} className={styles.materialRow}>
                  <div className={styles.materialInfo}>
                    <p className={styles.materialTitle}>{material.title}</p>
                    <div className={styles.materialMetaRow}>
                      <span className={styles.materialMeta}>
                        {material.materialType} · {formatDate(material.createdAt)}
                      </span>
                      <span className={styles.visibilityBadge}>
                        {material.visibility === 'public' ? (
                          <><MdVisibility size={14} /> Public</>
                        ) : (
                          <><MdLock size={14} /> Private</>
                        )}
                      </span>
                      <span className={styles.metaPill}>{material.views || 0} views</span>
                    </div>
                  </div>
                  <div className={styles.materialActions}>
                    <button 
                      className={styles.editBtn}
                      onClick={() => handleEditMaterial(material._id)}
                      title="Edit material"
                    >
                      <MdEdit size={18} />
                    </button>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => setDeleteModal({ show: true, material })}
                      title="Delete material"
                    >
                      <MdDelete size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Extend Deadline Modal (for unachieved goals) */}
      {extendModal.show && (
        <div className={styles.modalOverlay} onClick={() => setExtendModal({ show: false, goal: null, date: '' })}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setExtendModal({ show: false, goal: null, date: '' })}
            >
              <MdClose size={20} />
            </button>
            <h2 className={styles.modalTitle}>Extend Deadline</h2>
            <p className={styles.modalText}>
              Choose a new deadline for <strong>"{extendModal.goal?.title}"</strong>
            </p>
            <input
              type="date"
              className={styles.dateInput}
              min={new Date().toISOString().split('T')[0]}
              value={extendModal.date}
              onChange={e => setExtendModal(prev => ({ ...prev, date: e.target.value }))}
            />
            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setExtendModal({ show: false, goal: null, date: '' })}
              >
                Cancel
              </button>
              <button
                className={styles.extendConfirmButton}
                disabled={!extendModal.date || goalAction.loading}
                onClick={handleGoalExtend}
              >
                {goalAction.loading ? 'Saving...' : 'Extend Deadline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className={styles.modalOverlay} onClick={() => !deleteLoading && setDeleteModal({ show: false, material: null })}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button 
              className={styles.modalClose}
              onClick={() => !deleteLoading && setDeleteModal({ show: false, material: null })}
              disabled={deleteLoading}
            >
              <MdClose size={20} />
            </button>
            <div className={styles.modalIcon}>
              <MdWarning size={48} />
            </div>
            <h2 className={styles.modalTitle}>Delete Material</h2>
            <p className={styles.modalText}>
              Are you sure you want to delete <strong>"{deleteModal.material?.title}"</strong>? 
              This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button 
                className={styles.cancelBtn}
                onClick={() => setDeleteModal({ show: false, material: null })}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button 
                className={styles.confirmDeleteBtn}
                onClick={handleDeleteMaterial}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statHeader}>
        <span className={styles.statIcon}>
          <Icon size={20} style={{ color: '#0073a0' }} />
        </span>
        <p className={styles.statLabel}>{label}</p>
      </div>
      <p className={styles.statValue}>{value}</p>
    </div>
  );
}

const LEVEL_COLORS = { 1: '#10b981', 2: '#0073a0', 3: '#f59e0b', 4: '#8b5cf6', 5: '#ef4444' };

function AchievementCard({ achievement }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const isOneTime = !achievement.isTiered;
  // For tiered: tier is stored as a string number like '1','2','3'...
  const currentLevelNum = (!isOneTime && achievement.tier && achievement.tier !== 'one-time')
    ? (parseInt(achievement.tier) || 0)
    : 0;

  const tiersArray = Array.isArray(achievement.tiers) ? achievement.tiers : [];
  const maxLevel = tiersArray.length > 0 ? Math.max(...tiersArray.map(t => t.level)) : 5;
  const isMaxLevel = currentLevelNum >= maxLevel;

  // Badge label + color
  let levelLabel = null;
  let badgeColor = null;
  if (isOneTime && achievement.unlocked) {
    levelLabel = '✓';
    badgeColor = '#16a34a';
  } else if (currentLevelNum > 0) {
    levelLabel = `Lv. ${currentLevelNum}`;
    badgeColor = LEVEL_COLORS[currentLevelNum] || '#6b7280';
  }

  const renderTooltipBody = () => {
    if (isOneTime) {
      const info = achievement.oneTimeTier || {};
      return (
        <div className={styles.tooltipSection}>
          <p className={styles.tooltipSectionLabel}>How to unlock</p>
          <p className={styles.tooltipCriteria}>{info.criteria || achievement.description}</p>
          <div className={styles.tooltipXPRow}>
            <span className={styles.tooltipXP}>+{info.xpReward || 0} XP</span>
            {achievement.unlockedAt && (
              <span className={styles.tooltipUnlocked}>
                ✓ {new Date(achievement.unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      );
    }

    // Show only the relevant next level (or the max level if fully completed)
    const targetTier = isMaxLevel
      ? tiersArray.find(t => t.level === currentLevelNum)
      : tiersArray.find(t => t.level === currentLevelNum + 1);

    if (!targetTier) return null;

    const rowClass = isMaxLevel ? styles.tooltipLevelEarned : styles.tooltipLevelNext;

    return (
      <>
        <div className={styles.tooltipLevels}>
          <div className={`${styles.tooltipLevelRow} ${rowClass}`}>
            <span
              className={styles.tooltipLevelBadge}
              style={isMaxLevel ? { background: LEVEL_COLORS[targetTier.level] || '#6b7280' } : undefined}
            >
              {isMaxLevel ? '✓' : targetTier.level}
            </span>
            <div className={styles.tooltipLevelInfo}>
              <span className={styles.tooltipLevelLabel}>{targetTier.description || `Level ${targetTier.level}`}</span>
              <span className={styles.tooltipLevelCriteria}>{targetTier.criteria || ''}</span>
            </div>
            <span className={styles.tooltipXPBadge}>+{targetTier.xpReward || 0} XP</span>
          </div>
        </div>
        {achievement.unlockedAt && (
          <p className={styles.tooltipUnlocked}>
            Lv.{currentLevelNum} unlocked {new Date(achievement.unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
        {isMaxLevel && (
          <p className={styles.tooltipMaxMsg}>🏆 All levels unlocked!</p>
        )}
      </>
    );
  };

  return (
    <div
      className={`${styles.achievementCard} ${!achievement.unlocked ? styles.locked : ''}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {levelLabel && (
        <div className={styles.levelBadge} style={{ background: badgeColor }}>
          {levelLabel}
        </div>
      )}
      <div className={styles.achievementImageWrapper}>
        <img
          src={achievement.image}
          alt={achievement.name}
          className={styles.achievementImage}
        />
        {!achievement.unlocked && (
          <div className={styles.lockOverlay}>
            <MdLock size={24} />
          </div>
        )}
      </div>
      <p className={styles.achievementName}>{achievement.name}</p>

      {showTooltip && (
        <div className={styles.achievementTooltip}>
          <p className={styles.tooltipTitle}>{achievement.name}</p>
          <p className={styles.tooltipDesc}>{achievement.description}</p>
          {renderTooltipBody()}
        </div>
      )}
    </div>
  );
}

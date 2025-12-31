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
} from "react-icons/md";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";
import materialService from "../services/materialService";

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

export default function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Get current user from authService
  const [currentUser, setCurrentUser] = useState(authService.getUser());
  const [uploadingPicture, setUploadingPicture] = useState(false);
  
  // Dynamic user data
  const user = {
    name: currentUser?.profile?.firstName && currentUser?.profile?.lastName 
      ? `${currentUser.profile.firstName} ${currentUser.profile.lastName}`
      : currentUser?.username || "User",
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

  // Achievement data with level system - in a real app, this would come from the backend
  const achievements = [
    {
      id: 1,
      name: "Welcome Aboard",
      description: "Create your account and join Mindora",
      image: welcomeAboardImg,
      unlocked: true,
      hasLevels: false
    },
    {
      id: 2,
      name: "First Steps",
      description: "Complete your first study session",
      image: firstStepsImg,
      unlocked: true,
      hasLevels: false
    },
    {
      id: 3,
      name: "Goal Architect",
      description: "Create learning goals",
      image: goalArchitectImg,
      unlocked: true,
      currentLevel: 2,
      maxLevel: 5,
      currentProgress: 8,
      nextLevelTarget: 20,
      levels: [
        { level: 1, target: 1, description: "Create 1 goal" },
        { level: 2, target: 5, description: "Create 5 goals" },
        { level: 3, target: 20, description: "Create 20 goals" },
        { level: 4, target: 50, description: "Create 50 goals" },
        { level: 5, target: 100, description: "Create 100 goals" }
      ]
    },
    {
      id: 4,
      name: "Goal Crusher",
      description: "Complete learning goals",
      image: goalCrusherImg,
      unlocked: false,
      currentLevel: 0,
      maxLevel: 5,
      currentProgress: 3,
      nextLevelTarget: 5,
      levels: [
        { level: 1, target: 5, description: "Complete 5 goals" },
        { level: 2, target: 10, description: "Complete 10 goals" },
        { level: 3, target: 25, description: "Complete 25 goals" },
        { level: 4, target: 50, description: "Complete 50 goals" },
        { level: 5, target: 100, description: "Complete 100 goals" }
      ]
    },
    {
      id: 5,
      name: "Quiz Master",
      description: "Score 100% on quizzes",
      image: quizMasterImg,
      unlocked: true,
      currentLevel: 3,
      maxLevel: 5,
      currentProgress: 15,
      nextLevelTarget: 25,
      levels: [
        { level: 1, target: 1, description: "Perfect score on 1 quiz" },
        { level: 2, target: 5, description: "Perfect score on 5 quizzes" },
        { level: 3, target: 10, description: "Perfect score on 10 quizzes" },
        { level: 4, target: 25, description: "Perfect score on 25 quizzes" },
        { level: 5, target: 50, description: "Perfect score on 50 quizzes" }
      ]
    },
    {
      id: 6,
      name: "Memory Master",
      description: "Review flashcards",
      image: memoryMasterImg,
      unlocked: false,
      currentLevel: 0,
      maxLevel: 5,
      currentProgress: 45,
      nextLevelTarget: 100,
      levels: [
        { level: 1, target: 100, description: "Review 100 flashcards" },
        { level: 2, target: 250, description: "Review 250 flashcards" },
        { level: 3, target: 500, description: "Review 500 flashcards" },
        { level: 4, target: 1000, description: "Review 1000 flashcards" },
        { level: 5, target: 2500, description: "Review 2500 flashcards" }
      ]
    },
    {
      id: 7,
      name: "Morning Champion",
      description: "Study before 8 AM consistently",
      image: morningChampionImg,
      unlocked: false,
      currentLevel: 0,
      maxLevel: 4,
      currentProgress: 3,
      nextLevelTarget: 7,
      levels: [
        { level: 1, target: 7, description: "7-day morning streak" },
        { level: 2, target: 15, description: "15-day morning streak" },
        { level: 3, target: 30, description: "30-day morning streak" },
        { level: 4, target: 60, description: "60-day morning streak" }
      ]
    },
    {
      id: 8,
      name: "Streak Master",
      description: "Maintain daily study streak",
      image: streakMasterImg,
      unlocked: false,
      currentLevel: 0,
      maxLevel: 5,
      currentProgress: 12,
      nextLevelTarget: 30,
      levels: [
        { level: 1, target: 30, description: "30-day streak" },
        { level: 2, target: 60, description: "60-day streak" },
        { level: 3, target: 100, description: "100-day streak" },
        { level: 4, target: 180, description: "180-day streak" },
        { level: 5, target: 365, description: "365-day streak" }
      ]
    },
    {
      id: 9,
      name: "Reading Bird",
      description: "Upload and study materials",
      image: readingBirdImg,
      unlocked: true,
      currentLevel: 2,
      maxLevel: 5,
      currentProgress: 24,
      nextLevelTarget: 50,
      levels: [
        { level: 1, target: 5, description: "Upload 5 materials" },
        { level: 2, target: 20, description: "Upload 20 materials" },
        { level: 3, target: 50, description: "Upload 50 materials" },
        { level: 4, target: 100, description: "Upload 100 materials" },
        { level: 5, target: 250, description: "Upload 250 materials" }
      ]
    },
    {
      id: 10,
      name: "Teaching Bird",
      description: "Share materials with the community",
      image: teachingBirdImg,
      unlocked: false,
      currentLevel: 0,
      maxLevel: 5,
      currentProgress: 4,
      nextLevelTarget: 10,
      levels: [
        { level: 1, target: 10, description: "Share 10 materials" },
        { level: 2, target: 25, description: "Share 25 materials" },
        { level: 3, target: 50, description: "Share 50 materials" },
        { level: 4, target: 100, description: "Share 100 materials" },
        { level: 5, target: 250, description: "Share 250 materials" }
      ]
    },
  ];

  // Fetch user's materials
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

    fetchMyMaterials();
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
            <h1 className={styles.name}>{user.name}</h1>
            {/* email removed as requested */}
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
        <StatCard label="Goals Achieved" value="12" icon={MdFlag} />
        <StatCard label="Hours Studied" value="156" icon={MdAccessTime} />
        <StatCard label="Materials Uploaded" value="24" icon={MdUpload} />
        <StatCard label="Active Goals" value="3" icon={MdPlayCircleOutline} />
      </section>

      {/* Achievements section */}
      <section className={styles.achievementsCard}>
        <div className={styles.achievementsHeader}>
          <div className={styles.achievementsTitleRow}>
            <span className={styles.achievementsIcon}>
              <MdEmojiEvents size={18} style={{ color: '#f59e0b' }} />
            </span>
            <h2 className={styles.sectionTitle}>Achievements</h2>
            <span className={styles.countBadge}>
              {achievements.filter(a => a.unlocked || (a.hasLevels !== false && a.currentLevel > 0)).length}/{achievements.length}
            </span>
          </div>
        </div>
        <div className={styles.achievementsGrid}>
          {achievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      </section>

      {/* Friends strip */}
      <section className={styles.friendsCard}>
        <div className={styles.friendsHeader}>
          <div className={styles.friendsTitleRow}>
            <span className={styles.friendsIcon}><MdPeople size={18} style={{color: '#8b5cf6'}}/></span>
            <h2 className={styles.sectionTitle}>Friends</h2>
          </div>
          <button className={styles.linkButton}>View All</button>
        </div>
        <div className={styles.friendsRow}>
          {["Sarah", "Mike", "Emily", "James", "Anna"].map((name) => (
            <div key={name} className={styles.friendPill}>
              <div className={styles.friendAvatar}>{name[0]}</div>
              <span className={styles.friendName}>{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Materials sections */}
      <section className={styles.materialsGrid}>
        <div className={styles.materialsCard}>
          <div className={styles.materialsHeader}>
            <div className={styles.materialsTitleRow}>
              <span className={styles.materialsIcon}><MdAutoAwesome size={18} style={{color: '#f59e0b'}}/></span>
              <h2 className={styles.sectionTitle}>Private AI-Generated Materials</h2>
              <span className={styles.countBadge}>3</span>
            </div>
          </div>
          <div className={styles.materialList}>
            <MaterialRow
              title="React Hooks Personal Notes"
              type="PDF"
              date="Oct 20, 2025"
              aiTag
              canDelete
            />
            <MaterialRow
              title="Algorithm Practice Problems"
              type="Document"
              date="Oct 18, 2025"
              aiTag
              canDelete
            />
            <MaterialRow
              title="ML Flashcards Set"
              type="Flashcards"
              date="Oct 15, 2025"
              aiTag
              canDelete
            />
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

function MaterialRow({ title, type, date, meta, aiTag, actionLabel, canDelete }) {
  return (
    <div className={styles.materialRow}>
      <div>
        <p className={styles.materialTitle}>{title}</p>
        <div className={styles.materialMetaRow}>
          <span className={styles.materialMeta}>
            {type} · {date}
          </span>
          {aiTag && <span className={styles.aiTag}>AI Generated</span>}
          {meta && <span className={styles.metaPill}>{meta}</span>}
        </div>
      </div>

      <div className={styles.materialActions}>
        {actionLabel && (
          <button className={styles.linkButton}>{actionLabel}</button>
        )}
        {canDelete && (
          <button className={styles.iconButton} aria-label="Delete material">
            <MdDelete size={18} style={{ color: '#ef4444' }} />
          </button>
        )}
      </div>
    </div>
  );
}

function AchievementCard({ achievement }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Handle achievements without levels
  if (achievement.hasLevels === false) {
    return (
      <div 
        className={`${styles.achievementCard} ${!achievement.unlocked ? styles.locked : ''}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
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
            <p className={styles.tooltipText}>{achievement.description}</p>
          </div>
        )}
      </div>
    );
  }
  
  // Calculate progress percentage for current level
  const progressPercentage = achievement.currentLevel === 0
    ? (achievement.currentProgress / achievement.nextLevelTarget) * 100
    : achievement.currentLevel === achievement.maxLevel
    ? 100
    : ((achievement.currentProgress - achievement.levels[achievement.currentLevel - 1].target) / 
       (achievement.nextLevelTarget - achievement.levels[achievement.currentLevel - 1].target)) * 100;

  // Determine if achievement is unlocked (has at least level 1)
  const isUnlocked = achievement.currentLevel > 0;
  const isMaxLevel = achievement.currentLevel === achievement.maxLevel;

  return (
    <div 
      className={`${styles.achievementCard} ${!isUnlocked ? styles.locked : ''}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {isUnlocked && (
        <div className={styles.levelBadge}>
          Lv {achievement.currentLevel}
        </div>
      )}
      <div className={styles.achievementImageWrapper}>
        <img 
          src={achievement.image} 
          alt={achievement.name}
          className={styles.achievementImage}
        />
        {!isUnlocked && (
          <div className={styles.lockOverlay}>
            <MdLock size={24} />
          </div>
        )}
      </div>
      
      <p className={styles.achievementName}>{achievement.name}</p>
      
      {/* Progress bar */}
      {isUnlocked && !isMaxLevel && (
        <div className={styles.achievementProgressContainer}>
          <div className={styles.achievementProgressBar}>
            <div 
              className={styles.achievementProgressFill}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
          <p className={styles.achievementProgressText}>
            {achievement.currentProgress} / {achievement.nextLevelTarget}
          </p>
        </div>
      )}
      
      {!isUnlocked && (
        <div className={styles.achievementProgressContainer}>
          <div className={styles.achievementProgressBar}>
            <div 
              className={styles.achievementProgressFill}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
          <p className={styles.achievementProgressText}>
            {achievement.currentProgress} / {achievement.nextLevelTarget}
          </p>
        </div>
      )}
      
      {isMaxLevel && (
        <p className={styles.achievementMaxLevel}>MAX LEVEL</p>
      )}
      
      {showTooltip && (
        <div className={styles.achievementTooltip}>
          <p className={styles.tooltipTitle}>{achievement.name}</p>
          <p className={styles.tooltipText}>{achievement.description}</p>
          <div className={styles.tooltipLevels}>
            {achievement.levels.map((level) => (
              <div 
                key={level.level} 
                className={`${styles.tooltipLevel} ${
                  level.level <= achievement.currentLevel ? styles.tooltipLevelComplete : ''
                }`}
              >
                <span className={styles.tooltipLevelNumber}>Lv {level.level}</span>
                <span className={styles.tooltipLevelDesc}>{level.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

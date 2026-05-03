import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import Lottie from "lottie-react";
import GoalProgressPath from "../features/goals/GoalProgressPath";
import GoalWizardStages from "../features/goals/GoalWizardStages";
import GoalInfoModal from "../features/goals/GoalInfoModal";
import birdAnimation from "../assets/animations/bird-thinking.json";
import goalService from "../services/goalService";
import authService from "../services/authService";
import styles from "./CreateGoalPage.module.css";

export default function CreateGoalPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionTimeoutRef = useRef(null);
  const [goalLimitReached, setGoalLimitReached] = useState(false);
  const isFullyVerified = authService.isFullyVerified();
  const [formData, setFormData] = useState({
    goalTitle: "",
    subject: "",
    targetMarks: "",
    deadline: "",
    materials: [],
  });

  // Show modal automatically when page loads
  useEffect(() => {
    setShowInfoModal(true);
  }, []);

  // For non-verified users: check if they already have a goal
  useEffect(() => {
    if (!isFullyVerified) {
      goalService.getMyGoals({ limit: 5 }).then(res => {
        const active = (res.data || []).filter(g => g.status !== 'abandoned');
        if (active.length >= 1) setGoalLimitReached(true);
      }).catch(() => {});
    }
  }, [isFullyVerified]);

  // Fetch AI suggestions with debounce
  const fetchSuggestions = useCallback(async (goalTitle, subject) => {
    if (!goalTitle || goalTitle.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const response = await goalService.getGoalSuggestions(goalTitle, subject);
      if (response.success && response.data.suggestions?.length > 0) {
        setSuggestions(response.data.suggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error('Failed to get suggestions:', err);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Handle goal title change with debounced suggestions
  const handleGoalTitleChange = useCallback((value) => {
    setFormData(prev => ({ ...prev, goalTitle: value }));
    
    // Clear previous timeout
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }
    
    // Debounce: wait 500ms after user stops typing
    suggestionTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(value, formData.subject);
    }, 500);
  }, [fetchSuggestions, formData.subject]);

  // Select a suggestion
  const selectSuggestion = useCallback((suggestion) => {
    setFormData(prev => ({ ...prev, goalTitle: suggestion }));
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, []);

  const totalSteps = 4;

  const handleNext = () => {
    // Validate current step before proceeding
    if (currentStep === 1 && (!formData.goalTitle || !formData.subject)) {
      alert("Please fill in your goal and subject");
      return;
    }
    if (currentStep === 2 && !formData.deadline) {
      alert("Please select a deadline");
      return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData({
      ...formData,
      materials: [...formData.materials, ...files],
    });
  };

  const removeFile = (index) => {
    const newMaterials = formData.materials.filter((_, i) => i !== index);
    setFormData({ ...formData, materials: newMaterials });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('goalTitle', formData.goalTitle);
      submitData.append('subject', formData.subject);
      submitData.append('targetMarks', formData.targetMarks || '');
      submitData.append('deadline', formData.deadline);

      // Append files
      formData.materials.forEach((file) => {
        submitData.append('materials', file);
      });

      // Call API
      const response = await goalService.createGoalWithMaterials(submitData);

      if (response.success) {
        // Navigate to the new goal page
        navigate(`/app/goals/${response.data._id}`);
      }
    } catch (err) {
      console.error('Create goal error:', err);
      setError(err.message || 'Failed to create goal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateDaysLeft = () => {
    if (!formData.deadline) return null;
    const today = new Date();
    const target = new Date(formData.deadline);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className={styles.page}>
      {!isFullyVerified && goalLimitReached && (
        <div className={styles.goalLimitWall}>
          <div className={styles.goalLimitIcon}>🎯</div>
          <h2 className={styles.goalLimitTitle}>Goal Limit Reached</h2>
          <p className={styles.goalLimitText}>
            Unverified accounts can only have <strong>1 active goal</strong>. Verify your account to create unlimited goals.
          </p>
          <div className={styles.goalLimitBtns}>
            <button className={styles.goalLimitVerifyBtn} onClick={() => navigate('/app/profile')}>
              Get Verified
            </button>
            <button className={styles.goalLimitBackBtn} onClick={() => navigate(-1)}>
              Go Back
            </button>
          </div>
        </div>
      )}
      {(!goalLimitReached || isFullyVerified) && (
        <>
      <GoalInfoModal 
        isOpen={showInfoModal} 
        onClose={() => setShowInfoModal(false)} 
      />

      <div className={styles.mainLayout}>
        <div className={styles.wizardContainer}>
          <GoalProgressPath currentStep={currentStep} totalSteps={totalSteps} />

          <GoalWizardStages
            currentStep={currentStep}
            formData={formData}
            handleChange={handleChange}
            handleGoalTitleChange={handleGoalTitleChange}
            handleFileUpload={handleFileUpload}
            removeFile={removeFile}
            calculateDaysLeft={calculateDaysLeft}
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            loadingSuggestions={loadingSuggestions}
            selectSuggestion={selectSuggestion}
            setShowSuggestions={setShowSuggestions}
          />

        {/* Navigation Buttons */}
        <div className={styles.wizardActions}>
          {currentStep > 1 && (
            <button
              type="button"
              className={styles.btnBack}
              onClick={handleBack}
            >
              ← Back
            </button>
          )}
          <div className={styles.spacer} />
          {currentStep < totalSteps ? (
            <button
              type="button"
              className={styles.btnNext}
              onClick={handleNext}
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              className={styles.btnLaunch}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? '⏳ Creating...' : '🚀 Create My Goal'}
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}
      </div>

        {/* Bird Animation */}
        <div className={styles.animationSpace}>
          <Lottie 
            animationData={birdAnimation} 
            loop={true}
            className={styles.birdAnimation}
          />
        </div>
      </div>
        </>
      )}
    </div>
  );
}

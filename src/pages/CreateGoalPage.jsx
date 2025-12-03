import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Lottie from "lottie-react";
import GoalProgressPath from "../features/goals/GoalProgressPath";
import GoalWizardStages from "../features/goals/GoalWizardStages";
import GoalInfoModal from "../features/goals/GoalInfoModal";
import birdAnimation from "../assets/animations/bird-thinking.json";
import styles from "./CreateGoalPage.module.css";

export default function CreateGoalPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showInfoModal, setShowInfoModal] = useState(false);
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

  const handleSubmit = () => {
    // later: send to backend
    console.log("Goal created:", formData);
    navigate("/app/dashboard");
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
            handleFileUpload={handleFileUpload}
            removeFile={removeFile}
            calculateDaysLeft={calculateDaysLeft}
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
            >
              🚀 Create My Goal
            </button>
          )}
        </div>
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
    </div>
  );
}

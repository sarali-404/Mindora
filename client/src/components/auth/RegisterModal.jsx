import { useState, useRef } from 'react';
import styles from './RegisterModal.module.css';

const RegisterModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthday: '',
    gender: '',
    
    // Academic Info
    university: '',
    city: '',
    degreeProgram: '',
    studyYear: '',
    
    // Optional Info
    howDidYouKnow: '',
    
    // ID Verification
    idPhoto: null
  });
  
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  const steps = [
    { number: 1, title: 'Basic Information', description: 'Tell us about yourself' },
    { number: 2, title: 'Academic Details', description: 'Your university information' },
    { number: 3, title: 'Additional Info', description: 'Help us know you better' },
    { number: 4, title: 'ID Verification', description: 'Verify your student identity' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please ensure you have granted camera permissions.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        setCapturedImage(URL.createObjectURL(blob));
        setFormData(prev => ({
          ...prev,
          idPhoto: blob
        }));
      }, 'image/jpeg', 0.8);
      
      // Stop camera
      const stream = video.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setFormData(prev => ({
      ...prev,
      idPhoto: null
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentStep === 4) {
      console.log('Registration completed:', formData);
      // Handle registration logic here
      onClose(); // Close modal after successful registration
    }
  };

  if (!isOpen) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className={styles.stepContent}>
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder=" "
                  required
                />
                <label htmlFor="name" className={styles.label}>Full Name</label>
              </div>
              <div className={styles.inputGroup}>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder=" "
                  required
                />
                <label htmlFor="email" className={styles.label}>Email Address</label>
              </div>
            </div>

            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <input
                  type="password"
                  name="password"
                  id="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder=" "
                  required
                />
                <label htmlFor="password" className={styles.label}>Password</label>
              </div>
              <div className={styles.inputGroup}>
                <input
                  type="password"
                  name="confirmPassword"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder=" "
                  required
                />
                <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
              </div>
            </div>

            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <input
                  type="date"
                  name="birthday"
                  id="birthday"
                  value={formData.birthday}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                />
                <label htmlFor="birthday" className={styles.label}>Date of Birth</label>
              </div>
              <div className={styles.inputGroup}>
                <select
                  name="gender"
                  id="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={styles.select}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className={styles.stepContent}>
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  name="university"
                  id="university"
                  value={formData.university}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder=" "
                  required
                />
                <label htmlFor="university" className={styles.label}>University</label>
              </div>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  name="city"
                  id="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder=" "
                  required
                />
                <label htmlFor="city" className={styles.label}>City</label>
              </div>
            </div>

            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  name="degreeProgram"
                  id="degreeProgram"
                  value={formData.degreeProgram}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder=" "
                  required
                />
                <label htmlFor="degreeProgram" className={styles.label}>Degree Program</label>
              </div>
              <div className={styles.inputGroup}>
                <select
                  name="studyYear"
                  id="studyYear"
                  value={formData.studyYear}
                  onChange={handleInputChange}
                  className={styles.select}
                  required
                >
                  <option value="">Select Year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                  <option value="5">5th Year</option>
                  <option value="graduate">Graduate</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className={styles.stepContent}>
            <div className={styles.inputGroup}>
              <select
                name="howDidYouKnow"
                id="howDidYouKnow"
                value={formData.howDidYouKnow}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="">How did you hear about Mindora? (Optional)</option>
                <option value="friend">Friend recommendation</option>
                <option value="social-media">Social Media</option>
                <option value="university">University announcement</option>
                <option value="search">Google Search</option>
                <option value="advertisement">Advertisement</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className={styles.optionalNote}>
              <p>This information helps us improve our outreach. You can skip this step if you prefer.</p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className={styles.stepContent}>
            <div className={styles.cameraSection}>
              <h3 className={styles.cameraTitle}>Student ID Verification</h3>
              <p className={styles.cameraDescription}>
                Please take a clear photo of your student ID card or any university document 
                that verifies your student status.
              </p>

              {!cameraActive && !capturedImage && (
                <button type="button" onClick={startCamera} className={styles.cameraButton}>
                  <svg className={styles.cameraIcon} viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M12 15.2l3.2-2.2a.75.75 0 01.8 1.2L12 16.8 8 14.2a.75.75 0 01.8-1.2L12 15.2z"/>
                    <path fill="currentColor" d="M12 9a3 3 0 100 6 3 3 0 000-6zM10.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"/>
                    <path fill="currentColor" d="M17.25 6.75h-1.5L15 5.25A2.25 2.25 0 0012.75 3h-1.5A2.25 2.25 0 009 5.25l-.75 1.5h-1.5A2.25 2.25 0 004.5 9v7.5A2.25 2.25 0 006.75 18.75h10.5A2.25 2.25 0 0019.5 16.5V9a2.25 2.25 0 00-2.25-2.25zM18 16.5a.75.75 0 01-.75.75H6.75A.75.75 0 016 16.5V9a.75.75 0 01.75-.75h2.5L10 6.75a.75.75 0 01.75-.75h2.5a.75.75 0 01.75.75l.75 1.5h2.5A.75.75 0 0118 9v7.5z"/>
                  </svg>
                  Start Camera
                </button>
              )}

              {cameraActive && (
                <div className={styles.cameraContainer}>
                  <video ref={videoRef} autoPlay playsInline className={styles.videoElement} />
                  <button type="button" onClick={capturePhoto} className={styles.captureButton}>
                    Capture Photo
                  </button>
                </div>
              )}

              {capturedImage && (
                <div className={styles.capturedContainer}>
                  <img src={capturedImage} alt="Captured ID" className={styles.capturedImage} />
                  <div className={styles.captureActions}>
                    <button type="button" onClick={retakePhoto} className={styles.retakeButton}>
                      Retake Photo
                    </button>
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className={styles.closeButton} onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className={styles.registerCard}>
        {/* Header */}
        <div className={styles.header}>
          <button onClick={onSwitchToLogin} className={styles.backButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Login
          </button>
          <h1 className={styles.title}>Create Your Account</h1>
          <p className={styles.subtitle}>Join the Mindora learning community</p>
        </div>

        {/* Progress Steps */}
        <div className={styles.progressContainer}>
          {steps.map((step) => (
            <div 
              key={step.number} 
              className={`${styles.progressStep} ${
                step.number === currentStep ? styles.active : 
                step.number < currentStep ? styles.completed : ''
              }`}
            >
              <div className={styles.stepNumber}>
                {step.number < currentStep ? '✓' : step.number}
              </div>
              <div className={styles.stepInfo}>
                <div className={styles.stepTitle}>{step.title}</div>
                <div className={styles.stepDescription}>{step.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className={styles.navigationButtons}>
            {currentStep > 1 && (
              <button type="button" onClick={prevStep} className={styles.prevButton}>
                Previous
              </button>
            )}
            
            {currentStep < 4 ? (
              <button type="button" onClick={nextStep} className={styles.nextButton}>
                Next Step
              </button>
            ) : (
              <button type="submit" className={styles.submitButton}>
                Create Account
              </button>
            )}
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;
import { useState, useRef, useEffect } from 'react';
import styles from './RegisterModal.module.css';
import authService from '../../services/authService.js';

const RegisterModal = ({ isOpen, onClose, onSwitchToLogin, initialData }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [userId, setUserId] = useState(null);
  
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false
  });
  
  const [formData, setFormData] = useState({
    // Step 1: Account
    email: '',
    password: '',
    confirmPassword: '',
    
    // Step 2: Academic Info
    university: '',
    city: '',
    degreeProgram: '',
    studyYear: '',
    
    // Step 3: Personal Info
    firstName: '',
    lastName: '',
    birthday: '',
    gender: '',
    howDidYouKnow: '',
    
    // Step 4: ID Verification
    idPhoto: null
  });
  
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadMethod, setUploadMethod] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const googleButtonRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Check for existing registration data on mount
  useEffect(() => {
    if (isOpen) {
      // First check initialData (from login modal redirect)
      if (initialData) {
        console.log('InitialData received:', initialData);
        
        // Handle continueRegistration from login
        if (initialData.continueRegistration) {
          setUserId(initialData.userId);
          setCurrentStep(initialData.startStep || 2);
        }
        
        // Handle googleUser from login modal
        if (initialData.googleUser) {
          const user = initialData.googleUser;
          setUserId(user.id || user._id || initialData.userId);
          setCurrentStep(initialData.startStep || 2);
          if (user.profile) {
            setFormData(prev => ({
              ...prev,
              firstName: user.profile.firstName || '',
              lastName: user.profile.lastName || ''
            }));
          }
        }
      }
      
      // Then check stored registration data
      const regData = authService.getRegistrationData();
      console.log('Registration data from storage:', regData);
      
      if (regData && regData.userId) {
        setUserId(regData.userId);
        if (regData.registrationStep && regData.registrationStep > 1) {
          setCurrentStep(regData.registrationStep);
        }
        if (regData.profile) {
          setFormData(prev => ({
            ...prev,
            firstName: regData.profile.firstName || prev.firstName || '',
            lastName: regData.profile.lastName || prev.lastName || ''
          }));
        }
      }
    }
  }, [isOpen, initialData]);

  // Initialize Google Sign-In
  useEffect(() => {
    const initGoogle = () => {
      if (window.google && googleButtonRef.current && currentStep === 1) {
        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleGoogleCallback,
          });
          
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'signup_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 320
          });
        } catch (err) {
          console.log('Google init error:', err);
        }
      }
    };

    if (isOpen && currentStep === 1) {
      if (!window.google) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initGoogle;
        document.body.appendChild(script);
      } else {
        setTimeout(initGoogle, 100);
      }
    }
  }, [isOpen, currentStep]);

  const handleGoogleCallback = async (response) => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await authService.googleAuth(response.credential);
      
      if (result.success) {
        if (result.data.continueRegistration) {
          // New user or incomplete registration - go to step 2
          setUserId(result.data.userId);
          setFormData(prev => ({
            ...prev,
            firstName: result.data.profile?.firstName || '',
            lastName: result.data.profile?.lastName || ''
          }));
          setCurrentStep(result.data.registrationStep || 2);
        } else if (result.data.pendingVerification) {
          // Already submitted, pending verification
          setRegistrationComplete(true);
        } else if (result.data.isLoggedIn) {
          // Verified user - redirect to dashboard
          onClose();
          window.location.href = '/app/dashboard';
        }
      }
    } catch (err) {
      console.error('Google auth error:', err);
      setError(err.message || 'Google sign-up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'password') {
      setPasswordValidation({
        minLength: value.length >= 6,
        hasUpperCase: /[A-Z]/.test(value),
        hasLowerCase: /[a-z]/.test(value),
        hasNumber: /\d/.test(value)
      });
    }
  };

  const isPasswordValid = () => {
    return Object.values(passwordValidation).every(v => v);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email || !formData.password) {
      setError('Email and password are required.');
      return;
    }
    
    if (!isPasswordValid()) {
      setError('Please meet all password requirements.');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await authService.createAccount({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });
      
      if (response.success) {
        setUserId(response.data.userId);
        setCurrentStep(2);
      }
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Check for userId
    if (!userId) {
      // Try to get from registration data
      const regData = authService.getRegistrationData();
      if (regData?.userId) {
        setUserId(regData.userId);
      } else {
        setError('Session expired. Please start the registration process again.');
        setIsLoading(false);
        return;
      }
    }
    
    const currentUserId = userId || authService.getRegistrationData()?.userId;
    console.log('Submitting step', currentStep, 'for userId:', currentUserId);
    
    try {
      let profileData = {};
      let idPhoto = null;
      
      switch (currentStep) {
        case 2:
          profileData = {
            university: formData.university,
            city: formData.city,
            degreeProgram: formData.degreeProgram,
            studyYear: formData.studyYear
          };
          break;
          
        case 3:
          profileData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            birthday: formData.birthday,
            gender: formData.gender,
            howDidYouKnow: formData.howDidYouKnow
          };
          break;
          
        case 4:
          idPhoto = formData.idPhoto;
          if (!idPhoto) {
            setError('Please upload or capture your ID photo.');
            setIsLoading(false);
            return;
          }
          break;
      }
      
      const requestPayload = {
        userId: currentUserId,
        step: currentStep,
        profileData,
        idPhoto
      };
      
      console.log('Update profile payload:', requestPayload);
      
      const response = await authService.updateProfile(requestPayload);
      
      if (response.success) {
        if (response.data.registrationComplete) {
          setRegistrationComplete(true);
          authService.clearRegistrationData();
        } else {
          setCurrentStep(response.data.registrationStep);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setIsLoading(false);
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
        setUploadMethod('camera');
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
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
        const reader = new FileReader();
        reader.onloadend = () => {
          setCapturedImage(reader.result);
          setFormData(prev => ({ ...prev, idPhoto: reader.result }));
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.8);
      
      const stream = video.srcObject;
      stream.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result);
        setFormData(prev => ({ ...prev, idPhoto: reader.result }));
        setUploadMethod('upload');
      };
      reader.readAsDataURL(file);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setUploadMethod(null);
    setFormData(prev => ({ ...prev, idPhoto: null }));
    if (cameraActive && videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setCurrentStep(1);
    setError('');
    setUserId(null);
    setRegistrationComplete(false);
    setCapturedImage(null);
    setUploadMethod(null);
    setCameraActive(false);
    setFormData({
      email: '', password: '', confirmPassword: '',
      university: '', city: '', degreeProgram: '', studyYear: '',
      firstName: '', lastName: '', birthday: '', gender: '', howDidYouKnow: '',
      idPhoto: null
    });
    onClose();
  };

  if (!isOpen) return null;

  // Registration Complete Screen
  if (registrationComplete) {
    return (
      <div className={styles.modalOverlay} onClick={handleClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <button className={styles.closeButton} onClick={handleClose}>×</button>
          
          <div className={styles.successScreen}>
            <div className={styles.successIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            
            <h2>Registration Submitted!</h2>
            
            <p className={styles.successMessage}>
              Your account has been created and is <strong>pending verification</strong>.
            </p>
            
            <div className={styles.infoBox}>
              <div className={styles.infoItem}>
                <span>🔍</span>
                <span>Our team will review your ID verification</span>
              </div>
              <div className={styles.infoItem}>
                <span>⏱️</span>
                <span>This typically takes 24-48 hours</span>
              </div>
              <div className={styles.infoItem}>
                <span>✉️</span>
                <span>You'll receive an email once approved</span>
              </div>
            </div>
            
            <button className={styles.primaryButton} onClick={handleClose}>
              Got it!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Create Account
  if (currentStep === 1) {
    return (
      <div className={styles.modalOverlay} onClick={handleClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <button className={styles.closeButton} onClick={handleClose}>×</button>
          
          <div className={styles.header}>
            <h2>Create Account</h2>
            <p>Join Mindora and start your learning journey</p>
          </div>
          
          {error && <div className={styles.error}>{error}</div>}
          
          {/* Google Sign Up */}
          <div className={styles.googleSection}>
            <div ref={googleButtonRef} className={styles.googleButton}></div>
          </div>
          
          <div className={styles.divider}>
            <span>or sign up with email</span>
          </div>
          
          {/* Email Sign Up Form */}
          <form onSubmit={handleCreateAccount} className={styles.form}>
            <div className={styles.inputGroup}>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={styles.input}
                placeholder=" "
                required
              />
              <label className={styles.label}>Email Address</label>
            </div>
            
            <div className={styles.inputGroup}>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={styles.input}
                placeholder=" "
                required
              />
              <label className={styles.label}>Password</label>
              
              {formData.password && (
                <div className={styles.passwordRequirements}>
                  <div className={passwordValidation.minLength ? styles.met : styles.unmet}>
                    {passwordValidation.minLength ? '✓' : '○'} At least 6 characters
                  </div>
                  <div className={passwordValidation.hasUpperCase ? styles.met : styles.unmet}>
                    {passwordValidation.hasUpperCase ? '✓' : '○'} One uppercase letter
                  </div>
                  <div className={passwordValidation.hasLowerCase ? styles.met : styles.unmet}>
                    {passwordValidation.hasLowerCase ? '✓' : '○'} One lowercase letter
                  </div>
                  <div className={passwordValidation.hasNumber ? styles.met : styles.unmet}>
                    {passwordValidation.hasNumber ? '✓' : '○'} One number
                  </div>
                </div>
              )}
            </div>
            
            <div className={styles.inputGroup}>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={styles.input}
                placeholder=" "
                required
              />
              <label className={styles.label}>Confirm Password</label>
            </div>
            
            <button type="submit" className={styles.submitButton} disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          
          <div className={styles.loginLink}>
            <span>Already have an account? </span>
            <button type="button" onClick={onSwitchToLogin}>Sign in</button>
          </div>
        </div>
      </div>
    );
  }

  // Steps 2-4: Profile Completion
  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={handleClose}>×</button>
        
        {/* Step Indicator */}
        <div className={styles.stepIndicator}>
          <div className={`${styles.step} ${currentStep >= 2 ? styles.active : ''}`}>
            <span>2</span>
            <p>Academic</p>
          </div>
          <div className={styles.stepLine}></div>
          <div className={`${styles.step} ${currentStep >= 3 ? styles.active : ''}`}>
            <span>3</span>
            <p>Personal</p>
          </div>
          <div className={styles.stepLine}></div>
          <div className={`${styles.step} ${currentStep >= 4 ? styles.active : ''}`}>
            <span>4</span>
            <p>Verify ID</p>
          </div>
        </div>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleStepSubmit} className={styles.form}>
          {/* Step 2: Academic Details */}
          {currentStep === 2 && (
            <div className={styles.stepContent}>
              <h3>Academic Information</h3>
              <p className={styles.stepDescription}>Tell us about your studies</p>
              
              <div className={styles.inputGroup}>
                <label className={styles.label}>University / Institution</label>
                <input
                  type="text"
                  name="university"
                  value={formData.university}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Enter your university name"
                  required
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label className={styles.label}>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Enter your city"
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label className={styles.label}>Degree Program</label>
                <input
                  type="text"
                  name="degreeProgram"
                  value={formData.degreeProgram}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="e.g. Computer Science"
                  required
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label className={styles.label}>Study Year</label>
                <select
                  name="studyYear"
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
                  <option value="5+">5+ Year</option>
                  <option value="postgrad">Postgraduate</option>
                </select>
              </div>
            </div>
          )}
          
          {/* Step 3: Personal Info */}
          {currentStep === 3 && (
            <div className={styles.stepContent}>
              <h3>Personal Information</h3>
              <p className={styles.stepDescription}>Help us know you better</p>
              
              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>
              
              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Birthday</label>
                  <input
                    type="date"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleInputChange}
                    className={styles.input}
                  />
                </div>
                
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={styles.select}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
              </div>
              
              <div className={styles.inputGroup}>
                <label className={styles.label}>How did you hear about us?</label>
                <select
                  name="howDidYouKnow"
                  value={formData.howDidYouKnow}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  <option value="">Select an option</option>
                  <option value="friend">Friend / Classmate</option>
                  <option value="social">Social Media</option>
                  <option value="search">Google Search</option>
                  <option value="university">University</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          )}
          
          {/* Step 4: ID Verification */}
          {currentStep === 4 && (
            <div className={styles.stepContent}>
              <h3>ID Verification</h3>
              <p className={styles.stepDescription}>
                Upload your student ID or government ID for verification
              </p>
              
              <div className={styles.idUploadSection}>
                {!capturedImage ? (
                  <>
                    {!cameraActive ? (
                      <div className={styles.uploadOptions}>
                        <button
                          type="button"
                          className={styles.uploadOption}
                          onClick={startCamera}
                        >
                          <span className={styles.optionIcon}>📷</span>
                          <span>Take Photo</span>
                        </button>
                        
                        <button
                          type="button"
                          className={styles.uploadOption}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <span className={styles.optionIcon}>📁</span>
                          <span>Upload File</span>
                        </button>
                        
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                        />
                      </div>
                    ) : (
                      <div className={styles.cameraContainer}>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className={styles.cameraPreview}
                        />
                        <button
                          type="button"
                          className={styles.captureButton}
                          onClick={capturePhoto}
                        >
                          📸 Capture
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.previewContainer}>
                    <img
                      src={capturedImage}
                      alt="ID Preview"
                      className={styles.idPreview}
                    />
                    <button
                      type="button"
                      className={styles.retakeButton}
                      onClick={retakePhoto}
                    >
                      Retake
                    </button>
                  </div>
                )}
              </div>
              
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          )}
          
          {/* Navigation Buttons */}
          <div className={styles.navigation}>
            {currentStep > 2 && (
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Back
              </button>
            )}
            
            <button type="submit" className={styles.submitButton} disabled={isLoading}>
              {isLoading 
                ? 'Saving...' 
                : currentStep === 4 
                  ? 'Complete Registration' 
                  : 'Continue'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterModal;

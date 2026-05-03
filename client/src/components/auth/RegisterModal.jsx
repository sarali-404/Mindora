import { useState, useRef, useEffect } from 'react';
import { 
  HiOutlineX, 
  HiOutlineCheck, 
  HiOutlineCamera, 
  HiOutlineUpload,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineLockClosed,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineBookOpen,
  HiOutlineAcademicCap
} from 'react-icons/hi';
import styles from './RegisterModal.module.css';
import authService from '../../services/authService.js';

const RegisterModal = ({ isOpen, onClose, onSwitchToLogin, initialData }) => {
  // Steps: 1=Account, 1.5=OTP, 2=Academic, 3=Personal, 4=ID Verification
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [idSkipped, setIdSkipped] = useState(false);
  
  // OTP State
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(0);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  
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

  // Step 4: Multi-document verification
  const [verificationDocs, setVerificationDocs] = useState([
    { docType: 'student_id', file: null, preview: null },
    { docType: '', file: null, preview: null }
  ]);
  const [showThirdDoc, setShowThirdDoc] = useState(false);
  const docRef0 = useRef(null);
  const docRef1 = useRef(null);
  const docRef2 = useRef(null);
  const docRefs = [docRef0, docRef1, docRef2];

  // Check for existing registration data on mount
  useEffect(() => {
    if (isOpen) {
      // First check initialData (from login modal redirect)
      if (initialData) {
        console.log('InitialData received:', initialData);
        
        // Handle continueRegistration from login
        if (initialData.continueRegistration) {
          setUserId(initialData.userId);
          setUserEmail(initialData.email || '');
          setCurrentStep(initialData.startStep || 2);
        }
        
        // Handle requiresOTP from login
        if (initialData.requiresOTP) {
          setUserId(initialData.userId);
          setUserEmail(initialData.email || '');
          setCurrentStep(1.5);
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
        setUserEmail(regData.email || '');
        
        // Check if needs OTP
        if (regData.requiresOTP && !regData.isEmailVerified) {
          setCurrentStep(1.5);
        } else if (regData.registrationStep && regData.registrationStep > 1) {
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

  // OTP Timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

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
        } catch (error) {
          console.log('Google init error:', error);
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
          setUserEmail(result.data.email);
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

  // OTP Input handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only last digit
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;
    
    const newOtp = [...otp];
    pastedData.split('').forEach((digit, i) => {
      if (i < 6) newOtp[i] = digit;
    });
    setOtp(newOtp);
    
    // Focus last filled input or last input
    const lastIndex = Math.min(pastedData.length - 1, 5);
    otpRefs[lastIndex].current?.focus();
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
        setUserEmail(response.data.email);
        
        if (response.data.requiresOTP) {
          // Go to OTP verification step
          setCurrentStep(1.5);
          setOtpTimer(60); // Start 60s countdown for resend
        } else if (response.data.continueRegistration) {
          // Email already verified, continue to next step
          setCurrentStep(response.data.registrationStep || 2);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await authService.verifyOTP(userId, otpString);
      
      if (response.success) {
        // OTP verified, go to profile steps
        setCurrentStep(2);
      }
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      otpRefs[0].current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (otpTimer > 0) return;
    
    setError('');
    setIsLoading(true);
    
    try {
      await authService.resendOTP(userId, userEmail);
      setOtpTimer(60); // Reset timer
      setOtp(['', '', '', '', '', '']); // Clear OTP inputs
      setError(''); // Clear any previous errors
    } catch (err) {
      if (err.waitTime) {
        setOtpTimer(err.waitTime);
      }
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Check for userId
    const currentUserId = userId || authService.getRegistrationData()?.userId;
    if (!currentUserId) {
      setError('Session expired. Please start registration again.');
      setIsLoading(false);
      return;
    }
    
    try {
      let profileData = {};
      let verificationDocuments = null;
      
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
          
        case 4: {
          const hasStudentId = verificationDocs[0]?.preview && verificationDocs[0]?.docType === 'student_id';
          const hasSecondDoc = verificationDocs[1]?.preview && verificationDocs[1]?.docType;
          if (!hasStudentId || !hasSecondDoc) {
            setError('Please upload your Student ID and at least one university document.');
            setIsLoading(false);
            return;
          }
          verificationDocuments = verificationDocs
            .filter(d => d.preview && d.docType)
            .map(d => ({ docType: d.docType, data: d.preview }));
          break;
        }
      }
      
      const response = await authService.updateProfile({
        userId: currentUserId,
        step: currentStep,
        profileData,
        verificationDocuments
      });
      
      if (response.success) {
        if (response.data.registrationComplete) {
          setRegistrationComplete(true);
          setIdSkipped(response.data.idSkipped || false);
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

  const handleSkipID = async () => {
    setIsLoading(true);
    setError('');
    
    const currentUserId = userId || authService.getRegistrationData()?.userId;
    if (!currentUserId) {
      setError('Session expired. Please start registration again.');
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await authService.updateProfile({
        userId: currentUserId,
        step: 'skip',
        profileData: {},
        idPhoto: null
      });
      
      if (response.success) {
        setRegistrationComplete(true);
        setIdSkipped(true);
        authService.clearRegistrationData();
      }
    } catch (err) {
      setError(err.message || 'Failed to continue. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setUploadMethod('camera');
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions or use file upload.');
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
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      setFormData(prev => ({ ...prev, idPhoto: imageData }));
      
      // Stop camera
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setCameraActive(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result);
        setFormData(prev => ({ ...prev, idPhoto: reader.result }));
        setUploadMethod('file');
      };
      reader.readAsDataURL(file);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setFormData(prev => ({ ...prev, idPhoto: null }));
    setUploadMethod(null);
    if (cameraActive && videoRef.current) {
      const stream = videoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setCameraActive(false);
    }
  };

  const handleDocFileChange = (slotIdx, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setVerificationDocs(prev => {
        const updated = [...prev];
        updated[slotIdx] = { ...updated[slotIdx], file, preview: reader.result };
        return updated;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDocTypeChange = (slotIdx, value) => {
    setVerificationDocs(prev => {
      const updated = [...prev];
      updated[slotIdx] = { ...updated[slotIdx], docType: value };
      return updated;
    });
  };

  const handleRemoveDoc = (slotIdx) => {
    setVerificationDocs(prev => {
      const updated = [...prev];
      updated[slotIdx] = { ...updated[slotIdx], file: null, preview: null };
      return updated;
    });
    if (docRefs[slotIdx]?.current) docRefs[slotIdx].current.value = '';
  };

  const handleClose = () => {
    // Stop camera if active
    if (cameraActive && videoRef.current) {
      const stream = videoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
    onClose();
  };

  const goToDashboard = () => {
    onClose();
    window.location.href = '/app/dashboard';
  };

  if (!isOpen) return null;

  // Registration Complete Screen
  if (registrationComplete) {
    return (
      <div className={styles.modalOverlay} onClick={handleClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button className={styles.closeButton} onClick={handleClose}>
            <HiOutlineX />
          </button>
          
          <div className={styles.successScreen}>
            <div className={styles.successIcon}>
              {idSkipped ? <HiOutlineSparkles /> : <HiOutlineCheck />}
            </div>
            <h2>{idSkipped ? 'Welcome to Mindora!' : 'Registration Complete!'}</h2>
            <p className={styles.successMessage}>
              {idSkipped ? (
                <>
                  Your account is ready! You can start exploring Mindora.<br/>
                  <strong>Verify your student ID later to unlock all features.</strong>
                </>
              ) : (
                <>
                  Your ID is being reviewed. You'll have full access once verified.<br/>
                  <strong>In the meantime, you can explore Mindora!</strong>
                </>
              )}
            </p>
            
            <div className={styles.infoBox}>
              <div className={styles.infoItem}>
                <HiOutlineCheck />
                <span>Browse learning resources</span>
              </div>
              <div className={styles.infoItem}>
                <HiOutlineCheck />
                <span>Access AI study tools</span>
              </div>
              <div className={styles.infoItem}>
                {idSkipped ? <HiOutlineLockClosed /> : <HiOutlineClock />}
                <span>{idSkipped ? 'Upload, comment, like (requires ID)' : 'Upload, comment, like (pending review)'}</span>
              </div>
            </div>
            
            <button className={styles.primaryButton} onClick={goToDashboard}>
              Go to Dashboard <HiOutlineArrowRight />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={handleClose}>
          <HiOutlineX />
        </button>
        
        {/* Step 1: Create Account */}
        {currentStep === 1 && (
          <>
            <div className={styles.header}>
              <h2>Create Account</h2>
              <p>Join Mindora to start your learning journey</p>
            </div>
            
            {error && <div className={styles.error}>{error}</div>}
            
            <div className={styles.googleSection}>
              <div ref={googleButtonRef} className={styles.googleButton}></div>
            </div>
            
            <div className={styles.divider}>
              <span>or sign up with email</span>
            </div>
            
            <form onSubmit={handleCreateAccount} className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label className={styles.label}>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Create a password"
                  required
                />
                <div className={styles.passwordRequirements}>
                  <span className={passwordValidation.minLength ? styles.met : styles.unmet}>
                    ✓ 6+ characters
                  </span>
                  <span className={passwordValidation.hasUpperCase ? styles.met : styles.unmet}>
                    ✓ Uppercase
                  </span>
                  <span className={passwordValidation.hasLowerCase ? styles.met : styles.unmet}>
                    ✓ Lowercase
                  </span>
                  <span className={passwordValidation.hasNumber ? styles.met : styles.unmet}>
                    ✓ Number
                  </span>
                </div>
              </div>
              
              <div className={styles.inputGroup}>
                <label className={styles.label}>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Confirm your password"
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={isLoading || !isPasswordValid()}
              >
                {isLoading ? 'Creating Account...' : 'Continue'}
              </button>
            </form>
            
            <div className={styles.loginLink}>
              Already have an account?{' '}
              <button onClick={onSwitchToLogin}>Sign In</button>
            </div>
          </>
        )}
        
        {/* Step 1.5: OTP Verification */}
        {currentStep === 1.5 && (
          <>
            <div className={styles.header}>
              <h2>Verify Your Email</h2>
              <p>We sent a 6-digit code to <strong>{userEmail}</strong></p>
            </div>
            
            {error && <div className={styles.error}>{error}</div>}
            
            <form onSubmit={handleVerifyOTP} className={styles.form}>
              <div className={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={otpRefs[index]}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    className={styles.otpInput}
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={isLoading || otp.join('').length !== 6}
              >
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </button>
              
              <div className={styles.resendOtp}>
                {otpTimer > 0 ? (
                  <span>Resend code in {otpTimer}s</span>
                ) : (
                  <button type="button" onClick={handleResendOTP} disabled={isLoading}>
                    Resend Code
                  </button>
                )}
              </div>
            </form>
            
            <div className={styles.loginLink}>
              <button onClick={() => setCurrentStep(1)}>← Back to signup</button>
            </div>
          </>
        )}
        
        {/* Steps 2-4: Profile completion */}
        {currentStep >= 2 && (
          <>
            {/* Step Indicator */}
            <div className={styles.stepIndicator}>
              {[2, 3, 4].map((step, index) => (
                <div key={step} className={styles.stepWrapper}>
                  <div className={`${styles.step} ${currentStep >= step ? styles.active : ''}`}>
                    <span>{index + 1}</span>
                    <p>{step === 2 ? 'Academic' : step === 3 ? 'Personal' : 'Verify ID'}</p>
                  </div>
                  {index < 2 && <div className={styles.stepLine} />}
                </div>
              ))}
            </div>
            
            {error && <div className={styles.error}>{error}</div>}
            
            <form onSubmit={handleStepSubmit} className={styles.form}>
              {/* Step 2: Academic Info */}
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
                  
                  <p className={styles.nameHint}>
                    Enter your name exactly as it appears on your student ID
                  </p>
                  
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
                  <h3>Verify Your Student ID</h3>
                  <p className={styles.stepDescription}>
                    Upload your student ID and one university document to unlock all features. Both are required.
                  </p>
                  <p className={styles.verifyHint}>
                    Accurate documents speed up the review process.
                  </p>

                  {/* Slot 1: Student ID (fixed) */}
                  <div className={styles.docCard}>
                    <div className={styles.docCardHeader}>
                      <span className={styles.docCardLabel}>Student ID Card</span>
                      <span className={styles.requiredBadge}>Required</span>
                    </div>
                    {verificationDocs[0].preview ? (
                      <div className={styles.docPreview}>
                        <img src={verificationDocs[0].preview} alt="Student ID" className={styles.docThumb} />
                        <button type="button" className={styles.removeDocBtn} onClick={() => handleRemoveDoc(0)}>
                          ✕ Remove
                        </button>
                      </div>
                    ) : (
                      <button type="button" className={styles.docUploadBtn} onClick={() => docRefs[0].current?.click()}>
                        <HiOutlineUpload size={16} /> Upload Photo
                      </button>
                    )}
                    <input ref={docRefs[0]} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleDocFileChange(0, e)} />
                  </div>

                  {/* Slot 2: University document (required) */}
                  <div className={styles.docCard}>
                    <div className={styles.docCardHeader}>
                      <span className={styles.docCardLabel}>University Document</span>
                      <span className={styles.requiredBadge}>Required</span>
                    </div>
                    <select
                      className={styles.docTypeSelect}
                      value={verificationDocs[1].docType}
                      onChange={(e) => handleDocTypeChange(1, e.target.value)}
                    >
                      <option value="">Select document type…</option>
                      <option value="enrollment_letter">Enrollment Letter</option>
                      <option value="university_timetable">University Timetable</option>
                      <option value="fee_receipt">Fee Receipt</option>
                      <option value="library_card">Library Card</option>
                    </select>
                    {verificationDocs[1].preview ? (
                      <div className={styles.docPreview}>
                        <img src={verificationDocs[1].preview} alt="University Document" className={styles.docThumb} />
                        <button type="button" className={styles.removeDocBtn} onClick={() => handleRemoveDoc(1)}>
                          ✕ Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.docUploadBtn}
                        disabled={!verificationDocs[1].docType}
                        onClick={() => docRefs[1].current?.click()}
                      >
                        <HiOutlineUpload size={16} /> Upload Photo
                      </button>
                    )}
                    <input ref={docRefs[1]} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleDocFileChange(1, e)} />
                  </div>

                  {/* Optional Slot 3 */}
                  {showThirdDoc ? (
                    <div className={styles.docCard}>
                      <div className={styles.docCardHeader}>
                        <span className={styles.docCardLabel}>Additional Document</span>
                        <span className={styles.optionalBadge}>Optional</span>
                        <button
                          type="button"
                          className={styles.removeCardBtn}
                          onClick={() => {
                            setShowThirdDoc(false);
                            setVerificationDocs(prev => prev.slice(0, 2));
                            if (docRefs[2]?.current) docRefs[2].current.value = '';
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      <select
                        className={styles.docTypeSelect}
                        value={verificationDocs[2]?.docType || ''}
                        onChange={(e) => handleDocTypeChange(2, e.target.value)}
                      >
                        <option value="">Select document type…</option>
                        <option value="enrollment_letter">Enrollment Letter</option>
                        <option value="university_timetable">University Timetable</option>
                        <option value="fee_receipt">Fee Receipt</option>
                        <option value="library_card">Library Card</option>
                      </select>
                      {verificationDocs[2]?.preview ? (
                        <div className={styles.docPreview}>
                          <img src={verificationDocs[2].preview} alt="Additional Document" className={styles.docThumb} />
                          <button type="button" className={styles.removeDocBtn} onClick={() => handleRemoveDoc(2)}>
                            ✕ Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={styles.docUploadBtn}
                          disabled={!verificationDocs[2]?.docType}
                          onClick={() => docRefs[2].current?.click()}
                        >
                          <HiOutlineUpload size={16} /> Upload Photo
                        </button>
                      )}
                      <input ref={docRefs[2]} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleDocFileChange(2, e)} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.addDocBtn}
                      onClick={() => {
                        setVerificationDocs(prev => [...prev, { docType: '', file: null, preview: null }]);
                        setShowThirdDoc(true);
                      }}
                    >
                      + Add another document <span className={styles.optionalTag}>(optional)</span>
                    </button>
                  )}
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
                    <HiOutlineArrowLeft /> Back
                  </button>
                )}
                
                {currentStep === 4 ? (
                  <div className={styles.step4Buttons}>
                    <button
                      type="button"
                      className={styles.skipButton}
                      onClick={handleSkipID}
                      disabled={isLoading}
                    >
                      Skip for now
                    </button>
                    <button
                      type="submit"
                      className={styles.submitButton}
                      disabled={isLoading || !(verificationDocs[0]?.preview && verificationDocs[1]?.preview && verificationDocs[1]?.docType)}
                    >
                      {isLoading ? 'Submitting...' : 'Complete'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Continue'}
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default RegisterModal;

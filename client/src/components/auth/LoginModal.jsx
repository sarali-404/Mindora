import { useState, useEffect, useRef } from 'react';
import styles from './LoginModal.module.css';
import authService from '../../services/authService.js';

const LoginModal = ({ isOpen, onClose, onSwitchToRegister }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(null);
  const googleButtonRef = useRef(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear verification status when user types
    if (verificationStatus) {
      setVerificationStatus(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setVerificationStatus(null);
    
    try {
      // Prepare login data for API
      const loginData = {
        identifier: formData.username, // Can be email or username
        password: formData.password
      };

      console.log('Attempting login:', loginData);
      
      const response = await authService.login(loginData);
      
      if (response.success) {
        // Check if user needs to continue registration
        if (response.data.continueRegistration) {
          onSwitchToRegister({
            continueRegistration: true,
            userId: response.data.userId,
            email: response.data.email,
            startStep: response.data.registrationStep || 2
          });
          return;
        }
        
        console.log('Login successful:', response);
        onClose(); // Close modal after successful login
        window.location.href = '/app/dashboard';
      }
    } catch (error) {
      console.error('Login failed:', error);
      
      // Check for verification status in error response
      if (error.verificationStatus === 'incomplete') {
        // User needs to complete registration
        onSwitchToRegister({
          continueRegistration: true,
          userId: error.userId,
          email: formData.username,
          startStep: error.registrationStep || 2
        });
        return;
      } else if (error.verificationStatus) {
        setVerificationStatus(error.verificationStatus);
        setError(error.message);
      } else if (error.data && error.data.errors) {
        // Handle validation errors
        setError(error.data.errors.map(err => err.message).join(', '));
      } else {
        setError(error.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Scroll to the Google rendered button
    if (googleButtonRef.current) {
      googleButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setError('Please click the Google button below to sign in');
    } else {
      setError('Google Sign-In is loading. Please wait...');
    }
  };

  const handleGoogleCallback = async (response) => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await authService.googleAuth(response.credential);
      
      if (result.success) {
        if (result.data.pendingVerification) {
          setVerificationStatus('pending');
          setError(result.message);
        } else if (result.data.needsProfileCompletion) {
          // New Google user - switch to register modal at step 2
          onSwitchToRegister({ 
            googleUser: result.data.user,
            startStep: 2 
          });
        } else {
          // Verified user - logged in
          onClose();
          window.location.href = '/app/dashboard';
        }
      }
    } catch (error) {
      console.error('Google auth callback error:', error);
      
      if (error.verificationStatus === 'rejected') {
        setVerificationStatus('rejected');
      }
      setError(error.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load Google Identity Services script
  useEffect(() => {
    const initializeGoogle = () => {
      if (window.google && googleButtonRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleGoogleCallback,
          });

          // Render the Google Sign-In button with fixed pixel width
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 350
          });
        } catch (error) {
          console.log('Error initializing Google:', error);
        }
      }
    };

    if (isOpen && !window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.body.appendChild(script);
    } else if (isOpen && window.google) {
      // Small delay to ensure ref is available
      setTimeout(initializeGoogle, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Render verification status message
  const renderVerificationMessage = () => {
    if (verificationStatus === 'pending') {
      return (
        <div className={styles.verificationMessage}>
          <div className={styles.verificationIcon}>⏳</div>
          <h3>Account Pending Verification</h3>
          <p>Your account is being reviewed by our team. This typically takes 24-48 hours.</p>
          <p className={styles.smallText}>You'll receive an email once your account is approved.</p>
        </div>
      );
    }
    
    if (verificationStatus === 'rejected') {
      return (
        <div className={styles.verificationMessageRejected}>
          <div className={styles.verificationIcon}>❌</div>
          <h3>Verification Rejected</h3>
          <p>Unfortunately, your ID verification was not approved.</p>
          <p className={styles.smallText}>Please contact support@mindora.com for assistance.</p>
        </div>
      );
    }
    
    return null;
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

        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Welcome Back</h2>
          <p className={styles.subtitle}>Sign in to your Mindora account</p>
        </div>

        {/* Verification Status Message */}
        {renderVerificationMessage()}

        {/* Login Form - hide if showing verification status */}
        {!verificationStatus && (
          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Error display */}
            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}
            
            {/* Username Field */}
            <div className={styles.inputGroup}>
              <input
                type="text"
                name="username"
                id="username"
                value={formData.username}
                onChange={handleInputChange}
                className={styles.input}
                placeholder=" "
                required
              />
              <label htmlFor="username" className={styles.label}>
                Username or Email
              </label>
            </div>

            {/* Password Field */}
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
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className={styles.formOptions}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxText}>Remember me</span>
              </label>
              <button type="button" className={styles.forgotPassword}>
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <button type="submit" className={styles.loginButton} disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            {/* Divider */}
            <div className={styles.divider}>
              <span className={styles.dividerText}>or continue with</span>
            </div>

            {/* Google Sign-In Button (Rendered by Google) */}
            <div className={styles.googleButtonContainer}>
              <div ref={googleButtonRef}></div>
            </div>

          {/* Register Link */}
          <div className={styles.registerLink}>
            <span>Don't have an account? </span>
            <button type="button" className={styles.registerButton} onClick={() => onSwitchToRegister()}>
              Sign up
            </button>
          </div>
        </form>
        )}

        {/* Show try again button when verification status is shown */}
        {verificationStatus && (
          <div className={styles.tryAgainContainer}>
            <button 
              className={styles.tryAgainButton} 
              onClick={() => {
                setVerificationStatus(null);
                setError('');
              }}
            >
              Try Different Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
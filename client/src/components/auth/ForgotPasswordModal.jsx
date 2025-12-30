import { useState, useRef, useEffect } from 'react';
import { 
  HiOutlineX, 
  HiOutlineMail, 
  HiOutlineKey, 
  HiOutlineLockClosed,
  HiOutlineCheckCircle,
  HiOutlineArrowLeft
} from 'react-icons/hi';
import styles from './ForgotPasswordModal.module.css';
import authService from '../../services/authService.js';

const ForgotPasswordModal = ({ isOpen, onClose, onBackToLogin }) => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  const otpRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError('');
      setEmail('');
      setMaskedEmail('');
      setOtp(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
      setCountdown(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle email submission
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await authService.forgotPassword(email);
      
      if (response.success) {
        setMaskedEmail(response.data?.email || email.replace(/(.{2})(.*)(@.*)/, '$1***$3'));
        setStep(2);
        setCountdown(60); // 60 seconds before can resend
      }
    } catch (error) {
      setError(error.message || 'Failed to send reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pastedValue = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedValue.forEach((char, i) => {
        if (index + i < 6 && /^\d$/.test(char)) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      // Focus last filled input or next empty
      const nextIndex = Math.min(index + pastedValue.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    if (value && !/^\d$/.test(value)) return; // Only digits

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP verification
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authService.verifyResetOTP(email, otpCode);
      
      if (response.success) {
        setStep(3);
      }
    } catch (error) {
      setError(error.message || 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    
    setIsLoading(true);
    setError('');

    try {
      await authService.forgotPassword(email);
      setOtp(['', '', '', '', '', '']);
      setCountdown(60);
      otpRefs.current[0]?.focus();
    } catch (error) {
      setError(error.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.resetPassword(email, newPassword);
      
      if (response.success) {
        setStep(4);
      }
    } catch (error) {
      setError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className={styles.stepIndicator}>
      {[1, 2, 3, 4].map((s) => (
        <div 
          key={s} 
          className={`${styles.stepDot} ${step >= s ? styles.stepDotActive : ''} ${step === s ? styles.stepDotCurrent : ''}`}
        />
      ))}
    </div>
  );

  // Render Step 1: Email
  const renderEmailStep = () => (
    <form className={styles.form} onSubmit={handleEmailSubmit}>
      <div className={styles.iconContainer}>
        <HiOutlineMail className={styles.stepIcon} />
      </div>
      
      <h3 className={styles.stepTitle}>Forgot Password?</h3>
      <p className={styles.stepDescription}>
        No worries! Enter your email and we'll send you a reset code.
      </p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.inputGroup}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
          placeholder=" "
          required
        />
        <label className={styles.label}>Email Address</label>
      </div>

      <button type="submit" className={styles.submitButton} disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Reset Code'}
      </button>

      <button type="button" className={styles.backLink} onClick={onBackToLogin}>
        <HiOutlineArrowLeft /> Back to Login
      </button>
    </form>
  );

  // Render Step 2: OTP
  const renderOtpStep = () => (
    <form className={styles.form} onSubmit={handleOtpSubmit}>
      <div className={styles.iconContainer}>
        <HiOutlineKey className={styles.stepIcon} />
      </div>
      
      <h3 className={styles.stepTitle}>Enter Reset Code</h3>
      <p className={styles.stepDescription}>
        We've sent a 6-digit code to <strong>{maskedEmail}</strong>
      </p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.otpContainer}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (otpRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(index, e)}
            className={styles.otpInput}
            autoFocus={index === 0}
          />
        ))}
      </div>

      <button type="submit" className={styles.submitButton} disabled={isLoading}>
        {isLoading ? 'Verifying...' : 'Verify Code'}
      </button>

      <div className={styles.resendContainer}>
        <span className={styles.resendText}>Didn't receive the code?</span>
        <button
          type="button"
          className={styles.resendButton}
          onClick={handleResendOtp}
          disabled={countdown > 0 || isLoading}
        >
          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
        </button>
      </div>

      <button type="button" className={styles.backLink} onClick={() => setStep(1)}>
        <HiOutlineArrowLeft /> Change Email
      </button>
    </form>
  );

  // Render Step 3: New Password
  const renderPasswordStep = () => (
    <form className={styles.form} onSubmit={handlePasswordSubmit}>
      <div className={styles.iconContainer}>
        <HiOutlineLockClosed className={styles.stepIcon} />
      </div>
      
      <h3 className={styles.stepTitle}>Create New Password</h3>
      <p className={styles.stepDescription}>
        Your new password must be at least 8 characters long.
      </p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.inputGroup}>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={styles.input}
          placeholder=" "
          required
          minLength={8}
        />
        <label className={styles.label}>New Password</label>
      </div>

      <div className={styles.inputGroup}>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={styles.input}
          placeholder=" "
          required
          minLength={8}
        />
        <label className={styles.label}>Confirm Password</label>
      </div>

      <button type="submit" className={styles.submitButton} disabled={isLoading}>
        {isLoading ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  );

  // Render Step 4: Success
  const renderSuccessStep = () => (
    <div className={styles.successContainer}>
      <div className={styles.successIconContainer}>
        <HiOutlineCheckCircle className={styles.successIcon} />
      </div>
      
      <h3 className={styles.stepTitle}>Password Reset!</h3>
      <p className={styles.stepDescription}>
        Your password has been reset successfully. You can now login with your new password.
      </p>

      <button className={styles.submitButton} onClick={onBackToLogin}>
        Back to Login
      </button>
    </div>
  );

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className={styles.closeButton} onClick={onClose}>
          <HiOutlineX size={24} />
        </button>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Steps */}
        {step === 1 && renderEmailStep()}
        {step === 2 && renderOtpStep()}
        {step === 3 && renderPasswordStep()}
        {step === 4 && renderSuccessStep()}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;

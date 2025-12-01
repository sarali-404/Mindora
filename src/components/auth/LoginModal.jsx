import { useState } from 'react';
import styles from './LoginModal.module.css';

const LoginModal = ({ isOpen, onClose, onSwitchToRegister }) => {
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
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login submitted:', formData);
  };

  const handleGoogleLogin = () => {
    // Placeholder for Google login
    console.log('Google login clicked');
  };

  if (!isOpen) return null;

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

        {/* Login Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
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
          <button type="submit" className={styles.loginButton}>
            Sign In
          </button>

          {/* Divider */}
          <div className={styles.divider}>
            <span className={styles.dividerText}>or</span>
          </div>

          {/* Google Login */}
          <button type="button" className={styles.googleButton} onClick={handleGoogleLogin}>
            <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Register Link */}
          <div className={styles.registerLink}>
            <span>Don't have an account? </span>
            <button type="button" className={styles.registerButton} onClick={onSwitchToRegister}>
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import styles from './admin.module.css';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminService.login(username.trim(), password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <span className={styles.loginLogo}>Mindora</span>
          <span className={styles.loginBadge}>Admin</span>
        </div>
        <h1 className={styles.loginTitle}>Sign in</h1>
        <p className={styles.loginSubtitle}>Admin access only</p>

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          {error && <div className={styles.loginError}>{error}</div>}

          <div className={styles.loginField}>
            <label className={styles.loginLabel} htmlFor="admin-username">
              Username
            </label>
            <input
              id="admin-username"
              className={styles.loginInput}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className={styles.loginField}>
            <label className={styles.loginLabel} htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              className={styles.loginInput}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            className={styles.loginBtn}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

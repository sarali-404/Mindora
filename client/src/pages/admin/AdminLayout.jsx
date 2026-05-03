import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import styles from './admin.module.css';

export default function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!adminService.isLoggedIn()) {
      navigate('/admin/login', { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    adminService.logout();
    navigate('/admin/login', { replace: true });
  };

  const admin = adminService.getAdmin();

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span className={styles.logoText}>Mindora</span>
          <span className={styles.logoBadge}>Admin</span>
        </div>

        <nav className={styles.nav}>
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            <span className={styles.navIcon}>📊</span>
            Dashboard
          </NavLink>
          <NavLink
            to="/admin/verifications"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            <span className={styles.navIcon}>🪪</span>
            Verifications
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            <span className={styles.navIcon}>👥</span>
            Users
          </NavLink>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.adminInfo}>
            <span className={styles.adminName}>{admin?.username || 'Admin'}</span>
            <span className={styles.adminRole}>Administrator</span>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

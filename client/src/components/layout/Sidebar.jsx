import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { MdClose } from "react-icons/md";
import styles from "./Sidebar.module.css";
import goalService from "../../services/goalService";

import {
  FiHome,
  FiUsers,
  FiCalendar,
  FiBook,
  FiTarget,
  FiUser,
  FiSettings,
  FiBell,
} from "react-icons/fi";

export default function AppSidebar({ isOpen, onClose }) {
  const [goalsOpen, setGoalsOpen] = useState(true);
  const [goals, setGoals] = useState([]);
  const location = useLocation();

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const res = await goalService.getMyGoals();
        if (res.success && Array.isArray(res.data)) {
          setGoals(res.data);
        }
      } catch (err) {
        // silently fail — sidebar is not critical
      }
    };
    fetchGoals();
  }, [location.pathname]);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className={styles.overlay} onClick={onClose} />}
      
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      {/* Logo with close button on mobile */}
      <div className={styles.logoArea}>
        <img src="/logo-small.png" alt="Mindora logo" className={styles.logo} />
        <button className={styles.closeButton} onClick={onClose} aria-label="Close menu">
          <MdClose size={24} />
        </button>
      </div>

      {/* Main nav */}
      <nav className={styles.nav}>
        <NavItem to="/app/dashboard" label="Dashboard" icon={FiHome} />
        <NavItem to="/app/community" label="Community" icon={FiUsers} />
        <NavItem to="/app/sessions" label="Sessions" icon={FiCalendar} />
        <NavItem to="/app/library" label="Library" icon={FiBook} />

        {/* Goals dropdown */}
        <div className={styles.goalsGroup}>
          <button
            type="button"
            className={styles.goalsToggle}
            onClick={() => setGoalsOpen((o) => !o)}
          >
            <span className={styles.iconCircle}>
              <FiTarget size={18} />
            </span>
            <span className={styles.linkLabel}>Goals</span>
            <span className={styles.chevron}>{goalsOpen ? "▾" : "▸"}</span>
          </button>

          {goalsOpen && (
            <div className={styles.goalsChildren}>
              <NavItem to="/app/create-goal" label="+ Create New Goal" isChild />
              {goals.map((g) => (
                <NavLink
                  key={g._id}
                  to={`/app/goals/${g._id}`}
                  className={({ isActive }) =>
                    [styles.navItem, styles.navItemChild, styles.goalLink, isActive ? styles.navItemActive : ''].join(' ')
                  }
                  title={g.title}
                >
                  <span className={styles.goalDot} />
                  <span className={styles.goalSubject}>{g.subject}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Bottom nav */}
      <div className={styles.bottomNav}>
        <NavItem to="/app/profile" label="Profile" icon={FiUser} />
        <NavItem to="/app/settings" label="Settings" icon={FiSettings} />
        <NavItem to="/app/notifications" label="Notifications" icon={FiBell} />
      </div>
    </aside>
    </>
  );
}

function NavItem({ to, label, icon: IconComp, isChild = false }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          styles.navItem,
          isActive ? styles.navItemActive : "",
          isChild ? styles.navItemChild : "",
        ].join(" ")
      }
      end
    >
      {!isChild && IconComp && (
        <span className={styles.iconCircle}>
          <IconComp size={18} />
        </span>
      )}
      <span className={styles.linkLabel}>{label}</span>
    </NavLink>
  );
}

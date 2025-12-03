import { NavLink } from "react-router-dom";
import { useState } from "react";
import styles from "./Sidebar.module.css";

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

export default function AppSidebar() {
  const [goalsOpen, setGoalsOpen] = useState(true);

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logoArea}>
        <img src="/logo-small.png" alt="Mindora logo" className={styles.logo} />
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
              <NavItem to="/app/create-goal" label="Create New Goal" isChild />
              <NavItem to="/app/goals" label="Goal 1" isChild />
             
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

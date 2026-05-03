import { useState, useEffect } from "react";
import AppSidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import styles from "./Layout.module.css";
import { Outlet, useNavigate } from "react-router-dom";
import ToastNotification from "../shared/ToastNotification";
import authService from "../../services/authService";
import { MdVerified, MdClose } from "react-icons/md";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }
    // Show banner if not fully verified and not dismissed this session
    const dismissed = sessionStorage.getItem('verifyBannerDismissed');
    if (!authService.isFullyVerified() && !dismissed) {
      setBannerVisible(true);
    }
  }, []);

  const dismissBanner = () => {
    sessionStorage.setItem('verifyBannerDismissed', '1');
    setBannerVisible(false);
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={styles.layout}>
      <AppSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className={styles.content}>
        <TopNavbar onMenuClick={toggleSidebar} />
        {bannerVisible && (
          <div className={styles.verifyBanner}>
            <MdVerified size={18} className={styles.verifyBannerIcon} />
            <span>
              Your account is not verified yet.{' '}
              <a href="/app/profile" className={styles.verifyBannerLink}>
                Get Verified
              </a>{' '}
              to unlock all features — messaging, sessions, notes & more.
            </span>
            <button className={styles.verifyBannerClose} onClick={dismissBanner} aria-label="Dismiss">
              <MdClose size={16} />
            </button>
          </div>
        )}
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
      <ToastNotification />
    </div>
  );
}

import { useState } from "react";
import AppSidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import styles from "./Layout.module.css";
import { Outlet } from "react-router-dom";
import ToastNotification from "../shared/ToastNotification";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className={styles.layout}>
      <AppSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className={styles.content}>
        <TopNavbar onMenuClick={toggleSidebar} />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
      <ToastNotification />
    </div>
  );
}

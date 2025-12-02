import AppSidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import styles from "./Layout.module.css";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className={styles.layout}>
      <AppSidebar />
      <div style={{ flex: 1 }}>
        <TopNavbar />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

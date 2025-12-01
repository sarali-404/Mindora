import AppSidebar from "./Sidebar";
import styles from "./Layout.module.css";

export default function AppLayout({ children }) {
  return (
    <div className={styles.layout}>
      <AppSidebar />
      <main className={styles.main}>{children}</main>
    </div>
  );
}

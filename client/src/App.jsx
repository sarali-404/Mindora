import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import AppLayout from "./components/layout/Layout";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import CommunityPage from "./pages/CommunityPage";
import SessionsPage from "./pages/SessionsPage";
import CreateSessionPage from "./pages/CreateSessionPage";
import LibraryPage from "./pages/LibraryPage";
import UploadMaterialPage from "./pages/UploadMaterialPage";
import CreateGoalPage from "./pages/CreateGoalPage";
import GoalPage from "./pages/GoalPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import NotificationsPage from "./pages/NotificationsPage";
import NotePage from "./pages/NotePage";
import AiNotePage from "./pages/AiNotePage";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminVerificationsPage from "./pages/admin/AdminVerificationsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";


function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        {/* Public landing page without sidebar + navbar */}
        <Route path="/" element={<LandingPage />} />

        {/* All app pages share Layout (sidebar + top navbar) */}
        <Route element={<AppLayout />}>
          <Route path="/app/dashboard" element={<DashboardPage />} />
          <Route path="/app/community" element={<CommunityPage />} />
          <Route path="/app/sessions" element={<SessionsPage />} />
          <Route path="/app/create-session" element={<CreateSessionPage />} />
          <Route path="/app/library" element={<LibraryPage />} />
          <Route path="/app/upload-material" element={<UploadMaterialPage />} />
          <Route path="/app/create-goal" element={<CreateGoalPage />} />
          <Route path="/app/goals/create" element={<CreateGoalPage />} />
          <Route path="/app/goals/:goalId" element={<GoalPage />} />
          <Route path="/app/profile" element={<ProfilePage />} />
          <Route path="/app/settings" element={<SettingsPage />} />
          <Route path="/app/notifications" element={<NotificationsPage />} />
          <Route path="/app/note/:id" element={<NotePage />} />
          <Route path="/app/ai-note/:noteId" element={<AiNotePage />} />
          {/* later: add /app/community, /app/library, /app/goals/:id, etc. */}
        </Route>

        {/* Fallback: unknown paths show a 404 page (avoid rendering Dashboard for undefined routes) */}
        <Route path="*" element={<NotFound />} />

        {/* Admin panel — own layout, no main app sidebar */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="verifications" element={<AdminVerificationsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

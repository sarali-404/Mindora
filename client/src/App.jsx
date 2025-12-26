import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";


function App() {
  return (
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
          <Route path="/app/goals" element={<GoalPage />} />
          <Route path="/app/profile" element={<ProfilePage />} />
          <Route path="/app/settings" element={<SettingsPage />} />
          <Route path="/app/notifications" element={<NotificationsPage />} />
          {/* later: add /app/community, /app/library, /app/goals/:id, etc. */}
        </Route>

        {/* Fallback: unknown paths show a 404 page (avoid rendering Dashboard for undefined routes) */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

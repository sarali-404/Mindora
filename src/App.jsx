import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/Layout";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import CommunityPage from "./pages/CommunityPage";
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
          {/* later: add /app/community, /app/library, /app/goals/:id, etc. */}
        </Route>

        {/* Fallback: unknown paths show a 404 page (avoid rendering Dashboard for undefined routes) */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

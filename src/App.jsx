import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/Layout";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page without sidebar */}
        <Route path="/" element={<LandingPage />} />

        {/* All “app” pages use the layout with sidebar */}
        <Route
          path="/app/*"
          element={
            <AppLayout>
              <Routes>
                <Route path="dashboard" element={<DashboardPage />} />
                {/* later: add community, sessions, library, goals, etc. */}
              </Routes>
            </AppLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

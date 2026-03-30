import "./styles/design-system.css";
import "./styles/resident-shell.css";
import "./styles/firestaff-shell.css";
import { Navigate, Route, Routes } from "react-router-dom";
import Splash from './components/Splash.jsx';
import Onboarding from './components/Onboarding.jsx';
import LoginForm from './components/LoginForm.jsx';
import ScrollToTop from "./components/ScrollToTop.jsx";
import ResidentGuidancePage from "./pages/resident/ResidentGuidancePage.jsx";
import ResidentDevicePage from "./pages/resident/ResidentDevicePage.jsx";
import FireStaffIncidentPage from "./pages/firestaff/FireStaffIncidentPage.jsx";
import FireStaffSimulationPage from "./pages/firestaff/FireStaffSimulationPage.jsx";
import FireStaffDevicePage from "./pages/firestaff/FireStaffDevicePage.jsx";
import FireStaffTaskPage from "./pages/firestaff/FireStaffTaskPage.jsx";

import ResidentHomePage from "./pages/resident/ResidentHomePage.jsx";
import ResidentEscapePage from "./pages/resident/ResidentEscapePage.jsx";

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Auth Flow */}
        <Route path="/splash" element={<Splash />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<LoginForm />} />
        <Route
          path="/firestaff/home"
          element={<Navigate to="/firestaff/simulation" replace />}
        />
        <Route path="/firestaff/devices" element={<FireStaffDevicePage />} />
        <Route path="/firestaff/tasks" element={<FireStaffTaskPage />} />
        <Route
          path="/firestaff/simulation"
          element={<FireStaffSimulationPage />}
        />
        <Route
          path="/firestaff/incidents"
          element={<FireStaffIncidentPage />}
        />

        {/* Resident Pages */}
        <Route path="/resident/home" element={<ResidentHomePage />} />
        <Route path="/resident/escape" element={<ResidentEscapePage />} />
        <Route path="/resident/devices" element={<ResidentDevicePage />} />
        <Route path="/resident/guidance" element={<ResidentGuidancePage />} />

        {/* Default Routes */}
        <Route path="/" element={<Navigate to="/splash" replace />} />
        <Route path="*" element={<Navigate to="/splash" replace />} />
      </Routes>
    </>
  );
}

export default App;

import "./styles/design-system.css";
import "./styles/resident-shell.css";
import "./styles/firestaff-shell.css";
import "./styles/manager-shell.css";
import { Navigate, Route, Routes } from "react-router-dom";
import Splash from './components/Splash.jsx';
import Onboarding from './components/Onboarding.jsx';
import LoginForm from './components/LoginForm.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import ScrollToTop from "./components/ScrollToTop.jsx";
import ResidentGuidancePage from "./pages/resident/ResidentGuidancePage.jsx";
import ResidentDevicePage from "./pages/resident/ResidentDevicePage.jsx";
import FireStaffIncidentPage from "./pages/firestaff/FireStaffIncidentPage.jsx";
import FireStaffSimulationPage from "./pages/firestaff/FireStaffSimulationPage.jsx";
import FireStaffDevicePage from "./pages/firestaff/FireStaffDevicePage.jsx";
import FireStaffTaskPage from "./pages/firestaff/FireStaffTaskPage.jsx";
import ManagerHomePage from "./pages/manager/ManagerHomePage.jsx";
import ManagerDevicePage from "./pages/manager/ManagerDevicePage.jsx";
import ManagerEscapePage from "./pages/manager/ManagerEscapePage.jsx";
import ManagerAccountPage from "./pages/manager/ManagerAccountPage.jsx";
import ManagerIncidentPage from "./pages/manager/ManagerIncidentPage.jsx";
import ManagerReportPage from "./pages/manager/ManagerReportPage.jsx";

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
        <Route path="/firestaff/profile" element={<ProfilePage actor="firestaff" />} />

        <Route path="/manager/home" element={<ManagerHomePage />} />
        <Route path="/manager/devices" element={<ManagerDevicePage />} />
        <Route path="/manager/escape" element={<ManagerEscapePage />} />
        <Route path="/manager/floor-check" element={<Navigate to="/manager/home" replace />} />
        <Route path="/manager/dashboard" element={<Navigate to="/manager/home" replace />} />
        <Route path="/manager/incidents" element={<ManagerIncidentPage />} />
        <Route path="/manager/reports" element={<ManagerReportPage />} />
        <Route path="/manager/account" element={<ManagerAccountPage />} />
        <Route path="/manager/profile" element={<ProfilePage actor="manager" />} />

        {/* Resident Pages */}
        <Route path="/resident/home" element={<ResidentHomePage />} />
        <Route path="/resident/escape" element={<ResidentEscapePage />} />
        <Route path="/resident/devices" element={<ResidentDevicePage />} />
        <Route path="/resident/guidance" element={<ResidentGuidancePage />} />
        <Route path="/resident/profile" element={<ProfilePage actor="resident" />} />

        {/* Default Routes */}
        <Route path="/" element={<Navigate to="/splash" replace />} />
        <Route path="*" element={<Navigate to="/splash" replace />} />
      </Routes>
    </>
  );
}

export default App;

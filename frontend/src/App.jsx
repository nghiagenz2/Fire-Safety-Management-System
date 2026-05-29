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
import FireStaffHomePage from "./pages/firestaff/FireStaffHomePage.jsx";
import ManagerHomePage from "./pages/manager/ManagerHomePage.jsx";
import ManagerDevicePage from "./pages/manager/ManagerDevicePage.jsx";
import ManagerEscapePage from "./pages/manager/ManagerEscapePage.jsx";
import ManagerAccountPage from "./pages/manager/ManagerAccountPage.jsx";
import ManagerFloorCheckPage from "./pages/manager/ManagerFloorCheckPage.jsx";
import ManagerDashboardPage from "./pages/manager/ManagerDashboardPage.jsx";
import ManagerIncidentPage from "./pages/manager/ManagerIncidentPage.jsx";
import ManagerReportPage from "./pages/manager/ManagerReportPage.jsx";

import ResidentHomePage from "./pages/resident/ResidentHomePage.jsx";
import ResidentEscapePage from "./pages/resident/ResidentEscapePage.jsx";
import { canAccessRole, getCurrentUser, getHomePathForRole } from "./services/authApi.js";

function ProtectedRoute({ requiredRole, children }) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessRole(user.role, requiredRole)) {
    return <Navigate to={getHomePathForRole(user.role)} replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const user = getCurrentUser();

  if (user) {
    return <Navigate to={getHomePathForRole(user.role)} replace />;
  }

  return children;
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Auth Flow */}
        <Route path="/splash" element={<Splash />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<PublicOnlyRoute><LoginForm /></PublicOnlyRoute>} />
        <Route path="/firestaff/home" element={<ProtectedRoute requiredRole="firestaff"><FireStaffHomePage /></ProtectedRoute>} />
        <Route path="/firestaff/devices" element={<ProtectedRoute requiredRole="firestaff"><FireStaffDevicePage /></ProtectedRoute>} />
        <Route path="/firestaff/tasks" element={<ProtectedRoute requiredRole="firestaff"><FireStaffTaskPage /></ProtectedRoute>} />
        <Route
          path="/firestaff/simulation"
          element={<ProtectedRoute requiredRole="firestaff"><FireStaffSimulationPage /></ProtectedRoute>}
        />
        <Route
          path="/firestaff/incidents"
          element={<ProtectedRoute requiredRole="firestaff"><FireStaffIncidentPage /></ProtectedRoute>}
        />
        <Route path="/firestaff/profile" element={<ProtectedRoute requiredRole="firestaff"><ProfilePage actor="firestaff" /></ProtectedRoute>} />

        <Route path="/manager/home" element={<ProtectedRoute requiredRole="manager"><ManagerHomePage /></ProtectedRoute>} />
        <Route path="/manager/devices" element={<ProtectedRoute requiredRole="manager"><ManagerDevicePage /></ProtectedRoute>} />
        <Route path="/manager/escape" element={<ProtectedRoute requiredRole="manager"><ManagerEscapePage /></ProtectedRoute>} />
        <Route path="/manager/floor-check" element={<ProtectedRoute requiredRole="manager"><ManagerFloorCheckPage /></ProtectedRoute>} />
        <Route path="/manager/dashboard" element={<ProtectedRoute requiredRole="manager"><ManagerDashboardPage /></ProtectedRoute>} />
        <Route path="/manager/incidents" element={<ProtectedRoute requiredRole="manager"><ManagerIncidentPage /></ProtectedRoute>} />
        <Route path="/manager/reports" element={<ProtectedRoute requiredRole="manager"><ManagerReportPage /></ProtectedRoute>} />
        <Route path="/manager/account" element={<ProtectedRoute requiredRole="manager"><ManagerAccountPage /></ProtectedRoute>} />
        <Route path="/manager/profile" element={<ProtectedRoute requiredRole="manager"><ProfilePage actor="manager" /></ProtectedRoute>} />

        {/* Resident Pages */}
        <Route path="/resident/home" element={<ProtectedRoute requiredRole="resident"><ResidentHomePage /></ProtectedRoute>} />
        <Route path="/resident/escape" element={<ProtectedRoute requiredRole="resident"><ResidentEscapePage /></ProtectedRoute>} />
        <Route path="/resident/devices" element={<ProtectedRoute requiredRole="resident"><ResidentDevicePage /></ProtectedRoute>} />
        <Route path="/resident/guidance" element={<ProtectedRoute requiredRole="resident"><ResidentGuidancePage /></ProtectedRoute>} />
        <Route path="/resident/profile" element={<ProtectedRoute requiredRole="resident"><ProfilePage actor="resident" /></ProtectedRoute>} />

        {/* Default Routes */}
        <Route path="/" element={<Navigate to="/splash" replace />} />
        <Route path="*" element={<Navigate to="/splash" replace />} />
      </Routes>
    </>
  );
}

export default App;

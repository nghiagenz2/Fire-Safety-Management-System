import './styles/design-system.css';
import './styles/resident-shell.css';
import './styles/firestaff-shell.css';
import { Navigate, Route, Routes } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.jsx';
import ResidentGuidancePage from './pages/resident/ResidentGuidancePage.jsx';
import ResidentDevicePage from './pages/resident/ResidentDevicePage.jsx';
import FireStaffIncidentPage from './pages/firestaff/FireStaffIncidentPage.jsx';
import FireStaffSimulationPage from './pages/firestaff/FireStaffSimulationPage.jsx';

import ResidentHomePage from './pages/resident/ResidentHomePage.jsx';
import ResidentEscapePage from './pages/resident/ResidentEscapePage.jsx';

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/firestaff/home" element={<Navigate to="/firestaff/simulation" replace />} />
        <Route path="/firestaff/devices" element={<Navigate to="/firestaff/simulation" replace />} />
        <Route path="/firestaff/tasks" element={<Navigate to="/firestaff/simulation" replace />} />
        <Route path="/firestaff/simulation" element={<FireStaffSimulationPage />} />
        <Route path="/firestaff/incidents" element={<FireStaffIncidentPage />} />
        <Route path="/resident/home" element={<Navigate to="/resident/devices" replace />} />
        <Route path="/resident/escape" element={<Navigate to="/resident/guidance" replace />} />
        <Route path="/resident/devices" element={<ResidentDevicePage />} />
        <Route path="/resident/guidance" element={<ResidentGuidancePage />} />
        <Route path="/" element={<Navigate to="/firestaff/simulation" replace />} />
        <Route path="*" element={<Navigate to="/firestaff/simulation" replace />} />
      </Routes>
    </>
  );
}

export default App;

import './styles/design-system.css';
import './styles/resident-shell.css';
import { Navigate, Route, Routes } from 'react-router-dom';
import Splash from './components/Splash.jsx';
import Onboarding from './components/Onboarding.jsx';
import LoginForm from './components/LoginForm.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import ResidentGuidancePage from './pages/resident/ResidentGuidancePage.jsx';
import ResidentDevicePage from './pages/resident/ResidentDevicePage.jsx';

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Auth Flow */}
        <Route path="/splash" element={<Splash />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<LoginForm />} />

        {/* Resident Pages */}
        <Route path="/resident/home" element={<Navigate to="/resident/devices" replace />} />
        <Route path="/resident/escape" element={<Navigate to="/resident/guidance" replace />} />
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

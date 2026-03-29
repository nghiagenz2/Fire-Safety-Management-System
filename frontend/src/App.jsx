import './styles/design-system.css';
import './styles/resident-shell.css';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginForm from './components/LoginForm.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import ResidentGuidancePage from './pages/resident/ResidentGuidancePage.jsx';
import ResidentDevicePage from './pages/resident/ResidentDevicePage.jsx';
import ResidentHomePage from './pages/resident/ResidentHomePage.jsx';
import ResidentEscapePage from './pages/resident/ResidentEscapePage.jsx';

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/resident/home" element={<ResidentHomePage />} />
        <Route path="/resident/escape" element={<ResidentEscapePage />} />
        <Route path="/resident/devices" element={<ResidentDevicePage />} />
        <Route path="/resident/guidance" element={<ResidentGuidancePage />} />
        <Route path="/" element={<Navigate to="/resident/home" replace />} />
        <Route path="*" element={<Navigate to="/resident/home" replace />} />
      </Routes>
    </>
  );
}

export default App;

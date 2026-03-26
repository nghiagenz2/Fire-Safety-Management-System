import './styles/design-system.css';
import './styles/resident-shell.css';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginForm from './components/LoginForm.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import ResidentDevicePage from './pages/resident/ResidentDevicePage.jsx';

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/resident/home" element={<Navigate to="/resident/devices" replace />} />
        <Route path="/resident/escape" element={<Navigate to="/resident/devices" replace />} />
        <Route path="/resident/devices" element={<ResidentDevicePage />} />
        <Route path="/resident/guidance" element={<Navigate to="/resident/devices" replace />} />
        <Route path="/" element={<Navigate to="/resident/devices" replace />} />
        <Route path="*" element={<Navigate to="/resident/devices" replace />} />
      </Routes>
    </>
  );
}

export default App;

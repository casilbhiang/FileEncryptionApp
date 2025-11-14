import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Public Pages
import HomePage from './pages/Homepage';
import LoginPage from './pages/start/LoginPage';
import VerificationPage from './pages/start/VerificationPage';
import ResetPasswordPage from './pages/start/ResetPasswordPage'; // 🔑 ADD THIS

// Role-based Pages

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify" element={<VerificationPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} /> {/* 🔑 ADD THIS */}

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
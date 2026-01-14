import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './contexts/NotificationContext';
import NotificationToast from './components/NotificationToast';

// Public Pages
import HomePage from './pages/Homepage';
import LoginPage from './pages/start/LoginPage';
import VerificationPage from './pages/start/VerificationPage';
import ResetPasswordPage from './pages/start/ResetPasswordPage';

// Patient Pages
import PHomePage from './pages/patient/PHomePage';
import PConnectToDocPage from './pages/patient/PConnectToDocPage';

// Doctor Pages
import DHomePage from './pages/doctor/DHomePage';
import DViewPatientPage from './pages/doctor/DViewPatientPage';
import DViewHealthProfilePage from './pages/doctor/DViewHealthProfilePage';
import DConnectToPatientPage from './pages/doctor/DConnectToPatientPage';

// Manage File Pages
import MyFilesPage from './pages/manageFile/MyFiles';
import UploadFilePage from './pages/manageFile/UploadFile';
import ShareFiles from './pages/manageFile/ShareFiles';

// Admin Pages
import AHomePage from './pages/admin/AHomePage';
import AUserMgtPage from './pages/admin/AUserMgtPage';
import ACreateUserPage from './pages/admin/ACreateUserPage';
import AKeyMgtPage from './pages/admin/AKeyMgtPage';
import AAuditLogsPage from './pages/admin/AAuditLogsPage';
import AKeyLogsPage from './pages/admin/AKeyLogsPage';
import AFileLogsPage from './pages/admin/AFileLogsPage';
import ACloudStoragePage from './pages/admin/ACloudStoragePage';

function App() {
  return (
    <NotificationProvider>
      <NotificationToast />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify" element={<VerificationPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Patient Routes */}
          <Route path="/patient" element={<PHomePage />} />
          <Route path="/patient/home" element={<PHomePage />} />
          <Route path="/patient/my-files" element={<MyFilesPage />} />
          <Route path="/patient/upload" element={<UploadFilePage />} />
          <Route path="/patient/share" element={<ShareFiles />} />
          <Route path="/patient/connect" element={<PConnectToDocPage />} />

          {/* Doctor Routes */}
          <Route path="/doctor" element={<DHomePage />} />
          <Route path="/doctor/home" element={<DHomePage />} />
          <Route path="/doctor/my-files" element={<MyFilesPage />} />
          <Route path="/doctor/upload" element={<UploadFilePage />} />
          <Route path="/doctor/share" element={<ShareFiles />} />
          <Route path="/doctor/patients" element={<DViewPatientPage />} />
          <Route path="/doctor/patient-profile/:patientId" element={<DViewHealthProfilePage />} />
          <Route path="/doctor/connect" element={<DConnectToPatientPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AHomePage />} />
          <Route path="/admin/home" element={<AHomePage />} />
          <Route path="/admin/user-management" element={<AUserMgtPage />} />
          <Route path="/admin/create-user" element={<ACreateUserPage />} />
          <Route path="/admin/key-management" element={<AKeyMgtPage />} />
          <Route path="/admin/audit-logs" element={<AAuditLogsPage />} />
          <Route path="/admin/key-logs" element={<AKeyLogsPage />} />
          <Route path="/admin/file-logs" element={<AFileLogsPage />} />
          <Route path="/admin/cloud-storage" element={<ACloudStoragePage />} />

          {/* Redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </NotificationProvider>
  );
}

export default App;
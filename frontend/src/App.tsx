import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './contexts/NotificationContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationToast from './components/NotificationToast';

// Public Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/start/LoginPage';
import VerificationPage from './pages/start/VerificationPage';
import ResetPasswordPage from './pages/start/ResetPasswordPage';

// Patient Pages
import PHomePage from './pages/patient/PHomePage';
import PConnectToDocPage from './pages/patient/PConnectToDocPage';
import PProfilePage from './pages/patient/PProfilePage';

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

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <NotificationToast />
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify" element={<VerificationPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Patient Routes */}
            <Route path="/patient" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PHomePage />
              </ProtectedRoute>
            } />
            <Route path="/patient/home" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PHomePage />
              </ProtectedRoute>
            } />
            <Route path="/patient/my-files" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <MyFilesPage />
              </ProtectedRoute>
            } />
            <Route path="/patient/upload" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <UploadFilePage />
              </ProtectedRoute>
            } />
            <Route path="/patient/share" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <ShareFiles />
              </ProtectedRoute>
            } />
            <Route path="/patient/profile" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/patient/connect" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PConnectToDocPage />
              </ProtectedRoute>
            } />

            {/* Doctor Routes */}
            <Route path="/doctor" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DHomePage />
              </ProtectedRoute>
            } />
            <Route path="/doctor/home" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DHomePage />
              </ProtectedRoute>
            } />
            <Route path="/doctor/my-files" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <MyFilesPage />
              </ProtectedRoute>
            } />
            <Route path="/doctor/upload" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <UploadFilePage />
              </ProtectedRoute>
            } />
            <Route path="/doctor/share" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <ShareFiles />
              </ProtectedRoute>
            } />
            <Route path="/doctor/patients" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DViewPatientPage />
              </ProtectedRoute>
            } />
            <Route path="/doctor/patient-profile/:patientId" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DViewHealthProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/doctor/connect" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DConnectToPatientPage />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AHomePage />
              </ProtectedRoute>
            } />
            <Route path="/admin/home" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AHomePage />
              </ProtectedRoute>
            } />
            <Route path="/admin/user-management" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AUserMgtPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/create-user" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ACreateUserPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/key-management" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AKeyMgtPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/audit-logs" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AAuditLogsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/key-logs" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AKeyLogsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/file-logs" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AFileLogsPage />
              </ProtectedRoute>
            } />

            {/* Redirect unknown routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
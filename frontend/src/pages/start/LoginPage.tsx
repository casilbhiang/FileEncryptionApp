'use client';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, ChevronDown } from 'lucide-react';
import simncryptLogo from '../../images/simncrypt.jpg';
import BiometricModal from '../../components/BiometricModal';
import BiometricService from '../../services/Biometric';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    role: '',
    userId: '',
    nric: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Biometric states
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricMode, setBiometricMode] = useState<'register' | 'authenticate'>('authenticate');
  const [pendingNavigation, setPendingNavigation] = useState<any>(null);

  const roles = [
    { value: 'patient', label: 'Patient' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'admin', label: 'Admin' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleBiometricSuccess = () => {
    // Biometric authentication successful, proceed with navigation
    if (pendingNavigation) {
      setSuccess('Authentication successful! Redirecting...');
      setTimeout(() => {
        navigate(pendingNavigation.path, pendingNavigation.options);
      }, 1000);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (!formData.role) throw new Error('Please select a role');
      if (!formData.userId.trim()) throw new Error('Please enter your User ID');
      if (!formData.nric.trim()) throw new Error('Please enter your NRIC');
      if (!formData.password) throw new Error('Please enter your password');

      const API_URL = import.meta.env.VITE_API_URL;
      if (!API_URL) throw new Error('API URL not configured');

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');

      /* ================= STORE AUTH ================= */
      localStorage.setItem('auth_token', data.token);

      const email = data.user?.email || `${formData.userId}@clinic.com`;

      localStorage.setItem('user_role', data.user.role);
      localStorage.setItem('user_id', data.user.user_id);
      localStorage.setItem('user_uuid', data.user.id);
      localStorage.setItem('user_email', email);
      localStorage.setItem('is_first_login', data.user.is_first_login ? 'true' : 'false');

      localStorage.setItem('user', JSON.stringify({
        id: data.user.user_id,
        uuid: data.user.id,
        role: data.user.role,
        email,
        name: data.user.full_name
      }));

      /* ================= ADMIN BIOMETRIC ================= */
      if (formData.role === 'admin') {
        await handleAdminBiometric(email);
        return;
      }

      /* ================= NORMAL USERS ================= */
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        navigate('/verify', { state: { email, role: formData.role } });
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };


  /**
   * Handle biometric authentication for admin users
   */
  const handleAdminBiometric = async (email: string) => {
    try {
      // Check if biometrics are available
      const isAvailable = await BiometricService.isBiometricAvailable();
      
      if (!isAvailable) {
        // Device doesn't support biometrics, proceed without it
        console.log('Biometrics not available on this device');
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          navigate('/verify', {
            state: { email, role: 'admin' }
          });
        }, 1000);
        return;
      }

      // Check if user has registered biometric
      const hasRegistered = await BiometricService.hasRegisteredBiometric(formData.userId);

      // Store pending navigation
      setPendingNavigation({
        path: '/verify',
        options: {
          state: { email, role: 'admin' }
        }
      });

      if (hasRegistered) {
        // User has biometric, prompt for authentication
        setBiometricMode('authenticate');
        setShowBiometricModal(true);
      } else {
        // User doesn't have biometric, prompt for registration
        setBiometricMode('register');
        setShowBiometricModal(true);
      }

    } catch (error) {
      console.error('Biometric check error:', error);
      // On error, allow user to proceed
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        navigate('/verify', {
          state: { email, role: 'admin' }
        });
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left Side - Logo Display */}
          <div className="hidden md:flex flex-col items-center justify-center text-center px-4">
            <div>
              <img
                src={simncryptLogo}
                alt="SIM NCRYPT"
                className="h-96 w-96 mx-auto rounded-3xl object-contain shadow-2xl"
              />
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12 shadow-2xl">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Welcome Back</h1>
              <p className="text-blue-100 text-sm mb-8">Sign in to access your medical records</p>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-500 bg-opacity-20 border border-red-300 rounded-lg">
                  <p className="text-white text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="mb-6 p-4 bg-green-500 bg-opacity-20 border border-green-300 rounded-lg">
                  <p className="text-white text-sm font-medium">{success}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Role Selection */}
                <div>
                  <label className="text-white text-sm font-semibold mb-3 block">Role</label>
                  <div className="relative">
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="w-full px-4 py-3 pr-10 bg-white bg-opacity-30 border-2 border-white rounded-full text-gray-900 focus:outline-none focus:ring-2 focus:ring-white focus:bg-opacity-40 transition appearance-none cursor-pointer font-medium disabled:opacity-50"
                    >
                      <option value="" className="text-gray-900">Select your role</option>
                      {roles.map((role) => (
                        <option key={role.value} value={role.value} className="text-gray-900">
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-900 pointer-events-none" />
                  </div>
                </div>

                {/* User ID */}
                <div>
                  <label className="text-white text-sm font-semibold mb-3 block">User Id</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="userId"
                      value={formData.userId}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      placeholder="Enter your User ID"
                      className="w-full px-4 py-3 pl-10 bg-white bg-opacity-30 border-2 border-white rounded-full text-gray-900 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-white focus:bg-opacity-40 transition font-medium disabled:opacity-50"
                    />
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-900" />
                  </div>
                </div>

                {/* NRIC */}
                <div>
                  <label className="text-white text-sm font-semibold mb-3 block">NRIC</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="nric"
                      value={formData.nric}
                      onChange={(e) => {
                        const { name, value } = e.target;
                        setFormData((prev) => ({
                          ...prev,
                          [name]: value.toUpperCase(),
                        }));
                        setError('');
                      }}
                      disabled={isLoading}
                      placeholder="Enter your NRIC"
                      className="w-full px-4 py-3 pl-10 bg-white bg-opacity-30 border-2 border-white rounded-full text-gray-900 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-white focus:bg-opacity-40 transition font-medium disabled:opacity-50"
                    />
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-900" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-white text-sm font-semibold mb-3 block">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 pl-10 pr-10 bg-white bg-opacity-30 border-2 border-white rounded-full text-gray-900 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-white focus:bg-opacity-40 transition font-medium disabled:opacity-50"
                    />
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-900" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-900 hover:text-gray-700 transition disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 mt-8 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-700 active:bg-gray-900 text-white font-bold rounded-full transition duration-200 text-lg flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Logging in...
                    </>
                  ) : (
                    'Log-In'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="my-8 flex items-center">
                <div className="flex-grow border-t border-white border-opacity-20"></div>
                <span className="px-3 text-white text-opacity-70 text-xs font-medium">or</span>
                <div className="flex-grow border-t border-white border-opacity-20"></div>
              </div>

              {/* Help Section */}
              <div className="text-center">
                <p className="text-blue-100 text-sm">
                  Need Help?{' '}
                  <a href="mailto:fyp2502@gmail.com" className="text-white hover:text-blue-100 underline font-semibold transition">
                    Contact Clinic Admin At fyp2502@gmail.com
                  </a>
                </p>
              </div>
            </div>

            {/* Mobile Logo */}
            <div className="md:hidden text-center mt-8">
              <img
                src={simncryptLogo}
                alt="SIM NCRYPT"
                className="h-12 w-12 mx-auto rounded-lg object-cover mb-3"
              />
              <p className="text-gray-700 font-semibold">SIM NCRYPT</p>
              <p className="text-gray-600 text-xs mt-1">Secure Medical Records</p>
            </div>
          </div>
        </div>
      </div>

      {/* Biometric Modal */}
      <BiometricModal
        isOpen={showBiometricModal}
        onClose={() => {
          setShowBiometricModal(false);
          // If user closes modal, allow them to proceed
          if (biometricMode === 'register' && pendingNavigation) {
            setSuccess('Login successful! Redirecting...');
            setTimeout(() => {
              navigate(pendingNavigation.path, pendingNavigation.options);
            }, 1000);
          }
        }}
        onSuccess={handleBiometricSuccess}
        userId={formData.userId}
        userName={formData.userId}
        mode={biometricMode}
      />
    </div>
  );
};

export default LoginPage;
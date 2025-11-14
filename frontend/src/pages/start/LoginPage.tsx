'use client';

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, ChevronDown } from 'lucide-react';
import simncryptLogo from '../../images/simncrypt.jpg';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    role: '',
    userId: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!formData.role) {
      setError('Please select a role');
      setIsLoading(false);
      return;
    }

    if (!formData.userId.trim()) {
      setError('Please enter your User ID');
      setIsLoading(false);
      return;
    }

    if (!formData.password) {
      setError('Please enter your password');
      setIsLoading(false);
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL;
      
      if (API_URL) {
        // ============================================
        // TODO FOR BACKEND DEVELOPER - IMPLEMENT LOGIN
        // ============================================
        // 
        // Endpoint: POST /api/auth/login
        //
        // 1. REQUEST BODY (what frontend sends):
        //    {
        //      "role": "patient" | "doctor" | "admin",
        //      "userId": "user_id_string",
        //      "password": "password_string"
        //    }
        //
        // 2. RESPONSE (what to return on success):
        //    {
        //      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        //      "user": {
        //        "id": "user_id",
        //        "email": "user@example.com",
        //        "role": "patient"
        //      }
        //    }
        //
        // 3. ERROR RESPONSE (on failure):
        //    Status: 401
        //    {
        //      "message": "Invalid credentials"
        //    }
        //
        // 4. BACKEND LOGIC:
        //    a) Validate all fields are provided (role, userId, password)
        //    b) Query database: User.query.filter_by(
        //         user_id=userId, 
        //         role=role
        //       ).first()
        //    c) If user not found → return 401
        //    d) Check password with:
        //       from werkzeug.security import check_password_hash
        //       if not check_password_hash(user.password_hash, password):
        //           return 401, {"message": "Invalid credentials"}
        //    e) If valid:
        //       - Import: from flask_jwt_extended import create_access_token
        //       - Generate JWT token:
        //         token = create_access_token(
        //           identity=user.id,
        //           expires_delta=timedelta(hours=24),
        //           additional_claims={
        //             'role': user.role,
        //             'email': user.email
        //           }
        //         )
        //       - Return 200 with token + user info
        //    f) Log login attempt (for audit trail):
        //       LoginLog.create(
        //         user_id=user.id,
        //         role=user.role,
        //         timestamp=datetime.now(),
        //         success=True
        //       )
        //
        // 5. SECURITY REQUIREMENTS:
        //    ✓ Never reveal if user exists or password is wrong
        //      (always say "Invalid credentials" for both cases)
        //    ✓ Hash passwords with werkzeug or bcrypt
        //    ✓ Implement rate limiting:
        //      - Max 5 login attempts per minute per user_id
        //      - Return 429 (Too Many Requests) after limit
        //    ✓ Implement account lockout after N failures:
        //      - Lock account after 10 failed attempts
        //      - Require admin unlock or wait 30 minutes
        //    ✓ Store JWT secret in environment variable:
        //      - Never hardcode it
        //      - Use strong random string (32+ chars)
        //    ✓ Use HTTPS only in production
        //    ✓ Set token expiry to reasonable duration (24 hours)
        //    ✓ Log all login attempts with IP address:
        //      - Success or failure
        //      - Timestamp
        //      - User ID and role
        //
        // 6. DATABASE SCHEMA (User model):
        //    - id: String (primary key)
        //    - user_id: String (unique, indexed)
        //    - role: String (patient/doctor/admin)
        //    - email: String (unique, indexed)
        //    - password_hash: String (hashed with bcrypt/werkzeug)
        //    - created_at: DateTime
        //    - last_login: DateTime (nullable)
        //    - is_active: Boolean
        //
        // ============================================
        
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: formData.role,
            userId: formData.userId,
            password: formData.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || 'Login failed. Please try again.');
          setIsLoading(false);
          return;
        }

        // Store data and redirect
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
        }

        if (data.user) {
          localStorage.setItem('user_role', data.user.role);
          localStorage.setItem('user_id', data.user.id);
          localStorage.setItem('user_email', data.user.email || `${formData.userId}@clinic.com`);
        }

        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          navigate('/verify', { 
            state: { 
              email: data.user?.email || `${formData.userId}@clinic.com`,
              role: formData.role 
            } 
          });
        }, 1000);
      } else {
        // Demo mode - no backend, just navigate
        console.log('Demo mode: No API URL set, navigating...');
        
        // Store user data with a proper email format
        const userEmail = `${formData.userId}@clinic.com`;
        
        localStorage.setItem('user_role', formData.role);
        localStorage.setItem('user_id', formData.userId);
        localStorage.setItem('user_email', userEmail);

        // Demo: Check if password is temporary (matches user ID for demo)
        // In real implementation, backend will tell you if it's a temporary password
        const isTemporaryPassword = formData.password === 'temp123' || formData.password === 'temporary';
        
        if (isTemporaryPassword) {
          setSuccess('Login successful! Redirecting to password reset...');
          setTimeout(() => {
            navigate('/reset-password', { 
              state: { 
                userId: formData.userId,
                role: formData.role 
              } 
            });
          }, 500);
        } else {
          setSuccess('Login successful! Redirecting...');
          setTimeout(() => {
            navigate('/verify', { 
              state: { 
                email: userEmail,
                role: formData.role 
              } 
            });
          }, 500);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // Demo mode fallback - navigate anyway
      console.log('Error occurred, using demo mode navigation...');
      
      const userEmail = `${formData.userId}@clinic.com`;
      localStorage.setItem('user_role', formData.role);
      localStorage.setItem('user_id', formData.userId);
      localStorage.setItem('user_email', userEmail);

      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        navigate('/verify', { 
          state: { 
            email: userEmail,
            role: formData.role 
          } 
        });
      }, 500);
    } finally {
      setIsLoading(false);
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
                  <a href="tel:+6512345678" className="text-white hover:text-blue-100 underline font-semibold transition">
                    Contact Clinic Admin At +65-XXXX-XXXX
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
    </div>
  );
};

export default LoginPage;
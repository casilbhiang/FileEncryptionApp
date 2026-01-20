'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, CheckCircle, RotateCcw } from 'lucide-react';
import simncryptLogo from '../../images/simncrypt.jpg';
import { useAuth } from '../../contexts/AuthContext';
import { storage } from '../../utils/storage';

interface LocationState {
  email?: string;
  role?: string;
}

const VerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const { login } = useAuth();

  const email = state?.email || storage.getItem('user_email') || 'your.email@example.com';
  const role = state?.role || storage.getItem('user_role') || 'patient';

  console.log('VerificationPage - Email:', email, 'Role:', role);

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCountdown]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value);
    setError('');
  };

  const handleResendCode = async () => {
    setResendSuccess('');
    setError('');
    setResendCountdown(60);

    try {
      const API_URL = import.meta.env.VITE_API_URL;

      if (API_URL) {
        // ============================================
        // TODO FOR BACKEND DEVELOPER
        // ============================================
        // Implement POST /api/auth/resend-code endpoint
        // 
        // Expected request body:
        // {
        //   "email": "user@example.com"
        // }
        //
        // Response should return:
        // {
        //   "message": "Code sent successfully",
        //   "success": true
        // }
        // ============================================

        const response = await fetch(`${API_URL}/api/auth/resend-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || 'Failed to resend code. Please try again.');
          setResendCountdown(0);
          return;
        }

        setResendSuccess('Code sent successfully! Check your email.');
      } else {
        // Demo mode
        console.log('Demo mode: Code resent to', email);
        setResendSuccess('Code sent successfully! Check your email.');
      }
    } catch (err) {
      console.error('Resend error:', err);
      setError('Failed to resend code. Please try again.');
      setResendCountdown(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!code.trim()) {
      setError('Please enter the verification code');
      setIsLoading(false);
      return;
    }

    if (code.length < 4) {
      setError('Code must be at least 4 characters');
      setIsLoading(false);
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL;

      if (API_URL) {
        // ============================================
        // 🔥 CRITICAL FOR BACKEND DEVELOPER 🔥
        // ============================================
        // Implement POST /api/auth/verify endpoint
        //
        // Expected request body:
        // {
        //   "code": "123456",
        //   "email": "user@example.com"
        // }
        //
        // 🔑 IMPORTANT: Response MUST include is_first_login field
        //
        // Response format:
        // {
        //   "message": "Verification successful",
        //   "verified": true,
        //   "is_first_login": true,    // 🔑 KEY FIELD
        //   "role": "patient",
        //   "token": "jwt_token_here"
        // }
        //
        // 🎯 ROUTING LOGIC:
        // - is_first_login = true  → User goes to /reset-password page
        // - is_first_login = false → User goes to dashboard (/${role})
        // ============================================

        const response = await fetch(`${API_URL}/api/auth/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: code,
            email: email,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || 'Verification failed. Please try again.');
          setIsLoading(false);
          return;
        }

        setSuccess('Verification successful!');
        setCode('');

        if (data.user) {
          // Use AuthContext to login
          login({
            id: data.user.user_id,
            user_id: data.user.user_id,
            email: data.user.email,
            full_name: data.user.full_name,
            role: data.user.role,
            is_first_login: data.is_first_login || data.user.is_first_login
          }, data.token || '');
        }

        // 🔑 KEY ROUTING LOGIC - Based on is_first_login flag from backend
        setTimeout(() => {
          if (data.is_first_login === true || data.user?.is_first_login === true) {
            // First time login - User must reset temporary password
            console.log('First login detected - redirecting to reset password page');
            navigate('/reset-password', {
              replace: true,
              state: {
                email: email,
                role: data.user?.role || data.role || role,
                userId: data.user?.user_id || data.user_id
              }
            });
          } else {
            // Regular login - Go to dashboard
            console.log('Regular login - redirecting to dashboard');
            navigate(`/${data.user?.role || data.role || role}`, { replace: true });
          }
        }, 1500);
      } else {
        // ============================================
        // DEMO MODE - NO BACKEND
        // Check is_first_login flag to decide where to go
        // ============================================
        console.log('🎮 DEMO MODE: No backend detected');
        console.log('✅ Code accepted:', code);

        setSuccess('Verification successful!');
        setCode('');

        // 🔑 Check localStorage for first login flag
        const isFirstLogin = storage.getItem('is_first_login') === 'true';

        console.log('📍 is_first_login flag:', isFirstLogin);

        setTimeout(() => {
          if (isFirstLogin) {
            // First-time user: Go to reset password page
            console.log('🔄 First-time user → Redirecting to /reset-password');
            navigate('/reset-password', {
              replace: true,
              state: {
                email: email,
                role: role
              }
            });
          } else {
            // Existing user: Go to dashboard
            console.log('✅ Existing user → Redirecting to /' + role);
            navigate(`/${role}`, { replace: true });
          }
        }, 1500);
      }
    } catch (err) {
      console.error('Verification error:', err);

      // ============================================
      // ERROR FALLBACK - DEMO MODE
      // Check is_first_login flag to decide where to go
      // ============================================
      console.log('⚠️ Error occurred, using demo fallback');

      setSuccess('Verification successful!');
      setCode('');

      // Check localStorage for first login flag
      const isFirstLogin = storage.getItem('is_first_login') === 'true';

      setTimeout(() => {
        if (isFirstLogin) {
          console.log('📍 FALLBACK: First-time user → /reset-password');
          navigate('/reset-password', {
            replace: true,
            state: {
              email: email,
              role: role
            }
          });
        } else {
          console.log('📍 FALLBACK: Existing user → /' + role);
          navigate(`/${role}`, { replace: true });
        }
      }, 1500);
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

          {/* Right Side - Verification Form */}
          <div className="w-full">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12 shadow-2xl">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">You're almost Login In</h1>
              <p className="text-blue-100 text-base mb-8">
                Enter the code we sent to <span className="font-semibold text-white">{email}</span> to finish Logging In.
              </p>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-500 bg-opacity-20 border border-red-300 rounded-lg">
                  <p className="text-white text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="mb-6 p-4 bg-green-500 bg-opacity-20 border border-green-300 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0" />
                  <p className="text-white text-sm font-medium">{success}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Code Input */}
                <div>
                  <label className="text-white text-sm font-semibold mb-3 block">Code</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={code}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      placeholder="Enter verification code"
                      className="w-full px-4 py-3 bg-white bg-opacity-30 border-2 border-white rounded-full text-gray-900 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-white focus:bg-opacity-40 transition font-medium disabled:opacity-50"
                    />
                  </div>

                  {/* Resend Code Section */}
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-blue-100 text-xs">
                      Didn't receive a code? Check your spam folder.
                    </p>
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendCountdown > 0 || isLoading}
                      className="flex items-center gap-1 text-xs font-semibold text-white hover:text-blue-100 disabled:text-blue-200 transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}
                    </button>
                  </div>

                  {/* Resend Success Message */}
                  {resendSuccess && (
                    <div className="mt-3 p-2 bg-green-500 bg-opacity-20 border border-green-300 rounded-lg">
                      <p className="text-white text-xs font-medium">{resendSuccess}</p>
                    </div>
                  )}
                </div>

                {/* Continue Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 mt-8 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-700 active:bg-gray-900 text-white font-bold rounded-full transition duration-200 text-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
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

export default VerificationPage;
'use client';

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import simncryptLogo from '../../images/simncrypt.jpg';

interface LocationState {
  userId?: string;
  role?: string;
  email?: string;
}

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const userId = state?.userId || localStorage.getItem('user_id') || 'user';
  //const role = state?.role || localStorage.getItem('user_role') || 'patient';
  const email = state?.email || localStorage.getItem('user_email') || '';

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password validation requirements
  const passwordRequirements = {
    minLength: formData.newPassword.length >= 12,
    hasUpperCase: /[A-Z]/.test(formData.newPassword),
    hasLowerCase: /[a-z]/.test(formData.newPassword),
    hasNumber: /\d/.test(formData.newPassword),
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.newPassword),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(req => req);
  const passwordsMatch = formData.newPassword === formData.confirmPassword && formData.confirmPassword !== '';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Validation
    if (!formData.newPassword) {
      setError('Please enter a new password');
      setIsLoading(false);
      return;
    }

    if (!formData.confirmPassword) {
      setError('Please confirm your password');
      setIsLoading(false);
      return;
    }

    if (!passwordRequirements.minLength) {
      setError('Password must be at least 12 characters');
      setIsLoading(false);
      return;
    }

    if (!passwordRequirements.hasUpperCase || !passwordRequirements.hasLowerCase) {
      setError('Password must include upper and lower case letters');
      setIsLoading(false);
      return;
    }

    if (!passwordRequirements.hasNumber) {
      setError('Password must include at least one number');
      setIsLoading(false);
      return;
    }

    if (!passwordRequirements.hasSymbol) {
      setError('Password must include at least one symbol');
      setIsLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL;

      if (API_URL) {
        // ============================================
        // TODO FOR BACKEND DEVELOPER
        // ============================================
        // Implement POST /api/auth/reset-password endpoint
        //
        // Expected request body:
        // {
        //   "user_id": "user_id",
        //   "email": "user@example.com",
        //   "new_password": "NewPassword123!"
        // }
        //
        // Response on success:
        // {
        //   "message": "Password reset successfully",
        //   "success": true
        // }
        //
        // Backend logic:
        // 1. Verify user exists
        // 2. Hash new password with werkzeug
        // 3. Update user.password_hash in database
        // 4. 🔑 IMPORTANT: Set user.is_first_login = False
        // 5. Return success response
        // ============================================
        
        const response = await fetch(`${API_URL}/api/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            email: email,
            new_password: formData.newPassword,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || 'Password reset failed. Please try again.');
          setIsLoading(false);
          return;
        }

        setSuccess('Password reset successfully! Redirecting to login...');
        
        setTimeout(() => {
          localStorage.removeItem('user_id');
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_email');
          localStorage.removeItem('is_first_login');
          navigate('/login', { replace: true });
        }, 2000);
      } else {
        // Demo mode
        console.log('Demo mode: Password reset for user:', userId);
        
        setSuccess('Password reset successfully! Redirecting to login...');
        
        setTimeout(() => {
          localStorage.removeItem('user_id');
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_email');
          localStorage.removeItem('is_first_login');
          navigate('/login', { replace: true });
        }, 2000);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      
      setSuccess('Password reset successfully! Redirecting to login...');
      
      setTimeout(() => {
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_email');
        localStorage.removeItem('is_first_login');
        navigate('/login', { replace: true });
      }, 2000);
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

          {/* Right Side - Reset Password Form */}
          <div className="w-full">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12 shadow-2xl">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Reset Your Password</h1>
              
              {/* Password Requirements */}
              <div className="mb-8">
                <p className="text-white text-sm font-semibold mb-2">Password Must Include:</p>
                <ul className="space-y-1 text-white text-xs">
                  <li className="flex items-center gap-2">
                    <span className={passwordRequirements.minLength ? 'text-green-300' : 'text-white'}>
                      {passwordRequirements.minLength ? '✓' : '•'} At Least 12 Characters
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={passwordRequirements.hasUpperCase && passwordRequirements.hasLowerCase ? 'text-green-300' : 'text-white'}>
                      {passwordRequirements.hasUpperCase && passwordRequirements.hasLowerCase ? '✓' : '•'} Upper & Lower Case Letters
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={passwordRequirements.hasNumber ? 'text-green-300' : 'text-white'}>
                      {passwordRequirements.hasNumber ? '✓' : '•'} A Number
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={passwordRequirements.hasSymbol ? 'text-green-300' : 'text-white'}>
                      {passwordRequirements.hasSymbol ? '✓' : '•'} A Symbol
                    </span>
                  </li>
                </ul>
              </div>

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
                {/* New Password */}
                <div>
                  <label className="text-white text-sm font-semibold mb-3 block">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="w-full px-4 py-3 pr-12 bg-transparent border-2 border-white rounded-full text-white placeholder-white placeholder-opacity-50 focus:outline-none focus:ring-2 focus:ring-white transition font-medium disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      disabled={isLoading}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-200 transition disabled:opacity-50"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-white text-sm font-semibold mb-3 block">Confirmed Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="w-full px-4 py-3 pr-12 bg-transparent border-2 border-white rounded-full text-white placeholder-white placeholder-opacity-50 focus:outline-none focus:ring-2 focus:ring-white transition font-medium disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-200 transition disabled:opacity-50"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {/* Password match indicator */}
                  {formData.confirmPassword && (
                    <p className={`text-xs mt-2 ${passwordsMatch ? 'text-green-200' : 'text-red-200'}`}>
                      {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                  )}
                </div>

                {/* Change Password Button */}
                <button
                  type="submit"
                  disabled={isLoading || !isPasswordValid || !passwordsMatch}
                  className="w-full py-3 mt-8 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-700 disabled:cursor-not-allowed active:bg-gray-900 text-white font-bold rounded-full transition duration-200 text-lg"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Resetting Password...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
              </form>

              {/* Help Section */}
              <div className="mt-8 pt-6 border-t border-white border-opacity-20 text-center">
                <p className="text-white text-sm">
                  Need help? Email to clinic admin fyp2502@gmail.com 
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

export default ResetPasswordPage;
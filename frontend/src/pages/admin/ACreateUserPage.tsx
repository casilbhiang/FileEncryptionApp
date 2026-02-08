'use client';
import React, { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { ChevronDown } from 'lucide-react';

const ACreateUserPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<'Doctor' | 'Patient' | 'Admin' | ''>('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    nric: '',
    dateOfBirth: '',
    userId: '',
    password: '',
  });

  // Health Profile State (only for Patient)
  const [healthProfile, setHealthProfile] = useState({
    age: '',
    sex: '',
    bloodType: '',
    height: '',
    weight: '',
    allergies: '',
    chronicConditions: '',
    vaccinations: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get today's date in YYYY-MM-DD format for max date validation
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // NRIC validation - Format: A1234567B (Letter + 7 digits + Letter)
  const isValidNRIC = (nric: string) => {
    // Remove any spaces and convert to uppercase
    const cleanNric = nric.trim().toUpperCase();
    
    // Check format: 1 letter + 7 digits + 1 letter (total 9 characters)
    const nricRegex = /^[A-Z]\d{7}[A-Z]$/;
    
    return nricRegex.test(cleanNric);
  };

  // Format NRIC input - only allow valid characters
  const formatNRICInput = (value: string) => {
    // Remove all non-alphanumeric characters
    let cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Limit to 9 characters
    if (cleaned.length > 9) {
      cleaned = cleaned.substring(0, 9);
    }
    
    return cleaned;
  };

  // Height validation (in cm, typical range 50-250)
  const isValidHeight = (height: string) => {
    if (!height) return true; // Allow empty
    const num = parseFloat(height);
    return !isNaN(num) && num > 0 && num <= 300;
  };

  // Weight validation (in kg, typical range 1-500)
  const isValidWeight = (weight: string) => {
    if (!weight) return true; // Allow empty
    const num = parseFloat(weight);
    return !isNaN(num) && num > 0 && num <= 700;
  };

  const handleCreateUser = async () => {
    setError('');
    setSuccess('');

    // Validation
    if (!formData.fullName.trim()) {
      setError('Please enter full name');
      return;
    }

    if (!formData.email.trim()) {
      setError('Please enter email address');
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!formData.nric.trim()) {
      setError('Please enter NRIC');
      return;
    }

    // NRIC format validation
    if (!isValidNRIC(formData.nric)) {
      setError('Invalid NRIC format. Must be 1 letter + 7 digits + 1 letter (e.g., S1234567A)');
      return;
    }

    if (!formData.dateOfBirth) {
      setError('Please enter date of birth');
      return;
    }

    // Check if date is not in the future
    const selectedDate = new Date(formData.dateOfBirth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
      setError('Date of birth cannot be in the future');
      return;
    }

    if (!selectedRole) {
      setError('Please select a user role');
      return;
    }

    // Patient-specific validations
    if (selectedRole === 'Patient') {
      if (healthProfile.age) {
        const ageValue = parseInt(healthProfile.age);
        
        if (isNaN(ageValue) || ageValue < 0 || ageValue > 150) {
          setError('Age must be between 0 and 150 years');
          return;
        }
      }

      if (healthProfile.height && !isValidHeight(healthProfile.height)) {
        setError('Please enter a valid height (in cm, max 300)');
        return;
      }

      if (healthProfile.weight && !isValidWeight(healthProfile.weight)) {
        setError('Please enter a valid weight (in kg, max 700)');
        return;
      }
    }

    // Clear old generated credentials
    setFormData(prev => ({
      ...prev,
      userId: '',
      password: ''
    }));

    setIsLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL;
      
      if (!API_URL) {
        setError('API URL not configured');
        setIsLoading(false);
        return;
      }

      const requestBody: any = {
        full_name: formData.fullName,
        email: formData.email,
        nric: formData.nric,
        date_of_birth: formData.dateOfBirth,
        role: selectedRole.toLowerCase(),
      };

      // Add health profile if creating a patient
      if (selectedRole.toLowerCase() === 'patient') {
        requestBody.health_profile = healthProfile;
      }

      const response = await fetch(`${API_URL}/api/auth/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to create user');
        setIsLoading(false);
        return;
      }

      // Update form with generated credentials
      setFormData(prev => ({
        ...prev,
        userId: data.user.user_id,
        password: data.user.temporary_password
      }));

      setSuccess(`User created successfully! User ID: ${data.user.user_id}`);

    } catch (err) {
      console.error('Create user error:', err);
      setError('Failed to create user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole="admin" currentPage="user-management" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">Create New USER</h1>
            <p className="text-gray-600">Create a new user account with specified role and permissions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreateUser}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create User'}
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Back
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-4xl">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm font-medium">{success}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Full NRIC Name
              </label>
              <input
                type="text"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* User Role */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                User Role
              </label>
              <div className="relative">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Role</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Patient">Patient</option>
                  <option value="Admin">Admin</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="example@email.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* NRIC */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                NRIC
              </label>
              <input
                type="text"
                placeholder="S1234567A"
                maxLength={9}
                value={formData.nric}
                onChange={(e) => {
                  const formatted = formatNRICInput(e.target.value);
                  setFormData(prev => ({ ...prev, nric: formatted }));
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  formData.nric && !isValidNRIC(formData.nric) 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: 1 letter + 7 digits + 1 letter (e.g., S1234567A)
              </p>
              {formData.nric && !isValidNRIC(formData.nric) && (
                <p className="text-xs text-red-500 mt-1">
                  Invalid NRIC format
                </p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                max={getTodayDate()}
                value={formData.dateOfBirth}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Generate UserID & Password Section */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4">Generated Credentials</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  User ID
                </label>
                <input
                  type="text"
                  value={formData.userId}
                  readOnly
                  placeholder="Will be generated after creation"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Temporary Password
                </label>
                <input
                  type="text"
                  value={formData.password}
                  readOnly
                  placeholder="Will be generated after creation"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                />
              </div>
            </div>
            {formData.userId && formData.password && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ Important: Please save these credentials and share them securely with the user. The password will not be shown again.
                </p>
              </div>
            )}
          </div>

          {/* Health Profile Section (Only for Patient) */}
          {selectedRole === 'Patient' && (
            <div className="bg-teal-50 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4">Health Profile (Optional)</h3>
              
              {/* Basic Health Info */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                  <input
                    type="number"
                    min="0"
                    max="150"
                    placeholder="e.g. 25"
                    value={healthProfile.age}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || parseInt(value) >= 0) {
                        setHealthProfile(prev => ({ ...prev, age: value }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sex</label>
                  <select
                    value={healthProfile.sex}
                    onChange={(e) => setHealthProfile(prev => ({ ...prev, sex: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Blood Type</label>
                  <select
                    value={healthProfile.bloodType}
                    onChange={(e) => setHealthProfile(prev => ({ ...prev, bloodType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Height (cm)</label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    step="0.1"
                    placeholder="e.g. 170.3"
                    value={healthProfile.height}
                    onChange={(e) => setHealthProfile(prev => ({ ...prev, height: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    min="0"
                    max="700"
                    step="0.1"
                    placeholder="e.g. 70.5"
                    value={healthProfile.weight}
                    onChange={(e) => setHealthProfile(prev => ({ ...prev, weight: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Medical History */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Allergies</label>
                  <input
                    type="text"
                    placeholder="e.g. Penicillin, Peanuts (comma-separated)"
                    value={healthProfile.allergies}
                    onChange={(e) => setHealthProfile(prev => ({ ...prev, allergies: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Chronic Conditions</label>
                  <input
                    type="text"
                    placeholder="e.g. Diabetes, Hypertension (comma-separated)"
                    value={healthProfile.chronicConditions}
                    onChange={(e) => setHealthProfile(prev => ({ ...prev, chronicConditions: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Vaccinations</label>
                  <input
                    type="text"
                    placeholder="e.g. COVID-19 2021, Influenza 2023 (comma-separated)"
                    value={healthProfile.vaccinations}
                    onChange={(e) => setHealthProfile(prev => ({ ...prev, vaccinations: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ACreateUserPage;
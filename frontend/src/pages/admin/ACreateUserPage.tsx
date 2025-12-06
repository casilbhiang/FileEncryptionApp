'use client';

import React, { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { ChevronDown } from 'lucide-react';

const ACreateUserPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<'Doctor' | 'Patient' | 'Admin' | ''>('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
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

  const handleGenerate = () => {
    // Generate random user ID and password
    const randomUserId = `#U-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const randomPassword = Math.random().toString(36).substring(2, 10);

    setFormData(prev => ({
      ...prev,
      userId: randomUserId,
      password: randomPassword
    }));
  };

  const handleCreateUser = async () => {
    setError('');
    setSuccess('');

    // Validation
    if (!formData.fullName) {
      setError('Please enter full name');
      return;
    }
    if (!formData.email) {
      setError('Please enter email address');
      return;
    }
    if (!selectedRole) {
      setError('Please select a user role');
      return;
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
        role: selectedRole.toLowerCase(),
      };

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
                Full Nric Name
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
                placeholder="user@email.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+65 xxxx xxxx"
                value={formData.phoneNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Generate UserID & Password Section */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4">Generate UserID & Password</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  User Id
                </label>
                <input
                  type="text"
                  value={formData.userId}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="text"
                  value={formData.password}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                />
              </div>
            </div>
            <button
              onClick={handleGenerate}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Generate
            </button>
          </div>

          {/* Health Profile Section (Only for Patient) */}
          {selectedRole === 'Patient' && (
            <div className="bg-teal-50 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4">Health Profile</h3>
              
              {/* Basic Health Info */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                  <input
                    type="number"
                    placeholder="38"
                    value={healthProfile.age}
                    onChange={(e) => setHealthProfile(prev => ({ ...prev, age: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sex</label>
                  <input
                    type="text"
                    placeholder="F"
                    value={healthProfile.sex}
                    onChange={(e) => setHealthProfile(prev => ({ ...prev, sex: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Blood Type</label>
                  <input
                    type="text"
                    placeholder="B+"
                    value={healthProfile.bloodType}
                    onChange={(e) => setHealthProfile(prev => ({ ...prev, bloodType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Height</label>
                  <input
                    type="text"
                    placeholder="165cm"
                    value={healthProfile.height}
                    onChange={(e) => setHealthProfile(prev => ({ ...prev, height: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Weight</label>
                  <input
                    type="text"
                    placeholder="60kg"
                    value={healthProfile.weight}
                    onChange={(e) => setHealthProfile(prev => ({ ...prev, weight: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Medical History */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Allergies</label>
                  <input
                    type="text"
                    placeholder="Pollen, Nuts"
                    value={healthProfile.allergies}
                    onChange={(e) => setHealthProfile(prev => ({ ...prev, allergies: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Chronic Conditions</label>
                  <input
                    type="text"
                    placeholder="Diabetes (Type2), Hypertension"
                    value={healthProfile.chronicConditions}
                    onChange={(e) => setHealthProfile(prev => ({ ...prev, chronicConditions: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Vaccinations</label>
                  <input
                    type="text"
                    placeholder="Covid-19 (Pfizer) - 2020, Influenza - 2024"
                    value={healthProfile.vaccinations}
                    onChange={(e) => setHealthProfile(prev => ({ ...prev, vaccinations: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
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
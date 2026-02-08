'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { ArrowLeft, User } from 'lucide-react';
import { storage } from '../../utils/storage';

interface PatientHealthData {
  name: string;
  email: string;
  age: number | null;
  sex: string;
  bloodType: string;
  height: string;
  weight: string;
  allergies: string[];
  chronicConditions: string[];
  vaccinations: { name: string; year: number | null }[];
}

const PProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [patientData, setPatientData] = useState<PatientHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchPatientProfile();
  }, []);

  const fetchPatientProfile = async () => {
    try {
      setLoading(true);

      // Get the patient's own user_id from cookies
      const userId = storage.getItem('user_id');

      if (!userId) {
        setError('Please login again to view your profile');
        setLoading(false);
        return;
      }

      console.log('Fetching profile for user ID:', userId);

      // Use the SAME endpoint as doctor's view: /api/auth/patients/{userId}/profile
      const response = await fetch(`${API_URL}/api/auth/patients/${userId}/profile`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.log('API response error:', data);
        setError(data.message || 'Failed to load your profile');
        return;
      }

      const patient = data.patient;
      const healthProfile = patient.health_profile || {};

      console.log('Patient data received:', patient);
      console.log('Health profile:', healthProfile);

      setPatientData({
        name: patient.full_name || 'Unknown',
        email: patient.email || 'No email',
        age: healthProfile.age || null,
        sex: healthProfile.sex || 'Not specified',
        bloodType: healthProfile.blood_type || 'Unknown',
        height: healthProfile.height || 'Not specified',
        weight: healthProfile.weight || 'Not specified',
        allergies: healthProfile.allergies || [],
        chronicConditions: healthProfile.chronic_conditions || [],
        vaccinations: healthProfile.vaccinations || []
      });

    } catch (err) {
      console.error('Failed to fetch patient profile:', err);
      setError('Failed to load your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        <Sidebar userRole="patient" currentPage="profile" />
        <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <p className="text-gray-500">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !patientData) {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        <Sidebar userRole="patient" currentPage="profile" />
        <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold">My Health Profile</h1>
            <button
              onClick={() => navigate('/patient/home')}
              className="px-6 py-2 bg-white border-2 border-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </div>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error Loading Profile</p>
            <p className="mt-1">{error || 'Failed to load profile'}</p>
            <div className="mt-4">
              <p className="text-sm mb-2">Debug Info:</p>
              <p className="text-xs">User ID: {storage.getItem('user_id') || 'Not found'}</p>
              <p className="text-xs">Endpoint: {API_URL}/api/auth/patients/{storage.getItem('user_id') || 'USER_ID'}/profile</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => {
                  storage.clear();
                  navigate('/login');
                }}
                className="text-blue-600 hover:text-blue-800 underline text-sm"
              >
                Try logging in again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole="patient" currentPage="profile" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header with Back Button Only - No Edit Button */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold">My Health Profile</h1>
        </div>

        {/* Patient Health Profile Card */}
        <div className="mb-4">

          {/* Patient Header Card - Same Purple Color as Doctor's View */}
          <div className="bg-purple-100 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mr-4">
                <User className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{patientData.name}</h3>
                <p className="text-sm text-gray-700">{patientData.email}</p>
                <p className="text-sm text-gray-700 mt-1">User ID: {storage.getItem('user_id')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Health Information Grid - Same Layout as Doctor's View */}
        <div className="bg-gray-200 rounded-lg overflow-hidden">
          {/* Basic Information Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-300">
            <div className="bg-white p-4">
              <p className="text-gray-600 font-medium">Age</p>
              <p className="text-gray-900 font-semibold text-lg">{patientData.age || 'Not specified'}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-gray-600 font-medium">Sex</p>
              <p className="text-gray-900 font-semibold text-lg">{patientData.sex}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-gray-600 font-medium">Blood Type</p>
              <p className="text-gray-900 font-semibold text-lg">{patientData.bloodType}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-gray-600 font-medium">Height</p>
              <p className="text-gray-900 font-semibold text-lg">{patientData.height}</p>
            </div>
            <div className="bg-white p-4 md:col-span-2">
              <p className="text-gray-600 font-medium">Weight</p>
              <p className="text-gray-900 font-semibold text-lg">{patientData.weight}</p>
            </div>
          </div>

          {/* Medical History Section */}
          <div className="mt-px">
            {/* Allergies */}
            <div className="bg-white p-6 border-b border-gray-300">
              <div className="grid md:grid-cols-3 gap-4">
                <p className="text-gray-600 font-semibold">Allergies</p>
                <p className="text-gray-700 md:col-span-2">
                  {patientData.allergies.length > 0 ? patientData.allergies.join(', ') : 'None recorded'}
                </p>
              </div>
            </div>

            {/* Chronic Conditions */}
            <div className="bg-white p-6 border-b border-gray-300">
              <div className="grid md:grid-cols-3 gap-4">
                <p className="text-gray-600 font-semibold">Chronic Conditions</p>
                <p className="text-gray-700 md:col-span-2">
                  {patientData.chronicConditions.length > 0 ? patientData.chronicConditions.join(', ') : 'None recorded'}
                </p>
              </div>
            </div>

            {/* Vaccinations */}
            <div className="bg-white p-6">
              <div className="grid md:grid-cols-3 gap-4">
                <p className="text-gray-600 font-semibold">Vaccinations</p>
                <div className="md:col-span-2">
                  {patientData.vaccinations.length > 0 ? (
                    patientData.vaccinations.map((vac, index) => (
                      <p key={index} className="text-gray-700">
                        {vac.name}{vac.year ? ` - ${vac.year}` : ''}
                        {index < patientData.vaccinations.length - 1 && ','}
                      </p>
                    ))
                  ) : (
                    <p className="text-gray-700">None recorded</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PProfilePage;
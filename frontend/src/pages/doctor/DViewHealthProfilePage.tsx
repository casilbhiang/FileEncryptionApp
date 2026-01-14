'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { ArrowLeft } from 'lucide-react';

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

interface RecentFile {
  id: string;
  original_filename: string;
  uploaded_at: string;
  owner_id: string;
  owner_name?: string;
  shared_by?: string;
  shared_by_name?: string;
}

const DViewHealthProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { patientId } = useParams<{ patientId: string }>();
  const [patientData, setPatientData] = useState<PatientHealthData | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const userId = localStorage.getItem('user_id'); // Doctor's user_id

  useEffect(() => {
    if (patientId) {
      fetchPatientProfile();
      fetchRecentFiles();
    }
  }, [patientId]);

  const fetchPatientProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/auth/patients/${patientId}/profile`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to load patient profile');
        return;
      }

      const patient = data.patient;
      const healthProfile = patient.health_profile || {};

      setPatientData({
        name: patient.full_name || 'Unknown Patient',
        email: patient.email || 'No email',
        age: healthProfile.age || null,
        sex: healthProfile.sex || 'N/A',
        bloodType: healthProfile.blood_type || 'N/A',
        height: healthProfile.height || 'N/A',
        weight: healthProfile.weight || 'N/A',
        allergies: healthProfile.allergies || [],
        chronicConditions: healthProfile.chronic_conditions || [],
        vaccinations: healthProfile.vaccinations || []
      });

    } catch (err) {
      console.error('Failed to fetch patient profile:', err);
      setError('Failed to load patient profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentFiles = async () => {
    try {
      // Fetch all file shares between doctor and patient
      const response = await fetch(`${API_URL}/api/files/shares/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch file shares');
      }

      const data = await response.json();

      if (data.success && data.shares) {
        // Filter shares between this doctor and patient (both directions)
        const sharedFiles = data.shares
          .filter((share: any) =>
            (share.shared_by === userId && share.shared_with === patientId) ||
            (share.shared_by === patientId && share.shared_with === userId)
          )
          .map((share: any) => ({
            id: share.file_id,
            original_filename: share.file_name || 'Unknown file',
            uploaded_at: share.shared_at,
            owner_id: share.owner_id,
            owner_name: share.owner_name,
            shared_by: share.shared_by,
            shared_by_name: share.shared_by_name
          }))
          .sort((a: any, b: any) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
          .slice(0, 5); // Get latest 5 files

        setRecentFiles(sharedFiles);
      }
    } catch (err) {
      console.error('Failed to fetch shared files:', err);
      // Don't show error, just leave files empty
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        <Sidebar userRole="doctor" currentPage="patients" />
        <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading patient profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !patientData) {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        <Sidebar userRole="doctor" currentPage="patients" />
        <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold">View My Patients</h1>
            <button
              onClick={() => navigate('/doctor/patients')}
              className="px-6 py-2 bg-white border-2 border-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </div>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error || 'Patient not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole="doctor" currentPage="patients" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold">View My Patients</h1>
          <button
            onClick={() => navigate('/doctor/patients')}
            className="px-6 py-2 bg-white border-2 border-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>

        {/* Patient Health Profile Card */}
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-4">{patientData.name} Health Profile</h2>
          
          {/* Patient Header Card - Without Profile Picture */}
          <div className="bg-purple-100 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-1">{patientData.name}</h3>
            <p className="text-sm text-gray-700">{patientData.email}</p>
          </div>
        </div>

        {/* Health Information Grid */}
        <div className="bg-gray-200 rounded-lg overflow-hidden">
          {/* Basic Information Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-300">
            <div className="bg-white p-4">
              <p className="text-gray-600 font-medium">Age</p>
              <p className="text-gray-900 font-semibold text-lg">{patientData.age}</p>
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

        {/* Shared Medical Records Section */}
        <div className="mt-6 bg-white rounded-lg p-6 border-2 border-blue-400">
          <h3 className="text-lg font-bold mb-4">Shared Medical Records</h3>
          <p className="text-sm text-gray-600 mb-4">Files shared between you and this patient</p>
          {recentFiles.length > 0 ? (
            <div className="space-y-2">
              {recentFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">{file.original_filename}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Shared by: {file.shared_by_name || file.shared_by}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 ml-4">{formatDate(file.uploaded_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No medical records shared yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DViewHealthProfilePage;
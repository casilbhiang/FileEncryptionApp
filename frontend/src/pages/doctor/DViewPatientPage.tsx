'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { Search, Mic, Loader2 } from 'lucide-react';
import { storage } from '../../utils/storage';

interface Patient {
  user_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  connection_status: string;
  created_at?: string;
}

const DViewPatientPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const userId = storage.getItem('user_id');
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    if (!userId || !API_URL) {
      setError('User not logged in or API URL not configured');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/keys/connections/${userId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }

      const data = await response.json();

      if (data.success) {
        // Extract patient IDs from connections
        const patientIds = data.connections
          .filter((conn: any) => conn.patient_id && conn.status === 'Active')
          .map((conn: any) => conn.patient_id);

        // Fetch patient details for each patient ID
        const patientDetails = await Promise.all(
          patientIds.map(async (patientId: string) => {
            try {
              const userResponse = await fetch(`${API_URL}/api/auth/users/${patientId}`);
              if (userResponse.ok) {
                const userData = await userResponse.json();
                return {
                  user_id: userData.user_id,
                  full_name: userData.full_name || userData.name || 'Unknown',
                  email: userData.email,
                  phone: userData.phone,
                  connection_status: 'Active',
                  created_at: userData.created_at
                };
              }
              return null;
            } catch (err) {
              console.error(`Failed to fetch details for patient ${patientId}:`, err);
              return null;
            }
          })
        );

        setPatients(patientDetails.filter((p): p is Patient => p !== null));
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (patient.email && patient.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole="doctor" currentPage="patients" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-4">View My Patients</h1>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <Mic className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchPatients}
              className="mt-2 text-red-600 underline text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">Loading patients...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-2">
              {searchQuery
                ? 'No patients found matching your search'
                : patients.length === 0
                  ? 'You have no connected patients yet'
                  : 'No patients found'}
            </p>
            {patients.length === 0 && (
              <p className="text-sm text-gray-400 mt-2">
                Connect with patients to see them here
              </p>
            )}
          </div>
        ) : (
          /* Patients List */
          <div className="space-y-4">
            {filteredPatients.map((patient) => {
              const initials = patient.full_name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
              const colors = ['FFB6C1', '87CEEB', '98FB98', 'FFD700', 'FFA07A'];
              const colorIndex = patient.user_id.charCodeAt(0) % colors.length;

              return (
                <div
                  key={patient.user_id}
                  className="bg-purple-100 rounded-lg p-6 flex flex-col sm:flex-row items-center gap-4 hover:bg-purple-200 transition"
                >
                  {/* Patient Image */}
                  <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
                    <div
                      className="w-full h-full flex items-center justify-center text-2xl font-bold"
                      style={{ backgroundColor: `#${colors[colorIndex]}` }}
                    >
                      {initials}
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{patient.full_name}</h3>
                    {patient.phone && (
                      <p className="text-sm text-gray-700 mb-1">Phone: {patient.phone}</p>
                    )}
                    {patient.email && (
                      <p className="text-sm text-gray-700">Email: {patient.email}</p>
                    )}
                  </div>

                  {/* Patient Profile Button */}
                  <button
                    onClick={() => navigate(`/doctor/patient-profile/${patient.user_id}`)}
                    className="px-6 py-2 bg-white border-2 border-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition whitespace-nowrap"
                  >
                    Patient profile
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DViewPatientPage;
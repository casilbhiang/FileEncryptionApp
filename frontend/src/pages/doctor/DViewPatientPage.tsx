'use client';

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { Search, Mic } from 'lucide-react';

interface Patient {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  image: string;
}

const DViewPatientPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Sample patients data
  const patients: Patient[] = [
    {
      id: 1,
      name: 'Miss. Jenifer',
      email: 'E-Mail: Mjenifer@Hotmail.Com',
      image: 'https://via.placeholder.com/100/FFB6C1/FFFFFF?text=MJ'
    },
    {
      id: 2,
      name: 'Mr. Harris',
      phone: 'Phone Number: 011-415-8515',
      email: 'E-Mail: Morri2134@Hotmail.Com',
      image: 'https://via.placeholder.com/100/87CEEB/FFFFFF?text=MH'
    },
    {
      id: 3,
      name: 'Mr. Jack Ma',
      phone: 'Phone Number: 331-285-38698',
      email: 'E-Mail: Jacksparrow@Hotmail.Com',
      image: 'https://via.placeholder.com/100/98FB98/FFFFFF?text=JM'
    },
  ];

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase())
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

        {/* Patients List */}
        <div className="space-y-4">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="bg-purple-100 rounded-lg p-6 flex flex-col sm:flex-row items-center gap-4 hover:bg-purple-200 transition"
            >
              {/* Patient Image */}
              <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 bg-white">
                <img
                  src={patient.image}
                  alt={patient.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Patient Info */}
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{patient.name}</h3>
                {patient.phone && (
                  <p className="text-sm text-gray-700 mb-1">{patient.phone}</p>
                )}
                {patient.email && (
                  <p className="text-sm text-gray-700">{patient.email}</p>
                )}
              </div>

              {/* Patient Profile Button */}
              <button 
                onClick={() => navigate(`/doctor/patient-profile/${patient.id}`)}
                className="px-6 py-2 bg-white border-2 border-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition whitespace-nowrap"
              >
                Patient profile
              </button>
            </div>
          ))}
        </div>

        {/* No Results Message */}
        {filteredPatients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No patients found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DViewPatientPage;
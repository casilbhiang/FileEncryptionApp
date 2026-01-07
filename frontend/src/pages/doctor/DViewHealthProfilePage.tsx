'use client';

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { ArrowLeft } from 'lucide-react';

interface PatientHealthData {
  name: string;
  email: string;
  image: string;
  age: number;
  sex: string;
  bloodType: string;
  height: string;
  weight: string;
  allergies: string[];
  chronicConditions: string[];
  vaccinations: { name: string; year: number }[];
}

const DViewHealthProfilePage: React.FC = () => {
  const navigate = useNavigate();
  // In a real app, you'd get patientId from useParams and fetch data
  
  // Sample patient data
  const patientData: PatientHealthData = {
    name: 'Miss. Jenifer',
    email: 'E-Mail: Mjenifer@Hotmail.Com',
    image: 'https://via.placeholder.com/120/FFB6C1/FFFFFF?text=MJ',
    age: 38,
    sex: 'F',
    bloodType: 'B+',
    height: '165cm',
    weight: '60kg',
    allergies: ['Pollen', 'Nuts'],
    chronicConditions: ['Diabetes (Type2)', 'Hypertension'],
    vaccinations: [
      { name: 'Covid-10 (Fizer)', year: 2020 },
      { name: 'Influanza', year: 2024 }
    ]
  };

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
          
          {/* Patient Header Card */}
          <div className="bg-purple-100 rounded-lg p-6 mb-6 flex items-center gap-4">
            <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 bg-white">
              <img
                src={patientData.image}
                alt={patientData.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{patientData.name}</h3>
              <p className="text-sm text-gray-700">{patientData.email}</p>
            </div>
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
                <p className="text-gray-700 md:col-span-2">{patientData.allergies.join(', ')}</p>
              </div>
            </div>

            {/* Chronic Conditions */}
            <div className="bg-white p-6 border-b border-gray-300">
              <div className="grid md:grid-cols-3 gap-4">
                <p className="text-gray-600 font-semibold">Chronic Conditions</p>
                <p className="text-gray-700 md:col-span-2">{patientData.chronicConditions.join(', ')}</p>
              </div>
            </div>

            {/* Vaccinations */}
            <div className="bg-white p-6">
              <div className="grid md:grid-cols-3 gap-4">
                <p className="text-gray-600 font-semibold">Vaccinations</p>
                <div className="md:col-span-2">
                  {patientData.vaccinations.map((vac, index) => (
                    <p key={index} className="text-gray-700">
                      {vac.name} -{vac.year}
                      {index < patientData.vaccinations.length - 1 && ','}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Medical Records Section (Optional) */}
        <div className="mt-6 bg-white rounded-lg p-6 border-2 border-blue-400">
          <h3 className="text-lg font-bold mb-4">Recent Medical Records</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Blood_Test_Result.Pdf</span>
              <span className="text-sm text-gray-500">May 3rd 2025</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Xray_image_8322.Png</span>
              <span className="text-sm text-gray-500">May 3rd 2025</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DViewHealthProfilePage;
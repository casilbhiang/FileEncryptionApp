'use client';

import React, { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { QrCode, Camera, AlertTriangle } from 'lucide-react';

const DConnectToPatientPage: React.FC = () => {
  const [isConnected] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const handleScanQRCode = () => {
    setShowScanner(true);
    // In a real app, this would activate the camera and QR scanner
    console.log('Opening QR scanner...');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole="doctor" currentPage="connect" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Connect To Patient</h1>
          <p className="text-gray-600">Scan QR Code To Establish Secure Connection</p>
        </div>

        {/* Connection Status Alert */}
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6 max-w-2xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
            <p className="text-yellow-800 font-medium">
              {isConnected ? 'Connected Successfully!' : 'Not Connected to Any Doctor'}
            </p>
          </div>
        </div>

        {/* How to Connect Section */}
        <div className="bg-white rounded-lg p-6 lg:p-8 max-w-3xl">
          <h2 className="text-xl font-bold mb-6">How to Connect</h2>

          {/* Step 1 */}
          <div className="flex gap-4 mb-6">
            <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Visit Your Clinic</h3>
              <p className="text-gray-600">
                Ask clinic staff to generate a connection QR code for you and your doctor.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4 mb-6">
            <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Scan QR Code</h3>
              <p className="text-gray-600">
                Click the button below and point your camera at the QR code displayed by staff.
              </p>
            </div>
          </div>


          {/* QR Scanner Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <div className="flex flex-col items-center text-center">
              {!showScanner ? (
                <>
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Camera className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-gray-600 mb-6">
                    Click "Scan QR Code" to activate camera
                  </p>
                  <button
                    onClick={handleScanQRCode}
                    className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center gap-2"
                  >
                    <QrCode className="w-5 h-5" />
                    Scan QR Code
                  </button>
                </>
              ) : (
                <>
                  {/* Camera Preview Placeholder */}
                  <div className="w-full max-w-sm aspect-square bg-gray-900 rounded-lg mb-4 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-white mx-auto mb-2" />
                      <p className="text-white text-sm">Camera Preview</p>
                      <p className="text-gray-400 text-xs">Point at QR code</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowScanner(false)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Already Connected Section (Optional) */}
        {isConnected && (
          <div className="bg-white rounded-lg p-6 mt-6 max-w-3xl">
            <h2 className="text-xl font-bold mb-4">Connected Doctors</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold">DS</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Dr. Sarah Johnson</h3>
                    <p className="text-sm text-gray-600">Cardiology</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  Connected
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DConnectToPatientPage;
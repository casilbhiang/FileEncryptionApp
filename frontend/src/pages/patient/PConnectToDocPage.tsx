'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { QrCode, Camera, AlertTriangle, CheckCircle, Stethoscope, Key } from 'lucide-react';
import QRScanner from '../../components/QRScanner';
import { verifyScannedQR, getUserConnections } from '../../services/keyService';
import { hasEncryptionKey } from '../../services/Encryption';

const PConnectToDocPage: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [keyMissing, setKeyMissing] = useState(false);

  // Mock patient ID - in production this would come from auth context
  // Get patient ID from localStorage
  const patientId = localStorage.getItem('user_id');

  // Load existing connections on mount
  useEffect(() => {
    const loadConnections = async () => {
      try {
        if (!patientId) {
          console.warn('No patient ID found');
          return;
        }

        // Check local key
        const hasKey = hasEncryptionKey(patientId);
        setKeyMissing(!hasKey);

        const result = await getUserConnections(patientId);
        if (result.success && result.connections && result.connections.length > 0) {
          // Get the first active connection
          const activeConnection = result.connections.find((c: any) => c.status === 'Active');
          if (activeConnection) {
            setConnectionDetails(activeConnection);
            setIsConnected(true);
          }
        }
      } catch (err) {
        console.error('Failed to load connections:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConnections();
  }, [patientId]);

  const handleScanQRCode = () => {
    setShowScanner(true);
    setError(null);
  };

  const handleScanSuccess = async (decodedText: string) => {
    try {
      setShowScanner(false);

      // Parse QR data to extract key
      const qrData = JSON.parse(decodedText);

      if (qrData.key && patientId) {
        try {
          // Import and store the key locally
          const { importKeyFromBase64, storeEncryptionKey } = await import('../../services/Encryption');
          const key = await importKeyFromBase64(qrData.key);
          await storeEncryptionKey(key, patientId);
          console.log('Encryption key cached from QR scan');
          setKeyMissing(false);
        } catch (keyError) {
          console.error('Failed to cache key:', keyError);
          // We continue even if caching fails, though upload might need rescanning
        }
      }

      // Verify the scanned QR code
      const result = await verifyScannedQR(decodedText);

      setConnectionDetails(result.connection);
      setIsConnected(true);
      setError(null);
    } catch (err: any) {
      console.error('Scan verification failed:', err);
      setError(err.message || 'Failed to verify QR code');
      setShowScanner(false);
    }
  };

  const handleScanFailure = (err: any) => {
    // Only log if it's a real error, not just "no QR code found"
    if (err?.message?.includes('No MultiFormat Readers')) return;
    console.warn('Scan error:', err);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar userRole="patient" currentPage="connect" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Connect To Doctor</h1>
          <p className="text-gray-600">Scan QR Code To Establish Secure Connection</p>
        </div>

        {/* Connection Status Alert */}
        <div className={`border-2 rounded-lg p-4 mb-6 max-w-2xl ${isConnected && !keyMissing ? 'bg-green-50 border-green-300' :
            isConnected && keyMissing ? 'bg-orange-50 border-orange-300' :
              'bg-yellow-50 border-yellow-300'
          }`}>
          <div className="flex items-center gap-3">
            {isConnected && !keyMissing ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            ) : isConnected && keyMissing ? (
              <Key className="w-6 h-6 text-orange-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
            )}
            <div>
              <p className={`${isConnected && !keyMissing ? 'text-green-800' :
                  isConnected && keyMissing ? 'text-orange-900' :
                    'text-yellow-800'
                } font-medium`}>
                {isConnected && !keyMissing ? 'Connected Successfully!' :
                  isConnected && keyMissing ? 'Session Key Required' :
                    'Not Connected to Any Doctor'}
              </p>

              {isConnected && keyMissing && (
                <p className="text-orange-800 text-sm mt-1">
                  You are paired with a doctor, but this browser session is missing the encryption key. Please scan the QR code to restore access.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 max-w-2xl">
            <strong>Error:</strong> {error}
          </div>
        )}

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
                    // Allow rescanning if key is missing OR not connected
                    // disabled={isConnected && !keyMissing} 
                    className={`px-8 py-3 text-white rounded-lg font-semibold transition flex items-center gap-2 bg-purple-600 hover:bg-purple-700`}
                  >
                    <QrCode className="w-5 h-5" />
                    {isConnected && !keyMissing ? 'Re-Scan QR Code' : 'Scan QR Code'}
                  </button>
                </>
              ) : (
                <div className="w-full max-w-md">
                  <h3 className="text-lg font-semibold mb-4">Scanning...</h3>
                  <QRScanner
                    onScanSuccess={handleScanSuccess}
                    onScanFailure={handleScanFailure}
                  />
                  <button
                    onClick={() => setShowScanner(false)}
                    className="mt-4 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Connected Doctor Info */}
        {isConnected && connectionDetails && (
          <div className="bg-white rounded-lg p-6 mt-6 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold mb-4">Connected Doctor</h2>
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Doctor ID: {connectionDetails.doctor_id}</h3>
                  <p className="text-sm text-gray-600">Key ID: {connectionDetails.key_id}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Active
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PConnectToDocPage;
'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { QrCode, Camera, AlertTriangle, CheckCircle, User, Key } from 'lucide-react';
import QRScanner from '../../components/QRScanner';
import { verifyScannedQR, getUserConnections } from '../../services/keyService';
import { hasEncryptionKey, clearEncryptionKey } from '../../services/Encryption';

const DConnectToPatientPage: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [keyMissing, setKeyMissing] = useState(false);

  // Mock doctor ID - in production this would come from auth context
  // Get doctor ID from localStorage
  const doctorId = localStorage.getItem('user_id');

  // Load existing connections on mount
  useEffect(() => {
    const loadConnections = async () => {
      try {
        if (!doctorId) {
          console.warn('No doctor ID found');
          return;
        }

        // 1. Check Backend Connection
        const result = await getUserConnections(doctorId);
        let activeConnection = null;

        if (result.success && result.connections && result.connections.length > 0) {
          activeConnection = result.connections.find((c: any) => c.status === 'Active');
        }

        // 2. Check Local Key Presence
        const hasKey = hasEncryptionKey(doctorId);

        if (activeConnection) {
          setConnectionDetails(activeConnection);
          setIsConnected(true);

          if (!hasKey) {
            // Ghost Connection: Backend says connected, but browser forgot key
            setKeyMissing(true);
          } else {
            setKeyMissing(false);
          }
        } else {
          setIsConnected(false);
          setKeyMissing(false);
        }

      } catch (err) {
        console.error('Failed to load connections:', err);
      }
    };

    loadConnections();
  }, [doctorId]);

  const handleDisconnect = () => {
    if (!doctorId) return;

    try {
      // 1. Clear Local Key ONLY (Preserve Backend Pairing)
      clearEncryptionKey(doctorId);

      // 2. Update UI to "Session Closed" state
      setKeyMissing(true);

      console.log('Local session disconnected');
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const handleScanQRCode = () => {
    setShowScanner(true);
    setError(null);
  };

  const handleScanSuccess = async (decodedText: string) => {
    try {
      setShowScanner(false);

      // Parse QR data to extract key
      const qrData = JSON.parse(decodedText);

      // Validate QR ownership (Case-insensitive)
      if (qrData.doctor_id && doctorId) {
        const qrDoctor = String(qrData.doctor_id).trim().toLowerCase();
        const currentDoctor = String(doctorId).trim().toLowerCase();

        if (qrDoctor !== currentDoctor) {
          throw new Error(`Error Does not match.`);
        }
      }

      if (qrData.key && doctorId) {
        try {
          // Import and store the key locally
          const { importKeyFromBase64, storeEncryptionKey } = await import('../../services/Encryption');
          const key = await importKeyFromBase64(qrData.key);
          await storeEncryptionKey(key, doctorId);
          console.log('Encryption key cached from QR scan');
          setKeyMissing(false); // Key is restored!
        } catch (keyError) {
          console.error('Failed to cache key:', keyError);
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
    console.warn('Scan error:', err);
  };

  // Determine UI State
  const isFullyConnected = isConnected && !keyMissing;
  const isGhostConnection = isConnected && keyMissing;

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
        <div className={`border-2 rounded-lg p-4 mb-6 max-w-2xl
            ${isFullyConnected ? 'bg-green-50 border-green-300' :
            isGhostConnection ? 'bg-orange-50 border-orange-300' :
              'bg-yellow-50 border-yellow-300'}`}>
          <div className="flex items-center gap-3">
            {isFullyConnected ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            ) : isGhostConnection ? (
              <Key className="w-6 h-6 text-orange-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
            )}
            <div>
              <p className={`${isFullyConnected ? 'text-green-800' :
                isGhostConnection ? 'text-orange-800' :
                  'text-yellow-800'} font-medium`}>
                {isFullyConnected ? 'Connected Successfully!' :
                  isGhostConnection ? 'Session Key Required' :
                    'Not Connected to Any Patient'}
              </p>
              {isGhostConnection && (
                <p className="text-sm text-orange-700 mt-1">
                  You are connected, but your browser session has lost the security key.
                  <strong> Please scan the QR code again to restore access.</strong>
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

          {/* Steps omitted for brevity, keeping same structure */}
          {/* Step 1 */}
          <div className="flex gap-4 mb-6">
            <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Visit Your Clinic</h3>
              <p className="text-gray-600">
                Ask clinic staff to generate a connection QR code for you and your patient.
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
                    className={`px-8 py-3 text-white rounded-lg font-semibold transition flex items-center gap-2 bg-purple-600 hover:bg-purple-700`}
                  >
                    <QrCode className="w-5 h-5" />
                    {isFullyConnected ? 'Re-Scan QR Code' : isGhostConnection ? 'Re-Scan to Restore Key' : 'Scan QR Code'}
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

        {/* Connected Patient Info & Disconnect */}
        {isConnected && connectionDetails && (
          <div className="bg-white rounded-lg p-6 mt-6 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Connected Patient</h2>
              <button
                onClick={handleDisconnect}
                className="text-red-600 hover:text-red-800 text-sm font-semibold underline px-2 py-1"
              >
                Disconnect
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Patient ID: {connectionDetails.patient_id}</h3>
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

export default DConnectToPatientPage;

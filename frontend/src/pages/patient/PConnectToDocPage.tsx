'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { QrCode, Camera, AlertTriangle, CheckCircle, Stethoscope, Key } from 'lucide-react';
import QRScanner from '../../components/QRScanner';
import { verifyScannedQR, getUserConnections, getKeyPair } from '../../services/keyService';
import { hasEncryptionKey, clearEncryptionKey, storeEncryptionKey, importKeyFromBase64 } from '../../services/Encryption';

const PConnectToDocPage: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [keyMissing, setKeyMissing] = useState(false);

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

        // 1. Check Backend Connection
        const result = await getUserConnections(patientId);
        let activeConnection = null;

        if (result.success && result.connections && result.connections.length > 0) {
          activeConnection = result.connections.find((c: any) => c.status === 'Active');
        }

        // 2. Check Local Key Presence
        const hasKey = hasEncryptionKey(patientId);

        if (activeConnection) {
          setConnectionDetails(activeConnection);
          setIsConnected(true);

          if (!hasKey) {
            // Ghost Connection detected: Try to restore key from backend
            console.log('Ghost connection detected. Attempting to restore key from backend...');
            try {
              const keyResult = await getKeyPair(activeConnection.key_id, patientId);
              if (keyResult.success && keyResult.key_pair && keyResult.key_pair.encryption_key) {
                // Import and store the key
                const key = await importKeyFromBase64(keyResult.key_pair.encryption_key);
                await storeEncryptionKey(key, patientId);
                console.log('Key successfully restored from backend!');
                setKeyMissing(false);
              } else {
                console.warn('Failed to restore key: Key not returned by backend');
                setKeyMissing(true);
              }
            } catch (restoreErr) {
              console.error('Failed to restore key:', restoreErr);
              setKeyMissing(true);
            }
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
  }, [patientId]);

  const handleDisconnect = () => {
    if (!patientId) return;

    try {
      // 1. Clear Local Key ONLY (Preserve Backend Pairing)
      clearEncryptionKey(patientId);

      // 2. Update UI to "Session Closed" state
      // We keep connection info because the Admin controls the pairing
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
    console.log('Scanned QR Raw:', decodedText);
    try {
      setShowScanner(false);

      // Parse QR data to extract key
      let qrData;
      try {
        qrData = JSON.parse(decodedText);
        console.log('Parsed QR Data:', qrData);
      } catch (e) {
        throw new Error('Invalid QR Code Format (Not JSON)');
      }

      // Validate QR ownership (Case-insensitive)
      if (qrData.patient_id && patientId) {
        const qrPatient = String(qrData.patient_id).trim().toLowerCase();
        const currentPatient = String(patientId).trim().toLowerCase();

        console.log(`Checking match: QR('${qrPatient}') vs User('${currentPatient}')`);

        if (qrPatient !== currentPatient) {
          throw new Error(`Error Does not match.`);
        }
      }

      if (qrData.key && patientId) {
        try {
          // Import and store the key locally
          const { importKeyFromBase64, storeEncryptionKey } = await import('../../services/Encryption');
          const key = await importKeyFromBase64(qrData.key);
          await storeEncryptionKey(key, patientId);
          console.log('Encryption key cached from QR scan');
          setKeyMissing(false);
        } catch (keyError) {
          console.error('Failed to import/cache key:', keyError);
          throw new Error('Failed to process encryption key from QR code');
        }
      }

      // Verify the scanned QR code
      const result = await verifyScannedQR(decodedText);
      console.log('Backend verification result:', result);

      setConnectionDetails(result.connection);
      setIsConnected(true);
      setError(null);
    } catch (err: any) {
      console.error('Scan verification failed:', err);
      setError(err.message || 'Failed to verify QR code');
      // Keep scanner open if it was just a bad scan? No, close to show error.
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
      <Sidebar userRole="patient" currentPage="connect" />

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Connect To Doctor</h1>
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
                isGhostConnection ? 'text-orange-900' :
                  'text-yellow-800'} font-medium`}>
                {isFullyConnected ? 'Connected Successfully!' :
                  isGhostConnection ? 'Session Key Required' :
                    'Not Connected to Any Doctor'}
              </p>

              {isGhostConnection && (
                <p className="text-sm text-orange-700 mt-1">
                  You are paired with a doctor, but this browser session is missing the encryption key.
                  <strong> Please scan the QR code to restore access.</strong>
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

        {/* Connected Doctor Info & Disconnect */}
        {isConnected && connectionDetails && (
          <div className="bg-white rounded-lg p-6 mt-6 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Connected Doctor</h2>
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
                  <Stethoscope className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Doctor ID: {connectionDetails.doctor_id}</h3>
                  <p className="text-sm text-gray-600">Key ID: {connectionDetails.key_id}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  Active
                </span>
                {connectionDetails.expires_at && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded
                        ${(() => {
                      const days = Math.ceil((new Date(connectionDetails.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      if (days < 0) return 'bg-red-100 text-red-700';
                      if (days < 7) return 'bg-orange-100 text-orange-700';
                      return 'bg-gray-100 text-gray-600';
                    })()}
                    `}>
                    {(() => {
                      const days = Math.ceil((new Date(connectionDetails.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      if (days < 0) return 'Expired';
                      return `Key Expires in ${days} days`;
                    })()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PConnectToDocPage;
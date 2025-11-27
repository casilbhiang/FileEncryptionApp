import React, { useState } from 'react';
import { X } from 'lucide-react';

interface GenerateKeyPairDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (doctorUserId: string, patientUserId: string) => void;
}

const GenerateKeyPairDialog: React.FC<GenerateKeyPairDialogProps> = ({
  isOpen,
  onClose,
  onGenerate
}) => {
  const [showQRCode, setShowQRCode] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    doctorUserId: '',
    patientUserId: ''
  });

  const handleClose = () => {
    setShowQRCode(false);
    setGenerateForm({ doctorUserId: '', patientUserId: '' });
    onClose();
  };

  const handleGenerateQR = () => {
    if (generateForm.doctorUserId && generateForm.patientUserId) {
      // First show the QR code
      setShowQRCode(true);
      // Then call the parent's onGenerate function
      // DON'T close the dialog here
      onGenerate(generateForm.doctorUserId, generateForm.patientUserId);
    }
  };

  const handleDone = () => {
    // This closes the dialog after viewing QR code
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-orange-500">Generate Key Pair</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-8 text-center">
          Generate an AES-GCM key pair for secure encryption
        </p>

        {!showQRCode ? (
          <>
            <div className="space-y-6 mb-8">
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder="Doctor_UserId"
                  value={generateForm.doctorUserId}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, doctorUserId: e.target.value }))}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                />
                <div className="text-3xl text-gray-400 font-bold">+</div>
                <input
                  type="text"
                  placeholder="Patient_UserId"
                  value={generateForm.patientUserId}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, patientUserId: e.target.value }))}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateQR}
              disabled={!generateForm.doctorUserId || !generateForm.patientUserId}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Generate QR CODE
            </button>
          </>
        ) : (
          <>
            {/* QR Code Display */}
            <div className="text-center">
              <div className="w-56 h-56 bg-white border-2 border-gray-300 rounded-lg mx-auto flex items-center justify-center p-4">
                {/* Simple QR Code Pattern */}
                <div className="w-full h-full grid grid-cols-8 gap-0.5">
                  {Array.from({ length: 64 }, (_, i) => (
                    <div
                      key={i}
                      className={`w-full h-full ${
                        // Create a QR code-like pattern
                        (i % 8 === 0 || i % 8 === 7 || Math.floor(i / 8) === 0 || Math.floor(i / 8) === 7) ||
                        (i >= 16 && i <= 23) || (i >= 40 && i <= 47) ||
                        (i % 13 === 0) || (i % 17 === 0) || (i % 19 === 0)
                          ? 'bg-black'
                          : 'bg-white'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3 font-semibold">QR Code for key exchange</p>
              <p className="text-xs text-gray-400 mt-2">
                Key ID: {generateForm.doctorUserId}-{generateForm.patientUserId}
              </p>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => alert('Downloading QR Code...')}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Download QR Code
                </button>
                <button
                  onClick={handleDone}
                  className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition"
                >
                  Done
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GenerateKeyPairDialog;
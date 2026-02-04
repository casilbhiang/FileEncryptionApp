import React, { useState } from 'react';
import { X, Key, User, QrCode, CheckCircle, Download } from 'lucide-react';

interface GenerateKeyPairDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (doctorId: string, patientId: string) => Promise<string | null>;
  error?: string | null;
}

const GenerateKeyPairDialog: React.FC<GenerateKeyPairDialogProps> = ({
  isOpen,
  onClose,
  onGenerate,
  error
}) => {
  const [doctorId, setDoctorId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setDoctorId('');
    setPatientId('');
    setQrCode(null);
    setSuccess(false);
    setIsGenerating(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (doctorId && patientId) {
      try {
        setIsGenerating(true);
        const qrData = await onGenerate(doctorId, patientId);
        if (qrData) {
          setQrCode(qrData);
          setSuccess(true);
        }
      } catch (error) {
        console.error('Generation failed:', error);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleDownload = () => {
    if (!qrCode) return;
    const link = document.createElement('a');
    link.href = qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`;
    link.download = `key-pair-${doctorId}-${patientId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2 text-gray-900 font-semibold">
          {success ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <Key className="w-5 h-5 text-blue-600" />
          )}
          {success ? 'Key Pair Generated!' : 'Generate New Key Pair'}
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      {/* Body */}
      <div className="p-6">
        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 mb-6">
              <p className="flex gap-2">
                <QrCode className="w-5 h-5 flex-shrink-0" />
                <span>
                  This will generate a unique AES-GCM encryption key and a QR code for secure exchange between the doctor and patient.
                </span>
              </p>
            </div>

            {/* Error display */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Doctor ID
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  placeholder="e.g., DR-001"
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient ID
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="e.g., PT-001"
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:bg-blue-400 flex items-center gap-2"
              >
                {isGenerating ? 'Generating...' : 'Generate Key Pair'}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-sm text-green-800">
              <p>Successfully generated key pair for <strong>{doctorId}</strong> and <strong>{patientId}</strong>.</p>
            </div>
            {qrCode && (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
                  <img
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="Key Pair QR Code"
                    className="w-48 h-48 object-contain"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Scan this QR code to securely share the encryption key.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDownload}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download QR Code
              </button>
              <button
                onClick={handleClose}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default GenerateKeyPairDialog;
import React from 'react';
import { X } from 'lucide-react';

interface CloudStorageCredsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const CloudStorageCredsDialog: React.FC<CloudStorageCredsDialogProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-purple-600">Cloud Storage Credentials</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connection Status */}
        <div className="mb-6">
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">✓</span>
            </div>
            <div>
              <h3 className="font-semibold text-green-800">Connected to AWS S3</h3>
              <p className="text-sm text-green-700">Region: WestCoast (Singapore)</p>
            </div>
          </div>
        </div>

        {/* Access Token Status */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Access Token Status</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Token Expire:</span>
              <div className="font-medium">November 25, 2025</div>
            </div>
            <div>
              <span className="text-gray-600">Last Refreshed:</span>
              <div className="font-medium">October 20, 2025</div>
            </div>
          </div>
        </div>

        {/* Connection Details */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Connection Details</h3>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-1">Endpoint</div>
            <div className="font-mono text-sm text-gray-800 break-all">
              https://... from chatgpt.justcopy design only.com
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition"
          >
            Refresh Connection
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloudStorageCredsDialog;
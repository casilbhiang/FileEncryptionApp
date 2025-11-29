import React, { useState } from 'react';
import { X } from 'lucide-react';

interface EditUserSettingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: UserData) => void;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
}

const EditUserSettingDialog: React.FC<EditUserSettingDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  user,
}) => {
  const [formData, setFormData] = useState<UserData>({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
  });

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Edit User Setting</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="font-bold text-lg">{user.name}</h3>
          <p className="text-sm text-gray-600">{user.email} | {user.id}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              User ID (Auto-generated)
            </label>
            <input
              type="text"
              value={formData.id}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Full Nric Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+65 9722 1234"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full mt-6 px-4 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default EditUserSettingDialog;
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  userEmail: string;
  userId: string;
}

const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  userEmail,
  userId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Delete User Account?</h2>
          <p className="text-gray-600 mb-4">You are about to permanently delete:</p>
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 w-full">
            <p className="font-semibold text-gray-900">{userName}</p>
            <p className="text-sm text-gray-600">{userEmail} | {userId}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Delete User
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteUserDialog;
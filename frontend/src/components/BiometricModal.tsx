import React, { useState, useEffect } from 'react';
import { Fingerprint, AlertCircle, CheckCircle, X } from 'lucide-react';
import BiometricService from '../services/Biometric';

interface BiometricModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userId: string;
    userName: string;
    mode: 'register' | 'authenticate';
}

const BiometricModal: React.FC<BiometricModalProps> = ({ 
    isOpen, 
    onClose, 
    onSuccess, 
    userId, 
    userName, 
    mode 
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isBiometricAvailable, setIsBiometricAvailable] = useState(true);
    const [modalMode, setModalMode] = useState<'register' | 'authenticate'>(mode);

    useEffect(() => {
        if (isOpen) {
            checkAvailability();
            setModalMode(mode); // Reset to initial mode when modal opens
            setError('');
            setSuccess(false);
        }
    }, [isOpen, mode]);

    const checkAvailability = async () => {
        const available = await BiometricService.isBiometricAvailable();
        setIsBiometricAvailable(available);
        if (!available) {
            setError('Biometric authentication is not available on this device.');
        }
    };

    const handleBiometric = async () => {
        setIsLoading(true);
        setError('');
        setSuccess(false);

        try {
            if (modalMode === 'authenticate') {
                // Try to authenticate
                try {
                    await BiometricService.authenticateBiometric(userId);
                    setSuccess(true);
                    setTimeout(() => {
                        onSuccess();
                        onClose();
                    }, 1000);
                } catch (authError: any) {
                    console.error('Authentication error:', authError);
                    
                    // Check if the error is because no credentials are registered
                    if (authError.message?.includes('No biometric credentials') ||
                        authError.message?.includes('not allowed') ||
                        authError.message?.includes('404')) {
                        // Switch to registration mode
                        setModalMode('register');
                        setError('No biometric registered on this browser. Click below to register now.');
                        setIsLoading(false);
                        return;
                    }
                    
                    throw authError;
                }
            } else {
                // Register mode
                console.log('Starting biometric registration...');
                await BiometricService.registerBiometric(userId, userName);
                setSuccess(true);
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 1500);
            }
        } catch (err: any) {
            console.error('Biometric error:', err);
            setError(err.message || 'Biometric operation failed');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl relative animate-fadeIn">
                {/* Close button (only for initial registration) */}
                {mode === 'register' && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>
                )}

                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className={`rounded-full p-6 ${
                        success ? 'bg-green-100' : error ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                        {success ? (
                            <CheckCircle className="w-16 h-16 text-green-600" />
                        ) : error && !isBiometricAvailable ? (
                            <AlertCircle className="w-16 h-16 text-red-600" />
                        ) : (
                            <Fingerprint className="w-16 h-16 text-blue-600" />
                        )}
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
                    {modalMode === 'register' 
                        ? 'Register Biometric' 
                        : 'Biometric Authentication Required'}
                </h2>

                {/* Description */}
                <p className="text-gray-600 text-center mb-6">
                    {modalMode === 'register' 
                        ? 'Register your fingerprint or face ID to enable quick and secure login on this device.'
                        : 'Please verify your identity using fingerprint or face ID to continue as system admin.'}
                </p>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-600 text-sm font-medium">
                            {modalMode === 'register' 
                                ? 'Biometric registered successfully!' 
                                : 'Authentication successful!'}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                {!success && (
                    <div className="space-y-3">
                        <button
                            onClick={handleBiometric}
                            disabled={isLoading || !isBiometricAvailable}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Fingerprint className="w-5 h-5" />
                                    {modalMode === 'register' ? 'Register Biometric' : 'Authenticate Now'}
                                </>
                            )}
                        </button>

                        {mode === 'register' && (
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="w-full py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-semibold rounded-lg transition"
                            >
                                Skip for Now
                            </button>
                        )}
                    </div>
                )}

                {/* Info text */}
                {!error && !success && (
                    <p className="text-gray-500 text-xs text-center mt-4">
                        {modalMode === 'register'
                            ? 'Your biometric data is stored securely on your device and never leaves it.'
                            : 'System admin access requires biometric verification for enhanced security.'}
                    </p>
                )}
            </div>
        </div>
    );
};

export default BiometricModal;
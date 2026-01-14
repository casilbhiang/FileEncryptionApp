import React, { useState, useEffect } from 'react';
import { X, QrCode, Download, Loader2 } from 'lucide-react';
import { getKeyQRCode } from '../../services/keyService';

interface ViewQRDialogProps {
    isOpen: boolean;
    onClose: () => void;
    keyId: string | null;
    doctor: string;
    patient: string;
}

const ViewQRDialog: React.FC<ViewQRDialogProps> = ({
    isOpen,
    onClose,
    keyId,
    doctor,
    patient
}) => {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && keyId) {
            loadQRCode();
        } else {
            setQrCode(null);
            setError(null);
        }
    }, [isOpen, keyId]);

    const loadQRCode = async () => {
        if (!keyId) return;
        try {
            setLoading(true);
            setError(null);
            const response = await getKeyQRCode(keyId);
            setQrCode(response.qr_code);
            setExpiresAt(response.expires_at || null);
        } catch (err) {
            console.error('Failed to load QR code:', err);
            setError('Failed to load QR code. The key might have been revoked or deleted.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!qrCode) return;
        const link = document.createElement('a');
        // Backend returns full data URI, so use it directly if it starts with data:
        link.href = qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`;
        link.download = `key-pair-${keyId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-2 text-gray-900 font-semibold">
                        <QrCode className="w-5 h-5 text-blue-600" />
                        Key Pair QR Code
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 text-center space-y-6">
                    <div className="text-sm text-gray-600">
                        <p>Key ID: <span className="font-mono font-medium text-gray-900">{keyId}</span></p>
                        <p className="mt-1">{doctor} ↔ {patient}</p>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-600" />
                            <p>Generating QR Code...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
                            {error}
                        </div>
                    ) : qrCode ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
                                <img
                                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                                    alt="Key Pair QR Code"
                                    className="w-48 h-48 object-contain"
                                />
                            </div>
                            {expiresAt && (
                                <p className="text-sm text-gray-500">
                                    Expires: <span className="font-medium text-gray-900">{new Date(expiresAt).toLocaleDateString()}</span>
                                </p>
                            )}
                        </div>
                    ) : null}

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleDownload}
                            disabled={!qrCode || loading}
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 disabled:bg-blue-400"
                        >
                            <Download className="w-4 h-4" />
                            Download QR Code
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewQRDialog;

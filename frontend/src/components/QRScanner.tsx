import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { AlertCircle } from 'lucide-react';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanFailure?: (error: any) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Initialize scanner
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                rememberLastUsedCamera: true
            },
      /* verbose= */ false
        );

        scannerRef.current = scanner;

        try {
            scanner.render(
                (decodedText) => {
                    // Stop scanning after successful scan
                    scanner.clear().catch(console.error);
                    onScanSuccess(decodedText);
                },
                (errorMessage) => {
                    // Only report critical errors via callback
                    if (onScanFailure) {
                        // Filter out common "no QR code found" errors to avoid spamming
                        if (typeof errorMessage === 'string' && !errorMessage.includes('No MultiFormat Readers')) {
                            onScanFailure(errorMessage);
                        }
                    }
                }
            );
        } catch (err: any) {
            console.error("Failed to start scanner", err);
            setError("Failed to start camera. Please ensure camera permissions are granted.");
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, [onScanSuccess, onScanFailure]);

    return (
        <div className="w-full max-w-md mx-auto">
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}
            <div id="reader" className="overflow-hidden rounded-lg border-2 border-gray-200"></div>
            <p className="text-center text-sm text-gray-500 mt-2">
                Position the QR code within the frame
            </p>
        </div>
    );
};

export default QRScanner;

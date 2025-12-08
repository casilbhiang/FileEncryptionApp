"""
QR Code generation utilities
"""
import qrcode
import io
import base64
from typing import Dict, Any
import json

class QRCodeGenerator:
    """Generates QR codes for key exchange"""
    
    @staticmethod
    def generate_qr_image(data: str, size: int = 300) -> str:
        """
        Generate a QR code image and return as base64 string
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        
        # Save to bytes buffer
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        
        # Encode to base64
        img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
        return img_str

    @staticmethod
    def generate_connection_qr(key_data: Dict[str, Any], size: int = 300) -> str:
        """
        Generate a QR code containing connection/key data
        """
        # Convert data to JSON string
        json_data = json.dumps(key_data)
        return QRCodeGenerator.generate_qr_image(json_data, size)

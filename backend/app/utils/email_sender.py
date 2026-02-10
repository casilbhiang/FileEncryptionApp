"""
Email sending utility for OTP codes and notifications
Uses Brevo (formerly Sendinblue) API
"""
import os
import requests
from flask import current_app


def send_otp_email(recipient_email: str, otp_code: str, user_name: str = None) -> bool:
    """
    Send OTP code to user's email using Brevo API
    """
    brevo_api_key = os.environ.get('BREVO_API_KEY')

    if brevo_api_key:
        return send_otp_via_brevo(recipient_email, otp_code, user_name, brevo_api_key)
    else:
        print("Brevo API key not configured")
        return False


def send_otp_via_brevo(recipient_email: str, otp_code: str, user_name: str, api_key: str) -> bool:
    """Send OTP via Brevo API"""
    try:
        greeting = f'Hi {user_name},' if user_name else 'Hi,'

        # Use the verified sender email from Brevo
        from_email = os.environ.get('EMAIL_FROM', 'fyp2502@gmail.com')
        from_name = os.environ.get('EMAIL_FROM_NAME', 'FileEncryption App')

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .otp-box {{
            background-color: #f4f4f4;
            border: 2px solid #4CAF50;
            border-radius: 5px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
        }}
        .otp-code {{
            font-size: 32px;
            font-weight: bold;
            color: #4CAF50;
            letter-spacing: 5px;
        }}
        .footer {{
            margin-top: 20px;
            font-size: 12px;
            color: #666;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h2>FileEncryption App - Verification Code</h2>
        <p>{greeting}</p>
        <p>Your verification code is:</p>
        <div class="otp-box">
            <div class="otp-code">{otp_code}</div>
        </div>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <div class="footer">
            <p>Best regards,<br>FileEncryption App Team</p>
        </div>
    </div>
</body>
</html>
"""

        # Brevo API endpoint
        url = "https://api.brevo.com/v3/smtp/email"

        headers = {
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json"
        }

        payload = {
            "sender": {
                "name": from_name,
                "email": from_email
            },
            "to": [
                {
                    "email": recipient_email,
                    "name": user_name or recipient_email
                }
            ],
            "subject": f"Your Login Code: {otp_code}",
            "htmlContent": html_body
        }

        response = requests.post(url, json=payload, headers=headers)

        if response.status_code == 201:
            print(f"SUCCESS: OTP email sent via Brevo to {recipient_email}")
            return True
        else:
            print(f"Error sending email via Brevo: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        print(f"Error sending email via Brevo: {e}")
        import traceback
        traceback.print_exc()
        return False


def send_password_reset_email(recipient_email: str, reset_link: str, user_name: str = None) -> bool:
    """Send password reset link to user's email"""
    brevo_api_key = os.environ.get('BREVO_API_KEY')

    if not brevo_api_key:
        print("Brevo API key not configured for password reset")
        return False

    try:
        greeting = f'Hi {user_name},' if user_name else 'Hi,'
        from_email = os.environ.get('EMAIL_FROM', 'fyp2502@gmail.com')
        from_name = os.environ.get('EMAIL_FROM_NAME', 'FileEncryption App')

        html_body = f"""
<!DOCTYPE html>
<html>
<body>
    <h2>Password Reset Request</h2>
    <p>{greeting}</p>
    <p>Click the link below to reset your password:</p>
    <p><a href="{reset_link}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
</body>
</html>
"""

        url = "https://api.brevo.com/v3/smtp/email"

        headers = {
            "accept": "application/json",
            "api-key": brevo_api_key,
            "content-type": "application/json"
        }

        payload = {
            "sender": {
                "name": from_name,
                "email": from_email
            },
            "to": [
                {
                    "email": recipient_email,
                    "name": user_name or recipient_email
                }
            ],
            "subject": "Password Reset Request",
            "htmlContent": html_body
        }

        response = requests.post(url, json=payload, headers=headers)

        if response.status_code == 201:
            print(f"SUCCESS: Password reset email sent via Brevo to {recipient_email}")
            return True
        else:
            print(f"Error sending password reset email via Brevo: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        print(f"Error sending password reset email via Brevo: {e}")
        return False

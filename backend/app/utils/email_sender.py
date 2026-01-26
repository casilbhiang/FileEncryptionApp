"""
Email sending utility for OTP codes and notifications
Uses Resend API (with SMTP fallback)
"""
import os
from flask import current_app

# Try to import resend, fall back to SMTP if not available
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def send_otp_email(recipient_email: str, otp_code: str, user_name: str = None) -> bool:
    """
    Send OTP code to user's email using Resend API
    """
    # Try Resend first
    resend_api_key = os.environ.get('RESEND_API_KEY') or current_app.config.get('RESEND_API_KEY')

    if RESEND_AVAILABLE and resend_api_key:
        return send_otp_via_resend(recipient_email, otp_code, user_name, resend_api_key)
    else:
        print("Resend not configured, falling back to SMTP...")
        return send_otp_via_smtp(recipient_email, otp_code, user_name)


def send_otp_via_resend(recipient_email: str, otp_code: str, user_name: str, api_key: str) -> bool:
    """Send OTP via Resend API"""
    try:
        resend.api_key = api_key

        greeting = f'Hi {user_name},' if user_name else 'Hi,'
        from_email = os.environ.get('EMAIL_FROM', 'onboarding@resend.dev')

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

        params = {
            "from": f"FileEncryption App <{from_email}>",
            "to": [recipient_email],
            "subject": f"Your Login Code: {otp_code}",
            "html": html_body,
        }

        response = resend.Emails.send(params)
        print(f"SUCCESS: OTP email sent via Resend to {recipient_email}")
        print(f"Resend response: {response}")
        return True

    except Exception as e:
        print(f"Error sending email via Resend: {e}")
        import traceback
        traceback.print_exc()
        return False


def send_otp_via_smtp(recipient_email: str, otp_code: str, user_name: str = None) -> bool:
    """Fallback: Send OTP via SMTP"""
    try:
        smtp_host = current_app.config.get('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = current_app.config.get('SMTP_PORT', 587)
        smtp_user = current_app.config.get('SMTP_USER', 'your-email@gmail.com')
        smtp_password = current_app.config.get('SMTP_PASSWORD', 'your-app-password')
        email_from = current_app.config.get('EMAIL_FROM', smtp_user)
        email_from_name = current_app.config.get('EMAIL_FROM_NAME', 'FileEncryption App')

        if not smtp_user or smtp_user == 'your-email@gmail.com':
            print("ERROR: SMTP credentials not configured")
            return False

        message = MIMEMultipart('alternative')
        message['Subject'] = f'Your Login Code: {otp_code}'
        message['From'] = f'{email_from_name} <{email_from}>'
        message['To'] = recipient_email

        greeting = f'Hi {user_name},' if user_name else 'Hi,'

        text_body = f"""
{greeting}

Your verification code is: {otp_code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
FileEncryption App Team
"""

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .otp-box {{ background-color: #f4f4f4; border: 2px solid #4CAF50; border-radius: 5px; padding: 20px; text-align: center; margin: 20px 0; }}
        .otp-code {{ font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px; }}
        .footer {{ margin-top: 20px; font-size: 12px; color: #666; }}
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

        part1 = MIMEText(text_body, 'plain')
        part2 = MIMEText(html_body, 'html')
        message.attach(part1)
        message.attach(part2)

        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(message)
        server.quit()

        print(f"SUCCESS: OTP email sent via SMTP to {recipient_email}")
        return True

    except Exception as e:
        print(f"Error sending email via SMTP: {e}")
        return False


def send_password_reset_email(recipient_email: str, reset_link: str, user_name: str = None) -> bool:
    """Send password reset link to user's email"""
    resend_api_key = os.environ.get('RESEND_API_KEY') or current_app.config.get('RESEND_API_KEY')

    if RESEND_AVAILABLE and resend_api_key:
        try:
            resend.api_key = resend_api_key
            greeting = f'Hi {user_name},' if user_name else 'Hi,'
            from_email = os.environ.get('EMAIL_FROM', 'onboarding@resend.dev')

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

            params = {
                "from": f"FileEncryption App <{from_email}>",
                "to": [recipient_email],
                "subject": "Password Reset Request",
                "html": html_body,
            }

            resend.Emails.send(params)
            print(f"SUCCESS: Password reset email sent via Resend to {recipient_email}")
            return True

        except Exception as e:
            print(f"Error sending password reset email via Resend: {e}")
            return False
    else:
        print("Resend not configured for password reset")
        return False

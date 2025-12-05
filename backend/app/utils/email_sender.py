"""
Email sending utility for OTP codes and notifications
Uses Gmail SMTP to send emails
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app
import os


def send_otp_email(recipient_email: str, otp_code: str, user_name: str = None) -> bool:
    """
    Send OTP code to user's email

    Args:
        recipient_email: Email address to send to
        otp_code: 6-digit OTP code
        user_name: Optional user's full name for personalization

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Get SMTP configuration from Flask config (which loads from .env)
        smtp_host = current_app.config.get('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = current_app.config.get('SMTP_PORT', 587)
        smtp_user = current_app.config.get('SMTP_USER', 'your-email@gmail.com')
        smtp_password = current_app.config.get('SMTP_PASSWORD', 'your-app-password')
        email_from = current_app.config.get('EMAIL_FROM', smtp_user)
        email_from_name = current_app.config.get('EMAIL_FROM_NAME', 'FileEncryption App')

        # Debug: print what we're actually loading
        print(f"DEBUG: smtp_user from config = {smtp_user}")
        print(f"DEBUG: smtp_password from config = {smtp_password[:4]}...")

        # Validate configuration
        if not smtp_user or smtp_user == 'your-email@gmail.com':
            print("ERROR: SMTP credentials not configured in .env file")
            print("Please set SMTP_USER and SMTP_PASSWORD in backend/.env")
            return False

        if smtp_password == 'your-app-specific-password-here':
            print("ERROR: SMTP_PASSWORD still has placeholder value")
            print("Please follow the instructions in backend/.env to generate a Gmail App Password")
            return False

        # Create email message
        message = MIMEMultipart('alternative')
        message['Subject'] = f'Your Login Code: {otp_code}'
        message['From'] = f'{email_from_name} <{email_from}>'
        message['To'] = recipient_email

        # Create email body
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

        # Attach both plain text and HTML versions
        part1 = MIMEText(text_body, 'plain')
        part2 = MIMEText(html_body, 'html')
        message.attach(part1)
        message.attach(part2)

        # Connect to Gmail SMTP server and send email
        print(f"Connecting to {smtp_host}:{smtp_port}...")
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()  # Enable TLS encryption

        print(f"Logging in as {smtp_user}...")
        server.login(smtp_user, smtp_password)

        print(f"Sending OTP email to {recipient_email}...")
        server.send_message(message)
        server.quit()

        print(f"SUCCESS: OTP email sent to {recipient_email}")
        return True

    except smtplib.SMTPAuthenticationError as e:
        print(f"SMTP Authentication Error: {e}")
        print("Please check your SMTP_USER and SMTP_PASSWORD in .env")
        print("Make sure you're using a Gmail App Password, not your regular password")
        return False

    except smtplib.SMTPException as e:
        print(f"SMTP Error: {e}")
        return False

    except Exception as e:
        print(f"Error sending email: {e}")
        import traceback
        traceback.print_exc()
        return False


def send_password_reset_email(recipient_email: str, reset_link: str, user_name: str = None) -> bool:
    """
    Send password reset link to user's email

    Args:
        recipient_email: Email address to send to
        reset_link: Password reset link URL
        user_name: Optional user's full name for personalization

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Get SMTP configuration from Flask config
        smtp_host = current_app.config.get('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = current_app.config.get('SMTP_PORT', 587)
        smtp_user = current_app.config.get('SMTP_USER')
        smtp_password = current_app.config.get('SMTP_PASSWORD')
        email_from = current_app.config.get('EMAIL_FROM', smtp_user)
        email_from_name = current_app.config.get('EMAIL_FROM_NAME', 'FileEncryption App')

        if not smtp_user or not smtp_password:
            print("ERROR: SMTP credentials not configured")
            return False

        # Create email message
        message = MIMEMultipart('alternative')
        message['Subject'] = 'Password Reset Request'
        message['From'] = f'{email_from_name} <{email_from}>'
        message['To'] = recipient_email

        greeting = f'Hi {user_name},' if user_name else 'Hi,'

        text_body = f"""
{greeting}

You requested to reset your password.

Click the link below to reset your password:
{reset_link}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
FileEncryption App Team
"""

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
        .button {{
            display: inline-block;
            padding: 12px 30px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
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
        <h2>Password Reset Request</h2>
        <p>{greeting}</p>
        <p>You requested to reset your password.</p>
        <p>Click the button below to reset your password:</p>

        <a href="{reset_link}" class="button">Reset Password</a>

        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">{reset_link}</p>

        <p>This link will expire in <strong>1 hour</strong>.</p>
        <p>If you didn't request this, please ignore this email.</p>

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

        # Send email
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(message)
        server.quit()

        print(f"SUCCESS: Password reset email sent to {recipient_email}")
        return True

    except Exception as e:
        print(f"Error sending password reset email: {e}")
        return False

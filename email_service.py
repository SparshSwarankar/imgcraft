"""
Email Service Module
====================
Provides unified email sending with support for both SMTP and Brevo API.

Environment Variables:
- EMAIL_PROVIDER: 'smtp' (default) or 'brevo'
- SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD (for SMTP)
- BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME (for Brevo)
"""

import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


# ============================================================================
# STARTUP CONFIGURATION CHECK
# ============================================================================
def _log_email_config():
    """Log email service configuration on startup"""
    provider = os.getenv('EMAIL_PROVIDER', 'smtp').lower()
    
    logger.info("=" * 80)
    logger.info("📧 EMAIL SERVICE CONFIGURATION")
    logger.info("=" * 80)
    
    if provider == 'brevo':
        api_key = os.getenv('BREVO_API_KEY', '')
        sender_email = os.getenv('BREVO_SENDER_EMAIL', 'no-reply@imgcraft.online')
        sender_name = os.getenv('BREVO_SENDER_NAME', 'ImgCraft')
        
        logger.info(f"✅ Provider: BREVO API (HTTP)")
        logger.info(f"   Sender: {sender_name} <{sender_email}>")
        if api_key:
            logger.info(f"   API Key: {'*' * 20}{api_key[-8:]} (configured)")
        else:
            logger.warning("   ⚠️  API Key: NOT CONFIGURED - Emails will fail!")
    else:
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = os.getenv('SMTP_PORT', '587')
        smtp_username = os.getenv('SMTP_USERNAME', '')
        from_email = os.getenv('FROM_EMAIL', smtp_username)
        from_name = os.getenv('FROM_NAME', 'ImgCraft')
        
        logger.info(f"✅ Provider: SMTP")
        logger.info(f"   Server: {smtp_server}:{smtp_port}")
        logger.info(f"   Sender: {from_name} <{from_email}>")
        if smtp_username:
            logger.info(f"   Username: {smtp_username}")
        else:
            logger.warning("   ⚠️  SMTP credentials NOT CONFIGURED - Emails will fail!")
    
    logger.info("=" * 80)

# Log configuration when module is imported
_log_email_config()


class EmailServiceError(Exception):
    """Custom exception for email service errors"""
    pass


def send_email(to_email, subject, html_content, text_content=None):
    """
    Unified email sending function that routes to SMTP or Brevo based on EMAIL_PROVIDER.
    
    Args:
        to_email (str): Recipient email address
        subject (str): Email subject line
        html_content (str): HTML version of email body
        text_content (str, optional): Plain text version of email body
        
    Returns:
        bool: True if email sent successfully
        
    Raises:
        EmailServiceError: If email sending fails
    """
    provider = os.getenv('EMAIL_PROVIDER', 'smtp').lower()
    
    logger.info(f"Sending email via {provider.upper()} to: {to_email}")
    
    try:
        if provider == 'brevo':
            return _send_via_brevo(to_email, subject, html_content, text_content)
        else:
            # Default to SMTP
            return _send_via_smtp(to_email, subject, html_content, text_content)
    except Exception as e:
        logger.error(f"Failed to send email via {provider}: {str(e)}")
        raise EmailServiceError(f"Email delivery failed: {str(e)}")


def _send_via_smtp(to_email, subject, html_content, text_content=None):
    """
    Send email using SMTP (existing logic preserved).
    
    This function uses the existing SMTP configuration and logic.
    """
    try:
        # Email configuration from environment variables
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_username = os.getenv('SMTP_USERNAME', '')
        smtp_password = os.getenv('SMTP_PASSWORD', '')
        from_email = os.getenv('FROM_EMAIL', smtp_username)
        from_name = os.getenv('FROM_NAME', 'ImgCraft')
        
        if not smtp_username or not smtp_password:
            logger.warning("SMTP credentials not configured. Email not sent.")
            logger.warning(f"Email would have been sent to: {to_email}")
            logger.warning(f"Subject: {subject}")
            return False
        
        # Create email message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f'{from_name} <{from_email}>'
        msg['To'] = to_email
        
        # Generate plain text version if not provided
        if text_content is None:
            # Simple HTML to text conversion (strip tags)
            import re
            text_content = re.sub('<[^<]+?>', '', html_content)
        
        # Attach both versions
        part1 = MIMEText(text_content, 'plain')
        part2 = MIMEText(html_content, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        # Send email via SMTP
        with smtplib.SMTP(smtp_server, smtp_port, timeout=30) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
        
        logger.info(f"✓ SMTP email sent successfully to {to_email}")
        return True
        
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error sending email to {to_email}: {str(e)}")
        raise EmailServiceError(f"SMTP error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error sending SMTP email: {str(e)}")
        raise EmailServiceError(f"SMTP delivery failed: {str(e)}")


def _send_via_brevo(to_email, subject, html_content, text_content=None):
    """
    Send email using Brevo (Sendinblue) HTTP API.
    
    This function uses the Brevo v3 API to send transactional emails.
    """
    try:
        import requests
        
        # Brevo configuration from environment variables
        api_key = os.getenv('BREVO_API_KEY', '')
        sender_email = os.getenv('BREVO_SENDER_EMAIL', 'no-reply@imgcraft.online')
        sender_name = os.getenv('BREVO_SENDER_NAME', 'ImgCraft')
        
        if not api_key:
            logger.error("BREVO_API_KEY not configured")
            raise EmailServiceError("Brevo API key not configured")
        
        # Brevo API endpoint
        url = "https://api.brevo.com/v3/smtp/email"
        
        # Prepare headers
        headers = {
            'accept': 'application/json',
            'api-key': api_key,
            'content-type': 'application/json'
        }
        
        # Generate plain text version if not provided
        if text_content is None:
            import re
            text_content = re.sub('<[^<]+?>', '', html_content)
        
        # Prepare payload
        payload = {
            'sender': {
                'name': sender_name,
                'email': sender_email
            },
            'to': [
                {
                    'email': to_email
                }
            ],
            'subject': subject,
            'htmlContent': html_content,
            'textContent': text_content
        }
        
        # Send request with timeout
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=15  # 15 second timeout
        )
        
        # Check response
        if response.status_code in [200, 201]:
            logger.info(f"✓ Brevo email sent successfully to {to_email}")
            logger.debug(f"Brevo response: {response.json()}")
            return True
        else:
            error_msg = f"Brevo API error (HTTP {response.status_code}): {response.text}"
            logger.error(error_msg)
            raise EmailServiceError(error_msg)
            
    except requests.exceptions.Timeout:
        logger.error(f"Brevo API timeout sending to {to_email}")
        raise EmailServiceError("Brevo API request timed out")
    except requests.exceptions.RequestException as e:
        logger.error(f"Brevo API request error: {str(e)}")
        raise EmailServiceError(f"Brevo API request failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error sending Brevo email: {str(e)}")
        raise EmailServiceError(f"Brevo delivery failed: {str(e)}")


# ============================================================================
# CONVENIENCE FUNCTIONS (Optional - for backward compatibility)
# ============================================================================

def send_verification_email(to_email, verification_url, user_name=""):
    """
    Send email verification email.
    
    This is a convenience wrapper that maintains the same interface
    as the original send_verification_email function.
    """
    greeting = f"Hello {user_name}," if user_name else "Hello there,"
    
    subject = "Verify Your ImgCraft Email Address"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                padding: 20px;
            }}
            .email-wrapper {{
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }}
            .header h1 {{
                font-size: 28px;
                font-weight: 700;
                margin: 0;
                letter-spacing: -0.5px;
            }}
            .header .emoji {{
                font-size: 48px;
                display: block;
                margin-bottom: 10px;
            }}
            .content {{
                padding: 40px 30px;
                background: #ffffff;
            }}
            .content p {{
                margin-bottom: 20px;
                font-size: 16px;
                color: #555;
            }}
            .content p:first-child {{
                font-size: 18px;
                color: #333;
                font-weight: 500;
            }}
            .button-container {{
                text-align: center;
                margin: 35px 0;
            }}
            .button {{
                display: inline-block;
                padding: 16px 40px;
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
                color: white !important;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
                transition: all 0.3s ease;
            }}
            .button:hover {{
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
            }}
            .divider {{
                margin: 30px 0;
                border: 0;
                border-top: 1px solid #e0e0e0;
            }}
            .info-box {{
                background: #f8f9fa;
                border-left: 4px solid #ff6b6b;
                padding: 15px 20px;
                margin: 25px 0;
                border-radius: 4px;
            }}
            .info-box p {{
                margin: 0;
                font-size: 14px;
                color: #666;
            }}
            .info-box strong {{
                color: #ff6b6b;
                font-weight: 600;
            }}
            .footer {{
                background: #f8f9fa;
                padding: 25px 30px;
                text-align: center;
                border-top: 1px solid #e0e0e0;
            }}
            .footer p {{
                margin: 5px 0;
                font-size: 13px;
                color: #999;
            }}
            @media only screen and (max-width: 600px) {{
                .email-wrapper {{
                    border-radius: 0;
                }}
                .header {{
                    padding: 30px 20px;
                }}
                .header h1 {{
                    font-size: 24px;
                }}
                .content {{
                    padding: 30px 20px;
                }}
                .button {{
                    padding: 14px 30px;
                    font-size: 15px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <div class="header">
                <span class="emoji">✉️</span>
                <h1>Welcome to ImgCraft!</h1>
            </div>
            
            <div class="content">
                <p>{greeting}</p>
                
                <p>Thank you for signing up for ImgCraft! We're excited to have you on board.</p>
                
                <p>To get started, please verify your email address by clicking the button below:</p>
                
                <div class="button-container">
                    <a href="{verification_url}" class="button">Verify Email Address</a>
                </div>
                
                <hr class="divider">
                
                <p style="font-size: 14px; color: #777;">If the button above doesn't work, copy and paste this link into your browser:</p>
                <p style="font-size: 13px; word-break: break-all; color: #ff6b6b; background: #fff5f5; padding: 12px; border-radius: 6px; border: 1px solid #ffe0e0;">{verification_url}</p>
                
                <div class="info-box">
                    <p><strong>⏰ Note:</strong> This verification link will expire in 24 hours.</p>
                </div>
                
                <p style="font-size: 14px; color: #777;">If you didn't create an account with ImgCraft, you can safely ignore this email.</p>
                
                <p style="margin-top: 30px; font-size: 15px;">Welcome aboard!<br><strong>The ImgCraft Team</strong></p>
            </div>
            
            <div class="footer">
                <p>© 2025 ImgCraft. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Welcome to ImgCraft!
    
    {greeting}
    
    Thank you for signing up for ImgCraft! We're excited to have you on board.
    
    To get started, please verify your email address by clicking this link:
    {verification_url}
    
    This verification link will expire in 24 hours.
    
    If you didn't create an account with ImgCraft, you can safely ignore this email.
    
    Welcome aboard!
    The ImgCraft Team
    """
    
    return send_email(to_email, subject, html_content, text_content)


def send_password_reset_email(to_email, reset_url):
    """
    Send password reset email.
    
    This is a convenience wrapper that maintains the same interface
    as the original send_password_reset_email function.
    """
    subject = "Reset Your ImgCraft Password"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                padding: 20px;
            }}
            .email-wrapper {{
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }}
            .header h1 {{
                font-size: 28px;
                font-weight: 700;
                margin: 0;
                letter-spacing: -0.5px;
            }}
            .header .emoji {{
                font-size: 48px;
                display: block;
                margin-bottom: 10px;
            }}
            .content {{
                padding: 40px 30px;
                background: #ffffff;
            }}
            .content p {{
                margin-bottom: 20px;
                font-size: 16px;
                color: #555;
            }}
            .content p:first-child {{
                font-size: 18px;
                color: #333;
                font-weight: 500;
            }}
            .button-container {{
                text-align: center;
                margin: 35px 0;
            }}
            .button {{
                display: inline-block;
                padding: 16px 40px;
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
                color: white !important;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
                transition: all 0.3s ease;
            }}
            .button:hover {{
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
            }}
            .divider {{
                margin: 30px 0;
                border: 0;
                border-top: 1px solid #e0e0e0;
            }}
            .info-box {{
                background: #f8f9fa;
                border-left: 4px solid #ff6b6b;
                padding: 15px 20px;
                margin: 25px 0;
                border-radius: 4px;
            }}
            .info-box p {{
                margin: 0;
                font-size: 14px;
                color: #666;
            }}
            .info-box strong {{
                color: #ff6b6b;
                font-weight: 600;
            }}
            .footer {{
                background: #f8f9fa;
                padding: 25px 30px;
                text-align: center;
                border-top: 1px solid #e0e0e0;
            }}
            .footer p {{
                margin: 5px 0;
                font-size: 13px;
                color: #999;
            }}
            .footer a {{
                color: #ff6b6b;
                text-decoration: none;
            }}
            @media only screen and (max-width: 600px) {{
                .email-wrapper {{
                    border-radius: 0;
                }}
                .header {{
                    padding: 30px 20px;
                }}
                .header h1 {{
                    font-size: 24px;
                }}
                .content {{
                    padding: 30px 20px;
                }}
                .button {{
                    padding: 14px 30px;
                    font-size: 15px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <div class="header">
                <span class="emoji">🔐</span>
                <h1>Password Reset Request</h1>
            </div>
            
            <div class="content">
                <p>Hello there,</p>
                
                <p>We received a request to reset your ImgCraft password. Click the button below to create a new password:</p>
                
                <div class="button-container">
                    <a href="{reset_url}" class="button">Reset My Password</a>
                </div>
                
                <hr class="divider">
                
                <p style="font-size: 14px; color: #777;">If the button above doesn't work, copy and paste this link into your browser:</p>
                <p style="font-size: 13px; word-break: break-all; color: #ff6b6b; background: #fff5f5; padding: 12px; border-radius: 6px; border: 1px solid #ffe0e0;">{reset_url}</p>
                
                <div class="info-box">
                    <p><strong>⏰ Important:</strong> This link will expire in 1 hour for security reasons.</p>
                </div>
                
                <p style="font-size: 14px; color: #777;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                
                <p style="margin-top: 30px; font-size: 15px;">Best regards,<br><strong>The ImgCraft Team</strong></p>
            </div>
            
            <div class="footer">
                <p>© 2025 ImgCraft. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Password Reset Request
    
    Hello,
    
    We received a request to reset your ImgCraft password.
    
    Click this link to reset your password:
    {reset_url}
    
    This link will expire in 1 hour.
    
    If you didn't request this password reset, you can safely ignore this email.
    
    Best regards,
    The ImgCraft Team
    """
    
    return send_email(to_email, subject, html_content, text_content)

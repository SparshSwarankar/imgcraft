# Forgot Password System - Implementation Guide

## Overview
This document explains the complete forgot password implementation for ImgCraft, which uses **custom email sending** instead of Supabase's built-in email templates.

## Features
✅ Custom branded HTML emails  
✅ Secure token-based password reset  
✅ 1-hour token expiry  
✅ One-time use tokens  
✅ Full control over email content and design  
✅ Works with any SMTP provider (Gmail, Outlook, custom SMTP, etc.)  

---

## How It Works

### 1. User Requests Password Reset
- User clicks "Forgot your password?" on the login page
- Enters their email address
- System generates a secure random token
- Token is hashed and stored in database with 1-hour expiry
- Custom branded email is sent with reset link

### 2. User Receives Email
- Beautiful HTML email with ImgCraft branding
- Contains a secure reset link: `https://yoursite.com/auth?reset_token=<token>`
- Link expires in 1 hour
- Token can only be used once

### 3. User Resets Password
- Clicks link in email
- Automatically redirected to auth page with reset form
- Enters new password (twice for confirmation)
- System validates token, updates password, marks token as used
- User is redirected to login

---

## Setup Instructions

### Step 1: Create Database Table
Run this SQL in your Supabase SQL editor:

```sql
-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Enable RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Service role policy
CREATE POLICY "Service role can manage password reset tokens"
ON password_reset_tokens FOR ALL TO service_role
USING (true) WITH CHECK (true);
```

Or simply run the migration file:
```bash
# Copy the SQL from migrations/create_password_reset_tokens.sql
# and run it in Supabase SQL Editor
```

### Step 2: Configure Email Settings
Add these to your `.env` file:

```env
# For Gmail
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=ImgCraft
```

#### Gmail Setup:
1. Enable 2-factor authentication on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Generate an "App Password" for "Mail"
4. Use this app password as `SMTP_PASSWORD`

#### Other Providers:
- **Outlook/Hotmail**: `smtp.office365.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **SendGrid**: `smtp.sendgrid.net:587` (use API key as password)
- **Custom SMTP**: Use your provider's settings

### Step 3: Test the System
1. Navigate to `/auth`
2. Click "Forgot your password?"
3. Enter your email
4. Check your inbox for the reset email
5. Click the reset link
6. Enter a new password
7. Try logging in with the new password

---

## API Endpoints

### POST /api/auth/forgot-password
Request password reset email

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

### POST /api/auth/reset-password
Reset password with token

**Request:**
```json
{
  "reset_token": "secure-token-from-email",
  "password": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## Email Template Customization

The email template is defined in `app.py` in the `send_password_reset_email()` function.

To customize:
1. Edit the `html_body` variable
2. Update colors, logo, text, etc.
3. Restart the Flask app

Current template features:
- Gradient header with ImgCraft branding
- Prominent "Reset Password" button
- Fallback plain text link
- Expiry warning
- Professional footer

---

## Security Features

1. **Token Hashing**: Tokens are hashed (SHA-256) before storage
2. **One-Time Use**: Tokens are marked as used after password reset
3. **Expiry**: Tokens expire after 1 hour
4. **No Email Enumeration**: System doesn't reveal if email exists
5. **Secure Random**: Uses `secrets.token_urlsafe()` for token generation
6. **Database Cleanup**: Old tokens are deleted when new ones are created

---

## Troubleshooting

### Email Not Sending
**Check logs for:**
```
SMTP credentials not configured. Email not sent.
Reset URL (for testing): http://localhost:5000/auth?reset_token=...
```

**Solution:** Add SMTP credentials to `.env` file

### "Invalid or expired reset link" Error
**Possible causes:**
1. Token has expired (>1 hour old)
2. Token was already used
3. Token doesn't exist in database

**Solution:** Request a new reset link

### Gmail "Less secure app" Error
**Solution:** Use an App Password instead of your regular password
- Enable 2FA
- Generate App Password at https://myaccount.google.com/apppasswords

### Email Goes to Spam
**Solutions:**
1. Add SPF/DKIM records to your domain
2. Use a professional email service (SendGrid, Mailgun, etc.)
3. Warm up your sending domain
4. Ask users to whitelist your email

---

## Testing Without Email

If SMTP is not configured, the system will log the reset URL to the console:

```
[WARNING] SMTP credentials not configured. Email not sent.
[WARNING] Reset URL (for testing): http://localhost:5000/auth?reset_token=abc123...
```

You can copy this URL and test the reset flow manually.

---

## Production Checklist

- [ ] Database table created
- [ ] SMTP credentials configured in `.env`
- [ ] Email template customized with your branding
- [ ] Test email sending
- [ ] Test password reset flow
- [ ] Configure SPF/DKIM records for your domain
- [ ] Set up email monitoring/logging
- [ ] Test on production domain
- [ ] Add rate limiting to prevent abuse

---

## Files Modified

### Frontend
- `templates/auth.html` - Added forgot password form and logic
- `static/js/auth.js` - Added forgotPassword() and resetPassword() methods

### Backend
- `app.py` - Added endpoints and email sending function
  - `/api/auth/forgot-password` - Send reset email
  - `/api/auth/reset-password` - Update password
  - `send_password_reset_email()` - Custom email sender

### Database
- `migrations/create_password_reset_tokens.sql` - Table creation script

### Configuration
- `.env.email.example` - Example email configuration

---

## Support

For issues or questions:
1. Check the logs in `logs/app.log`
2. Verify SMTP credentials
3. Test with a simple email first
4. Check Supabase database for token records

---

## License
Part of ImgCraft - All rights reserved © 2025

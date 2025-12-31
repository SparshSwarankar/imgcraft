# ImgCraft - AI-Powered Image Editing Platform

## Overview
ImgCraft is a comprehensive web-based image editing platform built with **Flask** and **Python**. It provides users with advanced AI-powered tools for image manipulation, enhancement, and creative editing. The platform uses a **credit-based system** with **Razorpay integration** for payments.

---

## 🎨 Core Features & Functions

### 1. **Image Editing Tools** (13 Tools)

#### **Image Resize**
- **Endpoint:** `POST /api/resize`
- **Credits Required:** 1-5
- **Features:**
  - Resize images to specific dimensions
  - Multiple resize modes (fit, fill, stretch)
  - Preserve aspect ratio option
  - Batch resize support

#### **Image Compression**
- **Endpoint:** `POST /api/compress`
- **Credits Required:** 1-2
- **Features:**
  - Reduce file size without significant quality loss
  - Adjustable compression levels
  - Format conversion during compression
  - Automatic quality optimization

#### **Image Format Conversion**
- **Endpoint:** `POST /api/convert`
- **Credits Required:** 1
- **Supported Formats:** JPG, PNG, WebP, GIF, BMP, TIFF
- **Features:**
  - Convert between image formats
  - Quality preservation
  - Batch conversion support
  - Metadata handling

#### **Background Removal (AI-Powered)**
- **Endpoint:** `POST /api/remove-bg`
- **Credits Required:** 10
- **Features:**
  - AI-powered background removal using rembg
  - Transparent background generation
  - Edge detection and smoothing
  - Download with transparency

#### **Color Palette Extraction**
- **Endpoint:** `POST /api/palette`
- **Credits Required:** 2
- **Features:**
  - Extract dominant colors from images
  - Generate color palettes
  - Color hex value export
  - Palette analytics

#### **Advanced Filters**
- **Endpoint:** `POST /api/filter`
- **Credits Required:** 2-3
- **Available Filters:**
  - Brightness/Contrast adjustment
  - Saturation/Vibrance control
  - Exposure & Highlights/Shadows
  - Sharpness, Vignette, Grain effects
  - Temperature & Tint adjustments
  - Multiple filters combinable

#### **EXIF Data Viewer**
- **Endpoint:** `POST /api/exif`
- **Credits Required:** 0 (Free)
- **Features:**
  - Extract and display EXIF metadata
  - Camera information
  - GPS coordinates (if available)
  - Image technical details

#### **Image Upscaling (AI-Enhanced)**
- **Endpoint:** `POST /api/upscale`
- **Credits Required:** 5-10
- **Features:**
  - AI-powered image upscaling
  - 2x-4x enlargement
  - Detail preservation
  - Noise reduction

#### **Crop & Rotate**
- **Endpoint:** `POST /api/crop`
- **Credits Required:** 1-2
- **Features:**
  - Precise crop selection
  - Aspect ratio locking
  - Auto-crop detection
  - Rotation support (90°, 180°, 270°)
  - Flip horizontal/vertical

#### **Watermark Addition**
- **Endpoint:** `POST /api/watermark`
- **Credits Required:** 2-3
- **Features:**
  - Text watermarks
  - Image watermarks
  - Position customization
  - Opacity/transparency control
  - Multiple watermark support

#### **Collage Creation**
- **Endpoint:** `POST /api/collage`
- **Credits Required:** 3-5
- **Features:**
  - Multi-image collage layouts
  - 2x2, 2x3, 3x3 grids
  - Spacing customization
  - Border styles
  - Template-based collages

#### **Image Annotation**
- **Endpoint:** `POST /api/annotation`
- **Credits Required:** 2-3
- **Features:**
  - Text annotations
  - Arrow & shape drawing
  - Highlight regions
  - Custom colors & fonts
  - Layer management

#### **New Year AI Template Generator (Seasonal)**
- **Endpoint:** `POST /api/newyear/generate`
- **Credits Required:** 5
- **Features:**
  - 20 AI-powered templates (Trending, Minimal, Neon, Elegant)
  - Dynamic image zoom and text controls
  - Real-time canvas preview
  - Social media ready formats for 2026 greetings

---

### 2. **Authentication System**

#### **User Registration**
- **Endpoint:** `POST /api/auth/signup`
- **Features:**
  - Email-based registration
  - Password validation
  - Automatic user profile creation
  - Email verification (optional)

#### **User Login**
- **Endpoint:** `POST /api/auth/login`
- **Special Logic:**
  - **Bonus Credits:** If email exists in `email_notifications` table
    - **First Login:** 30 credits (NEW!)
    - **Regular User:** 10 credits
  - **One-Time Only:** Flag stored in `user_profiles.received_bonus_credits`
  - JWT token generation
  - Session management

#### **Session Management**
- **Endpoint:** `GET /api/auth/session`
- **Features:**
  - Verify active session
  - Return user info & credit balance
  - Token validation

#### **Logout**
- **Endpoint:** `POST /api/auth/logout`
- **Features:**
  - Session termination
  - Token invalidation

---

### 3. **Credit System**

#### **Credit Balance**
- **Endpoint:** `GET /api/credits/balance`
- **Returns:**
  - Total credits purchased
  - Remaining credits
  - Free credits balance
  - Usage statistics

#### **Credit History**
- **Endpoint:** `GET /api/credits/history`
- **Features:**
  - Transaction log
  - Tool usage tracking
  - Credit deduction details
  - Timestamp records
  - Pagination support

#### **Automatic Credit Deduction**
- Deducted per tool usage
- Tool-specific cost mapping
- Insufficient credit handling
- Failed operation refund

---

### 4. **Payment System** (Razorpay Integration)

#### **Available Credit Plans**
- **Starter:** 50 credits - ₹99
- **Basic:** 100 credits - ₹179 (10% savings)
- **Pro:** 500 credits - ₹499 (20% savings)
- **Enterprise:** 1000 credits - ₹899 (25% savings)

#### **Create Payment Order**
- **Endpoint:** `POST /api/payments/create-order`
- **Features:**
  - Order ID generation
  - Amount calculation
  - Payment initiation
  - Order tracking

#### **Verify Payment**
- **Endpoint:** `POST /api/payments/verify`
- **Features:**
  - Razorpay signature verification
  - Credit addition
  - Payment status update
  - Order completion

#### **Payment History**
- **Endpoint:** `GET /api/payments/history`
- **Features:**
  - Transaction records
  - Payment status tracking
  - Date filtering
  - Amount details

#### **Webhook Handler**
- **Endpoint:** `POST /api/payments/webhook`
- **Purpose:**
  - Real-time payment verification
  - Automated credit addition
  - Payment status synchronization

#### **Get Payment Plans**
- **Endpoint:** `GET /api/payments/plans`
- **Returns:** List of all available credit plans with pricing

---

### 5. **User Management**

#### **User Profile**
- **Endpoint:** `GET /api/user`
- **Data:** Email, name, creation date
- **Features:**
  - Admin status checking
  - Profile visibility

#### **First Visit Detection**
- **Endpoint:** `POST /api/check-first-visit`
- **Purpose:** Track new user onboarding

---

### 6. **Support & Engagement**

#### **Contact Form Submission**
- **Endpoint:** `POST /api/contact`
- **Fields:**
  - Name, email, subject, message
  - IP address tracking
  - Support response system

#### **Review Submission**
- **Endpoint:** `POST /api/submit-review`
- **Features:**
  - User ratings
  - Feedback collection
  - Timestamp tracking

#### **Newsletter Subscription**
- **Endpoint:** `POST /api/notifications/subscribe`
- **Purpose:** Add email to notification list (eligible for bonus credits)

#### **Unsubscribe**
- **Endpoint:** `POST /api/notifications/unsubscribe`
- **Purpose:** Remove email from mailing list

---

### 7. **Tools & Configuration**

#### **Tool Configuration**
- **Endpoint:** `GET /api/tools/config`
- **Returns:**
  - All available tools
  - Credit costs per tool
  - Tool capabilities
  - Feature flags

---

### 8. **Additional Features**

#### **Draft Saving**
- **Endpoint:** `POST /api/drafts/save` & `GET /api/drafts/list`
- **Purpose:** Save editing work for later

#### **Offline Support (PWA)**
- Service Worker enabled
- Offline tool access
- Sync when online

#### **Cache Management**
- **Endpoint:** `POST /api/cache/clear`
- **Purpose:** Clear browser cache

#### **Analytics Tracking**
- **Endpoint:** `POST /api/analytics`
- **Tracked Data:**
  - Tool usage statistics
  - User behavior
  - Feature adoption

#### **Health Check**
- **Endpoint:** `GET /api/health`
- **Purpose:** Monitor server status

#### **Version Info**
- **Endpoint:** `GET /api/version`
- **Returns:** Current app version

#### **Client Logging**
- **Endpoint:** `POST /api/log`
- **Purpose:** Log errors & events from frontend

---

## 📊 Database Schema

### **Key Tables**

#### **user_profiles**
```
- id (UUID, Primary Key)
- email (TEXT)
- full_name (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- ad_free (BOOLEAN) - Ad-free status
- received_bonus_credits (BOOLEAN) - Flag for bonus credit eligibility
```

#### **user_credits**
```
- id (UUID)
- user_id (UUID, Foreign Key)
- total_credits (INTEGER)
- remaining_credits (INTEGER)
- free_credits (INTEGER)
- created_at (TIMESTAMP)
```

#### **payments**
```
- id (UUID)
- user_id (UUID, Foreign Key)
- razorpay_order_id (TEXT)
- razorpay_payment_id (TEXT)
- amount (INTEGER)
- credits_purchased (INTEGER)
- status (TEXT)
- created_at (TIMESTAMP)
- completed_at (TIMESTAMP)
```

#### **tool_usage**
```
- id (UUID)
- user_id (UUID, Foreign Key)
- tool_name (TEXT)
- credits_consumed (INTEGER)
- status (TEXT)
- created_at (TIMESTAMP)
```

#### **email_notifications**
```
- id (UUID)
- email (TEXT, UNIQUE)
- created_at (TIMESTAMP)
- source (TEXT)
- notified (BOOLEAN)
```

---

## 🔐 Authentication & Authorization

### **JWT Token System**
- Access tokens with 1-hour expiry
- Refresh token support
- Session-based management
- Token validation on protected routes

### **Role-Based Access**
- **Admin Users:** Full access, unlimited credits
- **Regular Users:** Credit-based access
- **Guest Users:** Limited tool access

### **Protected Routes**
- Most endpoints require `@require_auth` decorator
- Credits checked via `@require_credits` decorator
- Optional authentication for some features

---

## 💳 Credit System Logic

### **Allocation:**
1. **New User (Not in email_notifications):** 10 free credits
2. **Email Subscriber (In email_notifications):** 30 free credits (ONE-TIME, first login)
3. **Purchased Credits:** Via Razorpay payments

### **Deduction:**
- Per-tool cost applied on usage
- Automatic refund on failed operations
- Admin users bypass deduction
- Insufficient credit prevention

---

## 🚀 Technology Stack

- **Backend:** Flask (Python)
- **Image Processing:** PIL/Pillow, rembg (background removal), upscaling libraries
- **Database:** PostgreSQL via Supabase
- **Authentication:** Supabase Auth with JWT
- **Payments:** Razorpay API
- **Frontend:** HTML, CSS, JavaScript (Vanilla + Fetch API)
- **PWA:** Service Workers, offline support
- **Hosting:** Render.com

---

## 📝 API Response Format

### **Success Response**
```json
{
  "success": true,
  "data": {
    // Tool-specific data
  },
  "message": "Operation completed"
}
```

### **Error Response**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## ⚙️ Configuration

### **Environment Variables Required**
```
SUPABASE_URL
SUPABASE_KEY
SUPABASE_ADMIN_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
FLASK_ENV
DEBUG_MODE
MAX_FILE_SIZE
```

---

## 📱 Features Highlights

✅ **13 Image Editing Tools**
✅ **AI-Powered (Background Removal, Upscaling)**
✅ **Credit-Based Billing System**
✅ **Razorpay Payment Integration**
✅ **User Authentication & Authorization**
✅ **PWA with Offline Support**
✅ **Real-Time Payment Verification**
✅ **Email Notification System**
✅ **Bonus Credit System** (30 credits for subscribers)
✅ **EXIF Data Extraction**
✅ **Color Palette Analysis**
✅ **Watermarking & Annotation**
✅ **Collage Creation**
✅ **New Year AI Generator (Seasonal)**
✅ **Responsive Design**
✅ **Analytics & Usage Tracking**

---

## 🎯 Recent Updates

### **Bonus Credit System** (NEW!)
- Users in `email_notifications` table receive **30 credits** on first login
- Regular users receive **10 credits**
- One-time only - tracked via `received_bonus_credits` flag
- Independent from Razorpay coupons

---

## 📞 Support

For issues or feature requests, use the contact form or email support.

---

**Version:** 1.0.0
**Last Updated:** December 2025

-- ============================================
-- ImgCraft Database Setup for Supabase
-- ============================================
-- Run this script in Supabase SQL Editor
-- This will create all necessary tables, indexes, and initial data
-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ============================================
-- 1. USER PROFILES TABLE
-- ============================================
-- Stores additional user information linked to Supabase Auth
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- RLS Policy: Users can only read their own profile
CREATE POLICY "Users can view own profile" ON user_profiles FOR
SELECT USING (auth.uid() = id);
-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles FOR
UPDATE USING (auth.uid() = id);
-- ============================================
-- 2. USER CREDITS TABLE
-- ============================================
-- Stores credit balance for each user
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_credits INTEGER DEFAULT 0 CHECK (total_credits >= 0),
    remaining_credits INTEGER DEFAULT 0 CHECK (remaining_credits >= 0),
    free_credits INTEGER DEFAULT 10 CHECK (free_credits >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
-- Enable Row Level Security
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
-- RLS Policy: Users can only read their own credits
CREATE POLICY "Users can view own credits" ON user_credits FOR
SELECT USING (auth.uid() = user_id);
-- ============================================
-- 3. PAYMENTS TABLE
-- ============================================
-- Stores all payment transactions
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    razorpay_order_id TEXT NOT NULL,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    amount INTEGER NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'INR',
    credits_purchased INTEGER NOT NULL CHECK (credits_purchased > 0),
    plan_name TEXT,
    status TEXT DEFAULT 'created' CHECK (
        status IN (
            'created',
            'pending',
            'completed',
            'failed',
            'refunded'
        )
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);
-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
-- Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- RLS Policy: Users can only read their own payments
CREATE POLICY "Users can view own payments" ON payments FOR
SELECT USING (auth.uid() = user_id);
-- ============================================
-- 4. TOOL USAGE TABLE
-- ============================================
-- Logs every tool usage for analytics and billing
CREATE TABLE IF NOT EXISTS tool_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    credits_consumed INTEGER NOT NULL CHECK (credits_consumed >= 0),
    status TEXT DEFAULT 'success' CHECK (
        status IN ('success', 'failed', 'insufficient_credits')
    ),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_tool_usage_user_id ON tool_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_name ON tool_usage(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_usage_created_at ON tool_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_usage_status ON tool_usage(status);
-- Enable Row Level Security
ALTER TABLE tool_usage ENABLE ROW LEVEL SECURITY;
-- RLS Policy: Users can only read their own usage
CREATE POLICY "Users can view own usage" ON tool_usage FOR
SELECT USING (auth.uid() = user_id);
-- ============================================
-- 5. TOOL CONFIG TABLE
-- ============================================
-- Stores configuration for each tool (credit costs, etc.)
CREATE TABLE IF NOT EXISTS tool_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    credit_cost INTEGER NOT NULL CHECK (credit_cost >= 0),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create index for faster tool lookups
CREATE INDEX IF NOT EXISTS idx_tool_config_tool_name ON tool_config(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_config_is_active ON tool_config(is_active);
-- Enable Row Level Security (public read access)
ALTER TABLE tool_config ENABLE ROW LEVEL SECURITY;
-- RLS Policy: Anyone can read tool config
CREATE POLICY "Anyone can view tool config" ON tool_config FOR
SELECT USING (true);
-- ============================================
-- 6. INSERT INITIAL TOOL CONFIGURATION
-- ============================================
-- Insert default tool configurations with credit costs
INSERT INTO tool_config (
        tool_name,
        display_name,
        credit_cost,
        description,
        is_active
    )
VALUES (
        'resize',
        'Image Resize',
        1,
        'Resize images to custom dimensions',
        true
    ),
    (
        'compress',
        'Image Compress',
        2,
        'Compress images to reduce file size',
        true
    ),
    (
        'convert',
        'Format Convert',
        1,
        'Convert images between different formats',
        true
    ),
    (
        'crop',
        'Image Crop',
        1,
        'Crop images to custom dimensions',
        true
    ),
    (
        'palette',
        'Color Palette',
        2,
        'Extract color palette from images',
        true
    ),
    (
        'watermark',
        'Add Watermark',
        3,
        'Add text or image watermarks',
        true
    ),
    (
        'remove_bg',
        'Remove Background',
        10,
        'AI-powered background removal',
        true
    ),
    (
        'exif',
        'EXIF Data',
        1,
        'View and edit image metadata',
        true
    ),
    (
        'filter',
        'Image Filter',
        2,
        'Apply filters and effects',
        true
    ),
    (
        'upscale',
        'Image Upscale',
        8,
        'AI-powered image upscaling',
        true
    ),
    (
        'collage',
        'AI Collage Creator',
        7,
        'Auto-generate professional photo collages with smart layouts',
        true
    ),
    (
        'annotation',
        'AI Annotation Studio',
        15,
        'Professional AI-powered annotation with bounding boxes, polygons, and metadata export',
        true
    ) ON CONFLICT (tool_name) DO NOTHING;
-- ============================================
-- 7. CREATE FUNCTION TO AUTO-CREATE USER PROFILE
-- ============================================
-- This function automatically creates a user profile and credits when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$ BEGIN -- Insert user profile
INSERT INTO public.user_profiles (id, email, full_name)
VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name'
    );
-- Insert user credits with 10 free credits
INSERT INTO public.user_credits (
        user_id,
        total_credits,
        remaining_credits,
        free_credits
    )
VALUES (NEW.id, 10, 10, 10);
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- 8. CREATE TRIGGER FOR NEW USER SIGNUP
-- ============================================
-- Trigger to automatically create profile and credits on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ============================================
-- 9. CREATE FUNCTION TO UPDATE TIMESTAMPS
-- ============================================
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- ============================================
-- 10. CREATE TRIGGERS FOR UPDATED_AT
-- ============================================
-- Trigger for user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE
UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Trigger for user_credits
DROP TRIGGER IF EXISTS update_user_credits_updated_at ON user_credits;
CREATE TRIGGER update_user_credits_updated_at BEFORE
UPDATE ON user_credits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Trigger for tool_config
DROP TRIGGER IF EXISTS update_tool_config_updated_at ON tool_config;
CREATE TRIGGER update_tool_config_updated_at BEFORE
UPDATE ON tool_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- ============================================
-- 11. CREATE FUNCTION FOR ATOMIC CREDIT DEDUCTION
-- ============================================
-- This function safely deducts credits and prevents race conditions
CREATE OR REPLACE FUNCTION public.deduct_credits(
        p_user_id UUID,
        p_tool_name TEXT,
        p_credits_to_deduct INTEGER
    ) RETURNS JSON AS $$
DECLARE v_remaining_credits INTEGER;
v_result JSON;
BEGIN -- Lock the row for update to prevent race conditions
SELECT remaining_credits INTO v_remaining_credits
FROM user_credits
WHERE user_id = p_user_id FOR
UPDATE;
-- Check if user has enough credits
IF v_remaining_credits IS NULL THEN RETURN json_build_object(
    'success',
    false,
    'error',
    'User credits not found',
    'remaining_credits',
    0
);
END IF;
IF v_remaining_credits < p_credits_to_deduct THEN RETURN json_build_object(
    'success',
    false,
    'error',
    'Insufficient credits',
    'remaining_credits',
    v_remaining_credits,
    'required_credits',
    p_credits_to_deduct
);
END IF;
-- Deduct credits
UPDATE user_credits
SET remaining_credits = remaining_credits - p_credits_to_deduct
WHERE user_id = p_user_id;
-- Log the usage
INSERT INTO tool_usage (user_id, tool_name, credits_consumed, status)
VALUES (
        p_user_id,
        p_tool_name,
        p_credits_to_deduct,
        'success'
    );
-- Return success
RETURN json_build_object(
    'success',
    true,
    'remaining_credits',
    v_remaining_credits - p_credits_to_deduct,
    'credits_deducted',
    p_credits_to_deduct
);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- 12. CREATE FUNCTION TO ADD CREDITS
-- ============================================
-- This function adds credits after successful payment
CREATE OR REPLACE FUNCTION public.add_credits(
        p_user_id UUID,
        p_credits_to_add INTEGER
    ) RETURNS JSON AS $$
DECLARE v_new_remaining INTEGER;
v_new_total INTEGER;
BEGIN -- Add credits
UPDATE user_credits
SET total_credits = total_credits + p_credits_to_add,
    remaining_credits = remaining_credits + p_credits_to_add
WHERE user_id = p_user_id
RETURNING total_credits,
    remaining_credits INTO v_new_total,
    v_new_remaining;
-- Return success
RETURN json_build_object(
    'success',
    true,
    'total_credits',
    v_new_total,
    'remaining_credits',
    v_new_remaining,
    'credits_added',
    p_credits_to_add
);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- SETUP COMPLETE
-- ============================================
-- All tables, indexes, triggers, and functions have been created
-- You can now use the ImgCraft authentication and credit system
-- To verify the setup, run:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- ============================================================================
-- ImgCraft Ad-Free System Migration
-- ============================================================================
-- This migration adds support for ad-free subscriptions to the ImgCraft platform
-- 
-- Changes:
-- 1. Add ad_free column to user_profiles table (boolean flag)
-- 2. Add ad_free_purchased_at timestamp for audit trail
-- 3. Add ad_click_count for frontend ad interaction tracking (reset after modal)
-- 4. Create ad_free_purchases table for transaction history
-- 5. Add indexes for efficient queries
-- ============================================================================
-- ============================================================================
-- 1. ALTER user_profiles TABLE
-- ============================================================================
ALTER TABLE user_profiles
ADD COLUMN ad_free BOOLEAN DEFAULT false COMMENT 'User has purchased ad-free experience',
    ADD COLUMN ad_free_purchased_at TIMESTAMP NULL DEFAULT NULL COMMENT 'When user purchased ad-free',
    ADD COLUMN ad_free_razorpay_order_id VARCHAR(255) NULL DEFAULT NULL COMMENT 'Razorpay order ID for audit trail';
-- Add index for efficient ad_free queries (used in template rendering)
CREATE INDEX idx_user_profiles_ad_free ON user_profiles(ad_free);
-- ============================================================================
-- 2. CREATE ad_free_purchases TABLE
-- ============================================================================
-- Tracks all ad-free purchase transactions
CREATE TABLE ad_free_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    razorpay_order_id VARCHAR(255) NOT NULL UNIQUE,
    razorpay_payment_id VARCHAR(255) NULL,
    razorpay_signature VARCHAR(255) NULL,
    amount_paid DECIMAL(10, 2) NOT NULL COMMENT '₹49 (base amount)',
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'pending' COMMENT 'pending, completed, failed, refunded',
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    refunded_at TIMESTAMP NULL,
    notes TEXT NULL
);
-- Create indexes for efficient lookups
CREATE INDEX idx_ad_free_purchases_user_id ON ad_free_purchases(user_id);
CREATE INDEX idx_ad_free_purchases_razorpay_order_id ON ad_free_purchases(razorpay_order_id);
CREATE INDEX idx_ad_free_purchases_razorpay_payment_id ON ad_free_purchases(razorpay_payment_id);
CREATE INDEX idx_ad_free_purchases_status ON ad_free_purchases(status);
CREATE INDEX idx_ad_free_purchases_created_at ON ad_free_purchases(created_at);
-- ============================================================================
-- 3. RLS POLICIES FOR ad_free_purchases TABLE
-- ============================================================================
-- Enable Row Level Security
ALTER TABLE ad_free_purchases ENABLE ROW LEVEL SECURITY;
-- Users can view their own purchase history
CREATE POLICY "users_can_view_own_ad_free_purchases" ON ad_free_purchases FOR
SELECT USING (auth.uid() = user_id);
-- Service role can insert/update (from backend)
-- Note: These are handled via service role key, so no specific policy needed
-- ============================================================================
-- 4. SCHEMA DOCUMENTATION
-- ============================================================================
-- 
-- FRONTEND LOGIC:
-- - Ad click tracking happens in JS via passive event listeners on .adsbygoogle
-- - Count stored in sessionStorage to avoid server spam
-- - Reset count when: modal appears, purchase completes, user logs out
-- 
-- BACKEND LOGIC:
-- - /api/auth/session returns ad_free status in user object
-- - /api/ads/create-order creates Razorpay order, inserts pending purchase record
-- - /api/ads/verify-payment verifies signature, updates user ad_free=true
-- - All ad_free checks happen in Flask template rendering context
-- 
-- TEMPLATE LOGIC:
-- - Check {{ user.ad_free }} in Jinja2 template
-- - If false: render AdSense script + ad units
-- - If true: skip rendering (keep HTML clean, no script injection)
-- 
-- GOOGLE ADSENSE COMPLIANCE:
-- - No ad hiding/showing via JS (use server-side Jinja2 checks)
-- - No click encouragement or manipulation
-- - Responsive <ins> blocks only
-- - Max 3 ad units per page
-- - Proper spacing from buttons/forms
-- ============================================================================
-- ============================================================================
-- 5. CREATE contact_submissions TABLE
-- ============================================================================
-- Stores all contact form submissions from users
CREATE TABLE IF NOT EXISTS contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE
    SET NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'new',
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        response_message TEXT NULL,
        responded_by UUID REFERENCES auth.users(id) ON DELETE
    SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_contact_submissions_user_id ON contact_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_submissions(email);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
-- Enable Row Level Security
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
-- RLS Policy: Users can view their own submissions
CREATE POLICY "users_can_view_own_contact_submissions" ON contact_submissions FOR
SELECT USING (
        auth.uid() = user_id
        OR user_id IS NULL
    );
-- ============================================================================
-- SCHEMA DOCUMENTATION FOR CONTACT SUBMISSIONS
-- ============================================================================
-- FIELDS:
-- - id: Unique identifier for submission
-- - user_id: Linked to authenticated user (nullable for guest submissions)
-- - name: Submitter's full name
-- - email: Submitter's email for follow-up
-- - subject: Type of inquiry (general, technical, billing, feature, bug, feedback, partnership, other)
-- - message: Detailed message from submitter (max 5000 characters)
-- - status: Submission status (new, reading, responded, closed)
-- - ip_address: IP address for spam prevention
-- - user_agent: Browser info for debugging
-- - response_message: Support team's response
-- - responded_by: Support staff who responded
-- - created_at: When submission was received
-- - responded_at: When support team responded
-- - updated_at: Last modification time
-- ============================================================================
-- ============================================================================
-- STREAK TRACKING SYSTEM - SUPABASE MIGRATION
-- ============================================================================
-- This migration creates the streaks table and associated functions
-- Execute this in Supabase SQL Editor
-- ============================================================================
-- Create streaks table
CREATE TABLE IF NOT EXISTS streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0 NOT NULL,
    longest_streak INTEGER DEFAULT 0 NOT NULL,
    last_active_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON streaks(user_id);
-- Enable Row Level Security
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
-- Policy: Users can read their own streaks
CREATE POLICY "Users can view own streak" ON streaks FOR
SELECT USING (auth.uid() = user_id);
-- Policy: Service role can manage all streaks
CREATE POLICY "Service role can manage streaks" ON streaks FOR ALL USING (auth.role() = 'service_role');
-- ============================================================================
-- FUNCTION: update_streak
-- ============================================================================
-- Updates user's streak based on last active date
-- Returns JSON with streak status and motivational message
-- ============================================================================
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID) RETURNS JSON AS $$
DECLARE v_streak_record RECORD;
v_today DATE := CURRENT_DATE;
v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
v_new_streak INTEGER;
v_new_longest INTEGER;
BEGIN -- Get or create streak record
SELECT * INTO v_streak_record
FROM streaks
WHERE user_id = p_user_id;
IF NOT FOUND THEN -- First time user - create record
INSERT INTO streaks (
        user_id,
        current_streak,
        longest_streak,
        last_active_date,
        updated_at
    )
VALUES (p_user_id, 1, 1, v_today, NOW())
RETURNING * INTO v_streak_record;
RETURN json_build_object(
    'success',
    true,
    'current_streak',
    1,
    'longest_streak',
    1,
    'streak_status',
    'started',
    'message',
    'Start your streak today by using your first tool.'
);
END IF;
-- Check if already active today
IF v_streak_record.last_active_date = v_today THEN RETURN json_build_object(
    'success',
    true,
    'current_streak',
    v_streak_record.current_streak,
    'longest_streak',
    v_streak_record.longest_streak,
    'streak_status',
    'maintained',
    'message',
    'Streak maintained for today!'
);
END IF;
-- Check if active yesterday (streak continues)
IF v_streak_record.last_active_date = v_yesterday THEN v_new_streak := v_streak_record.current_streak + 1;
v_new_longest := GREATEST(v_new_streak, v_streak_record.longest_streak);
UPDATE streaks
SET current_streak = v_new_streak,
    longest_streak = v_new_longest,
    last_active_date = v_today,
    updated_at = NOW()
WHERE user_id = p_user_id;
RETURN json_build_object(
    'success',
    true,
    'current_streak',
    v_new_streak,
    'longest_streak',
    v_new_longest,
    'streak_status',
    'continued',
    'message',
    format(
        '🔥 You''ve continued your streak! Day %s in a row!',
        v_new_streak
    )
);
ELSE -- Streak broken - reset to 1
v_new_longest := v_streak_record.longest_streak;
UPDATE streaks
SET current_streak = 1,
    longest_streak = v_new_longest,
    last_active_date = v_today,
    updated_at = NOW()
WHERE user_id = p_user_id;
RETURN json_build_object(
    'success',
    true,
    'current_streak',
    1,
    'longest_streak',
    v_new_longest,
    'streak_status',
    'reset',
    'message',
    'Your streak was reset. Start fresh today! 💪'
);
END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================================
-- FUNCTION: get_streak
-- ============================================================================
-- Retrieves user's current streak data
-- Returns JSON with streak information
-- ============================================================================
CREATE OR REPLACE FUNCTION get_streak(p_user_id UUID) RETURNS JSON AS $$
DECLARE v_streak_record RECORD;
BEGIN
SELECT * INTO v_streak_record
FROM streaks
WHERE user_id = p_user_id;
IF NOT FOUND THEN RETURN json_build_object(
    'success',
    true,
    'current_streak',
    0,
    'longest_streak',
    0,
    'last_active_date',
    NULL,
    'message',
    'No streak yet. Start today!'
);
END IF;
RETURN json_build_object(
    'success',
    true,
    'current_streak',
    v_streak_record.current_streak,
    'longest_streak',
    v_streak_record.longest_streak,
    'last_active_date',
    v_streak_record.last_active_date
);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================================
-- FUTURE EXPANSION: Leaderboard View (Commented Out)
-- ============================================================================
-- Uncomment when implementing leaderboard feature
/*
 CREATE OR REPLACE VIEW streak_leaderboard AS
 SELECT 
 s.user_id,
 s.longest_streak,
 s.current_streak,
 s.last_active_date
 FROM streaks s
 ORDER BY s.longest_streak DESC, s.current_streak DESC
 LIMIT 100;
 */
-- ============================================================================
-- FUTURE EXPANSION: Milestone Rewards Table (Commented Out)
-- ============================================================================
-- Uncomment when implementing milestone rewards
/*
 CREATE TABLE IF NOT EXISTS streak_milestones (
 id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 milestone_days INTEGER NOT NULL,
 reward_credits INTEGER NOT NULL,
 achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 UNIQUE(user_id, milestone_days)
 );
 */
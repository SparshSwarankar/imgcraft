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
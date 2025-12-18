
from datetime import datetime, timedelta, date
import logging
from auth.supabase_client import supabase_admin

logger = logging.getLogger('imgcraft')

class StreakManager:
    """
    Manages user streaks for tool usage.
    Uses direct table access with admin client (bypasses RLS).
    """
    
    @staticmethod
    def get_streak(user_id):
        """
        Get current streak for a user.
        """
        try:
            response = supabase_admin.table('streaks').select('*').eq('user_id', user_id).execute()
            
            if response.data and len(response.data) > 0:
                record = response.data[0]
                logger.debug(f"Got streak for {user_id}: {record}")
                return {
                    'success': True,
                    'current_streak': record.get('current_streak', 0),
                    'longest_streak': record.get('longest_streak', 0),
                    'last_active_date': record.get('last_active_date')
                }
            
            # No record found
            return {
                'success': True,
                'current_streak': 0,
                'longest_streak': 0,
                'last_active_date': None
            }
            
        except Exception as e:
            logger.error(f"Error getting streak for {user_id}: {e}")
            return None

    @staticmethod
    def update_streak(user_id):
        """
        Update streak for a user after a successful action.
        Logic:
        - If last_active == today: Do nothing (already counted)
        - If last_active == yesterday: Increment streak
        - Otherwise: Reset streak to 1
        """
        try:
            today = date.today()
            yesterday = today - timedelta(days=1)
            today_str = today.isoformat()
            yesterday_str = yesterday.isoformat()
            
            # Get existing streak
            response = supabase_admin.table('streaks').select('*').eq('user_id', user_id).execute()
            
            if not response.data or len(response.data) == 0:
                # First time user - create record with streak = 1
                new_record = {
                    'user_id': user_id,
                    'current_streak': 1,
                    'longest_streak': 1,
                    'last_active_date': today_str
                }
                supabase_admin.table('streaks').insert(new_record).execute()
                logger.info(f"Created new streak for {user_id}: 1")
                return {
                    'success': True,
                    'status': 'started',
                    'new_streak': 1,
                    'longest_streak': 1,
                    'message': "🔥 Streak started! Day 1!"
                }
            
            record = response.data[0]
            last_active = record.get('last_active_date')
            current_streak = record.get('current_streak', 0)
            longest_streak = record.get('longest_streak', 0)
            
            # Special case: if streak is 0, start fresh
            if current_streak == 0:
                supabase_admin.table('streaks').update({
                    'current_streak': 1,
                    'longest_streak': max(1, longest_streak),
                    'last_active_date': today_str
                }).eq('user_id', user_id).execute()
                
                logger.info(f"Streak started for {user_id}: 1 (was 0)")
                return {
                    'success': True,
                    'status': 'started',
                    'new_streak': 1,
                    'longest_streak': max(1, longest_streak),
                    'message': "🔥 Streak started! Day 1!"
                }
            
            # Case 1: Already active today
            if last_active == today_str:
                logger.info(f"Streak maintained for {user_id}: {current_streak}")
                return {
                    'success': True,
                    'status': 'maintained',
                    'new_streak': current_streak,
                    'longest_streak': longest_streak,
                    'message': "Streak maintained for today!"
                }
            
            # Case 2: Active yesterday (continue streak)
            if last_active == yesterday_str:
                new_streak = current_streak + 1
                new_longest = max(new_streak, longest_streak)
                
                supabase_admin.table('streaks').update({
                    'current_streak': new_streak,
                    'longest_streak': new_longest,
                    'last_active_date': today_str
                }).eq('user_id', user_id).execute()
                
                logger.info(f"Streak continued for {user_id}: {new_streak}")
                return {
                    'success': True,
                    'status': 'continued',
                    'new_streak': new_streak,
                    'longest_streak': new_longest,
                    'message': f"🔥 Day {new_streak} streak!"
                }
            
            # Case 3: Missed a day (reset streak to 1)
            supabase_admin.table('streaks').update({
                'current_streak': 1,
                'last_active_date': today_str
            }).eq('user_id', user_id).execute()
            
            logger.info(f"Streak reset for {user_id}: 1")
            return {
                'success': True,
                'status': 'reset',
                'new_streak': 1,
                'longest_streak': longest_streak,
                'message': "Streak reset. Day 1! 💪"
            }
            
        except Exception as e:
            logger.error(f"Error updating streak for {user_id}: {e}")
            return {'success': False, 'error': str(e)}

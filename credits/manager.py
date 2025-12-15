"""
Credit management system
Handles credit deduction, addition, and balance queries
"""
import logging
from auth.supabase_client import supabase_admin

logger = logging.getLogger(__name__)


class CreditManager:
    """Manages user credits and tool usage"""
    
    @staticmethod
    def get_balance(user_id: str) -> dict:
        """
        Get user's current credit balance
        
        Args:
            user_id: User UUID
        
        Returns:
            Dictionary with credit information
        """
        try:
            response = supabase_admin.table('user_credits').select('*').eq('user_id', user_id).single().execute()
            return {
                'success': True,
                'data': response.data
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def initialize_credits(user_id: str, initial_credits: int = 10) -> dict:
        """
        Initialize credits for a user if they don't exist
        
        Args:
            user_id: User UUID
            initial_credits: Number of initial credits to give (default: 10)
            
        Returns:
            Dictionary with success status
        """
        try:
            # Check if credits exist
            existing = supabase_admin.table('user_credits').select('id').eq('user_id', user_id).execute()
            
            if existing.data:
                return {'success': True, 'message': 'Credits already initialized'}
                
            # Create new credit record with specified initial credits
            supabase_admin.table('user_credits').insert({
                'user_id': user_id,
                'total_credits': initial_credits,
                'remaining_credits': initial_credits,
                'free_credits': initial_credits
            }).execute()
            
            return {'success': True, 'message': f'Credits initialized with {initial_credits} free credits'}
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to initialize credits: {str(e)}'
            }
    
    @staticmethod
    def deduct_credits(user_id: str, tool_name: str, credits_to_deduct: int) -> dict:
        """
        Deduct credits from user's balance atomically
        Admins bypass credit deduction
        
        Args:
            user_id: User UUID
            tool_name: Name of the tool being used
            credits_to_deduct: Number of credits to deduct
        
        Returns:
            Dictionary with success status and remaining credits
        """
        try:
            # Import admin config
            from admin_config import is_admin
            
            # Get user email to check admin status
            user_response = supabase_admin.auth.admin.get_user_by_id(user_id)
            user_email = user_response.user.email if user_response.user else ''
            
            # Check if user is admin - bypass credit deduction
            if is_admin(user_email):
                # Log usage for admin (0 credits)
                try:
                    logger.info(f"Admin {user_email} using tool: {tool_name}")
                    supabase_admin.table('tool_usage').insert({
                        'user_id': user_id,
                        'tool_name': tool_name,
                        'credits_consumed': 0,
                        'status': 'success'
                    }).execute()
                    logger.info(f"Successfully logged admin tool usage: {tool_name}")
                except Exception as log_error:
                    # Don't fail the operation if logging fails
                    logger.error(f"Failed to log admin usage: {str(log_error)}")
                    print(f"Failed to log admin usage: {str(log_error)}")

                return {
                    'success': True,
                    'message': 'Admin access - no credits deducted',
                    'remaining_credits': 999999
                }
            
            # Call the database function for atomic credit deduction
            logger.info(f"Deducting {credits_to_deduct} credits for user {user_id} using tool {tool_name}")
            response = supabase_admin.rpc(
                'deduct_credits',
                {
                    'p_user_id': user_id,
                    'p_tool_name': tool_name,
                    'p_credits_to_deduct': credits_to_deduct
                }
            ).execute()
            
            result = response.data
            logger.info(f"RPC response: {result}")
            
            if result.get('success'):
                logger.info(f"Credits deducted successfully. Remaining: {result.get('remaining_credits')}")
                return {
                    'success': True,
                    'remaining_credits': result.get('remaining_credits'),
                    'credits_deducted': result.get('credits_deducted')
                }
            else:
                logger.warning(f"Failed to deduct credits: {result.get('error')}")
                return {
                    'success': False,
                    'error': result.get('error'),
                    'remaining_credits': result.get('remaining_credits', 0),
                    'required_credits': result.get('required_credits', credits_to_deduct)
                }
                
        except Exception as e:
            logger.error(f"Exception in deduct_credits: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': f'Failed to deduct credits: {str(e)}'
            }
    
    @staticmethod
    def add_credits(user_id: str, credits_to_add: int) -> dict:
        """
        Add credits to user's balance
        
        Args:
            user_id: User UUID
            credits_to_add: Number of credits to add
        
        Returns:
            Dictionary with success status and new balance
        """
        try:
            # Call the database function to add credits
            response = supabase_admin.rpc(
                'add_credits',
                {
                    'p_user_id': user_id,
                    'p_credits_to_add': credits_to_add
                }
            ).execute()
            
            result = response.data
            
            return {
                'success': True,
                'total_credits': result.get('total_credits'),
                'remaining_credits': result.get('remaining_credits'),
                'credits_added': result.get('credits_added')
            }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to add credits: {str(e)}'
            }
    
    @staticmethod
    def get_usage_history(user_id: str, limit: int = 50) -> dict:
        """
        Get user's tool usage history
        
        Args:
            user_id: User UUID
            limit: Maximum number of records to return
        
        Returns:
            Dictionary with usage history
        """
        try:
            response = supabase_admin.table('tool_usage')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            
            return {
                'success': True,
                'data': response.data
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def log_failed_usage(user_id: str, tool_name: str, error_message: str) -> dict:
        """
        Log a failed tool usage attempt
        
        Args:
            user_id: User UUID
            tool_name: Name of the tool
            error_message: Error message
        
        Returns:
            Dictionary with success status
        """
        try:
            supabase_admin.table('tool_usage').insert({
                'user_id': user_id,
                'tool_name': tool_name,
                'credits_consumed': 0,
                'status': 'failed',
                'error_message': error_message
            }).execute()
            
            return {'success': True}
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


# Create singleton instance
credit_manager = CreditManager()

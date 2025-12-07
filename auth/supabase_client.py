"""
Supabase client configuration and initialization
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

# Validate configuration
if not SUPABASE_URL or not SUPABASE_ANON_KEY or not SUPABASE_SERVICE_KEY:
    raise ValueError(
        "Missing Supabase configuration. Please set SUPABASE_URL, "
        "SUPABASE_ANON_KEY, and SUPABASE_SERVICE_KEY in your .env file"
    )

# Create Supabase clients
# Anon client - for client-side operations (limited permissions)
supabase_anon: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Service client - for server-side operations (full permissions)
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_supabase_client(use_service_role=False) -> Client:
    """
    Get Supabase client instance
    
    Args:
        use_service_role: If True, returns admin client with service role key
                         If False, returns anon client with limited permissions
    
    Returns:
        Supabase Client instance
    """
    return supabase_admin if use_service_role else supabase_anon


def verify_jwt_token(token: str) -> dict:
    """
    Verify JWT token from Supabase Auth
    
    Args:
        token: JWT token string
    
    Returns:
        User data if token is valid
    
    Raises:
        Exception if token is invalid
    """
    try:
        # Use admin client to verify token
        user = supabase_admin.auth.get_user(token)
        return user.user.model_dump() if user.user else None
    except Exception as e:
        raise Exception(f"Invalid token: {str(e)}")


def get_user_by_id(user_id: str) -> dict:
    """
    Get user data by user ID
    
    Args:
        user_id: User UUID
    
    Returns:
        User data dictionary
    """
    try:
        response = supabase_admin.table('user_profiles').select('*').eq('id', user_id).single().execute()
        return response.data
    except Exception as e:
        raise Exception(f"Error fetching user: {str(e)}")


def get_user_credits(user_id: str) -> dict:
    """
    Get user credit balance
    
    Args:
        user_id: User UUID
    
    Returns:
        Credit data dictionary
    """
    try:
        response = supabase_admin.table('user_credits').select('*').eq('user_id', user_id).single().execute()
        return response.data
    except Exception as e:
        raise Exception(f"Error fetching credits: {str(e)}")

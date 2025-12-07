"""
Auth module initialization
"""
from auth.supabase_client import (
    get_supabase_client,
    verify_jwt_token,
    get_user_by_id,
    get_user_credits,
    supabase_admin,
    supabase_anon
)

from auth.middleware import (
    require_auth,
    require_credits,
    optional_auth,
    get_auth_token,
    allow_guest_access
)

__all__ = [
    'get_supabase_client',
    'verify_jwt_token',
    'get_user_by_id',
    'get_user_credits',
    'supabase_admin',
    'supabase_anon',
    'require_auth',
    'require_credits',
    'optional_auth',
    'get_auth_token',
    'allow_guest_access'
]

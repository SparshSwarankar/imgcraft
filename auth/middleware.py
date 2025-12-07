"""
Authentication middleware for Flask
"""
from functools import wraps
from flask import request, jsonify
from auth.supabase_client import verify_jwt_token, get_user_credits


def get_auth_token():
    """
    Extract JWT token from request headers
    
    Returns:
        Token string or None
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    
    # Expected format: "Bearer <token>"
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None
    
    return parts[1]


def require_auth(f):
    """
    Decorator to require authentication for a route
    
    Usage:
        @app.route('/api/protected')
        @require_auth
        def protected_route(current_user):
            return jsonify({'user': current_user})
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_auth_token()
        
        if not token:
            return jsonify({
                'success': False,
                'error': 'No authentication token provided',
                'message': 'Please login to continue'
            }), 401
        
        try:
            # Verify token and get user data
            user_data = verify_jwt_token(token)
            
            if not user_data:
                return jsonify({
                    'success': False,
                    'error': 'Invalid authentication token',
                    'message': 'Please login again'
                }), 401
            
            # Pass user data to the route function
            return f(current_user=user_data, *args, **kwargs)
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': 'Authentication failed',
                'message': str(e)
            }), 401
    
    return decorated_function


def require_credits(credits_needed):
    """
    Decorator to check if user has enough credits
    Admins bypass this check
    
    Usage:
        @app.route('/api/tool')
        @require_auth
        @require_credits(5)
        def tool_route(current_user):
            return jsonify({'success': True})
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user, *args, **kwargs):
            try:
                # Import admin config
                from admin_config import is_admin
                
                # Check if user is admin - bypass credit check
                user_email = current_user.get('email', '')
                if is_admin(user_email):
                    # Admin has unlimited access
                    return f(current_user, *args, **kwargs)
                
                # Get user's credit balance
                credits_data = get_user_credits(current_user['id'])
                remaining_credits = credits_data.get('remaining_credits', 0)
                
                # Check if user has enough credits
                if remaining_credits < credits_needed:
                    return jsonify({
                        'success': False,
                        'error': 'Insufficient credits',
                        'message': f'You need {credits_needed} credits but only have {remaining_credits}',
                        'remaining_credits': remaining_credits,
                        'required_credits': credits_needed
                    }), 402  # 402 Payment Required
                
                # Pass to the route function
                return f(current_user=current_user, *args, **kwargs)
                
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': 'Failed to check credits',
                    'message': str(e)
                }), 500
        
        return decorated_function
    return decorator


def optional_auth(f):
    """
    Decorator for routes that work with or without authentication
    If authenticated, passes user data; if not, passes None
    
    Usage:
        @app.route('/api/public')
        @optional_auth
        def public_route(current_user):
            if current_user:
                return jsonify({'message': 'Hello ' + current_user['email']})
            return jsonify({'message': 'Hello guest'})
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_auth_token()
        
        if not token:
            # No token provided, pass None as current_user
            return f(current_user=None, *args, **kwargs)
        
        try:
            # Verify token and get user data
            user_data = verify_jwt_token(token)
            return f(current_user=user_data, *args, **kwargs)
        except:
            # Invalid token, pass None as current_user
            return f(current_user=None, *args, **kwargs)
    
    return decorated_function


def allow_guest_access(tool_name):
    """
    Decorator for routes that allow guest access for specific free tools
    If the tool is in FREE_TOOLS, allows access without auth
    Otherwise, requires auth and credits
    
    Usage:
        @app.route('/api/resize')
        @allow_guest_access('resize')
        def resize_route(current_user):
            # current_user will be None for guests using free tools
            return jsonify({'success': True})
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from credits.tool_costs import FREE_TOOLS, get_tool_cost
            
            token = get_auth_token()
            
            # If tool is free and no token provided, allow guest access
            if tool_name in FREE_TOOLS and not token:
                return f(current_user=None, *args, **kwargs)
            
            # If token provided, verify it
            if token:
                try:
                    user_data = verify_jwt_token(token)
                    if user_data:
                        # Check credits for authenticated users
                        credits_needed = get_tool_cost(tool_name)
                        credits_data = get_user_credits(user_data['id'])
                        remaining_credits = credits_data.get('remaining_credits', 0)
                        
                        if remaining_credits < credits_needed:
                            return jsonify({
                                'success': False,
                                'error': 'Insufficient credits',
                                'message': f'You need {credits_needed} credits but only have {remaining_credits}',
                                'remaining_credits': remaining_credits,
                                'required_credits': credits_needed
                            }), 402
                        
                        return f(current_user=user_data, *args, **kwargs)
                except Exception as e:
                    # Invalid token, treat as guest if tool is free
                    if tool_name in FREE_TOOLS:
                        return f(current_user=None, *args, **kwargs)
                    return jsonify({
                        'success': False,
                        'error': 'Authentication failed',
                        'message': str(e)
                    }), 401
            
            # No token and tool is not free - require auth
            if tool_name not in FREE_TOOLS:
                return jsonify({
                    'success': False,
                    'error': 'Authentication required',
                    'message': 'Please login to use this tool'
                }), 401
            
            # Fallback to guest access for free tools
            return f(current_user=None, *args, **kwargs)
        
        return decorated_function
    return decorator

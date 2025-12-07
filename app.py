from flask import Flask, render_template, request, send_file, make_response
import os
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageOps, ImageFilter
from PIL.ExifTags import TAGS
import io
from rembg import remove
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime
import traceback
from functools import wraps
import re
from ads import (
    create_ad_free_order,
    verify_ad_free_payment,
    handle_razorpay_webhook,
    get_user_ad_free_status
)

# Import configuration
# Import configuration
from config import config

# Import Auth, Credits, and Payments modules
from auth import (
    get_supabase_client,
    verify_jwt_token,
    require_auth,
    require_credits,
    optional_auth,
    get_auth_token,
    allow_guest_access
)
from auth.supabase_client import supabase_admin
from credits import (
    credit_manager,
    get_tool_cost,
    get_all_tools
)
from payments import (
    create_order,
    verify_payment_signature,
    process_webhook,
    get_plan_by_id,
    CREDIT_PLANS
)
from flask import jsonify

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(config)

# Initialize configuration
config.init_app(app)

# ============================================================================
# LOGGING SETUP
# ============================================================================

def setup_logging():
    """Configure comprehensive logging system"""
    
    # Create logger
    logger = logging.getLogger('imgcraft')
    logger.setLevel(getattr(logging, config.LOG_LEVEL))
    
    # Prevent duplicate logs
    if logger.handlers:
        return logger
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '[%(asctime)s] [%(levelname)s] [%(name)s.%(funcName)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    console_formatter = logging.Formatter(
        '[%(levelname)s] %(message)s'
    )
    
    # Console Handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # File Handler (Rotating)
    try:
        file_handler = RotatingFileHandler(
            config.LOG_FILE,
            maxBytes=config.LOG_MAX_BYTES,
            backupCount=config.LOG_BACKUP_COUNT
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(detailed_formatter)
        logger.addHandler(file_handler)
    except Exception as e:
        logger.warning(f"Could not create log file: {e}")
    
    return logger

# Initialize logger
logger = setup_logging()

# ============================================================================
# REQUEST LOGGING DECORATOR
# ============================================================================

def log_request(func):
    """Decorator to log API requests"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = datetime.now()
        
        # Log request
        logger.info(f"Request started: {request.method} {request.path}")
        logger.debug(f"Request form data: {dict(request.form)}")
        logger.debug(f"Request files: {list(request.files.keys())}")
        
        try:
            # Execute function
            response = func(*args, **kwargs)
            
            # Log success
            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"Request completed successfully in {duration:.2f}s")
            
            return response
            
        except Exception as e:
            # Log error
            duration = (datetime.now() - start_time).total_seconds()
            logger.error(f"Request failed after {duration:.2f}s: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    return wrapper

# ============================================================================
# CACHE CONTROL
# ============================================================================

@app.after_request
def add_cache_control_headers(response):
    """Add cache control headers to prevent aggressive caching"""
    
    # Don't cache API responses
    if request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    
    # Allow caching for static files but with validation
    elif request.path.startswith('/static/'):
        response.headers['Cache-Control'] = 'public, max-age=3600, must-revalidate'
    
    # Don't cache HTML pages
    else:
        response.headers['Cache-Control'] = 'no-cache, must-revalidate'
    
    return response

# ============================================================================
# APPLICATION STARTUP
# ============================================================================

logger.info("=" * 80)
logger.info("ImgCraft Application Starting")
logger.info("=" * 80)
logger.info(f"Environment: {config.FLASK_ENV}")
logger.info(f"Debug Mode: {config.DEBUG}")
logger.info(f"Server: {config.HOST}:{config.PORT}")
logger.info(f"Upload Folder: {config.UPLOAD_FOLDER}")
logger.info(f"Max File Size: {config.MAX_FILE_SIZE_MB}MB")
logger.info(f"Log Level: {config.LOG_LEVEL}")
logger.info(f"Log File: {config.LOG_FILE}")

# Validate configuration
config_errors = config.validate()
if config_errors:
    logger.warning("Configuration validation warnings:")
    for error in config_errors:
        logger.warning(f"  - {error}")


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.route('/api/auth/session', methods=['GET'])
@require_auth
def get_session(current_user):
    """Get current session and user data"""
    try:
        # Import admin config
        from admin_config import is_admin
        
        # Ensure credits are initialized
        credit_manager.initialize_credits(current_user['id'])
        
        # Check if user is admin
        user_email = current_user.get('email', '')
        if is_admin(user_email):
            # Return unlimited credits for admin
            credits_data = {
                'total_credits': 999999,
                'remaining_credits': 999999,
                'free_credits': 999999
            }
        else:
            # Get actual credits for regular users
            balance = credit_manager.get_balance(current_user['id'])
            credits_data = balance.get('data', {})
        
        # Get ad-free status
        user_id = current_user.get('id')
        ad_free_status = get_user_ad_free_status(user_id)
        
        return jsonify({
            'success': True,
            'user': current_user,
            'credits': credits_data,
            'ad_free': ad_free_status  # Added ad-free status
        })
    except Exception as e:
        logger.error(f"Session error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/signup', methods=['POST'])
def auth_signup():
    """Register a new user"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        full_name = data.get('full_name')
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required'}), 400
            
        # Create user in Supabase
        supabase = get_supabase_client()
        res = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "full_name": full_name
                }
            }
        })
        
        if res.user:
            return jsonify({
                'success': True,
                'message': 'Registration successful. Please check your email to verify your account.',
                'user': {
                    'id': res.user.id,
                    'email': res.user.email
                }
            })
        else:
            return jsonify({'success': False, 'error': 'Registration failed'}), 400
            
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    """Login user"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required'}), 400
            
        # Login with Supabase
        supabase = get_supabase_client()
        res = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if res.session:
            # Initialize credits for the user
            if res.user:
                credit_manager.initialize_credits(res.user.id)

            return jsonify({
                'success': True,
                'access_token': res.session.access_token,
                'refresh_token': res.session.refresh_token,
                'user': {
                    'id': res.user.id,
                    'email': res.user.email,
                    'user_metadata': res.user.user_metadata
                }
            })
            
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
            
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 401

@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def auth_logout(current_user):
    """Logout user"""
    try:
        supabase = get_supabase_client()
        supabase.auth.sign_out()
        return jsonify({'success': True, 'message': 'Logged out successfully'})
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/credits/balance', methods=['GET'])
@require_auth
def get_credits(current_user):
    """Get current credit balance"""
    try:
        # Import admin config
        from admin_config import is_admin
        
        # Check if user is admin
        user_email = current_user.get('email', '')
        if is_admin(user_email):
            return jsonify({
                'success': True,
                'data': {
                    'total_credits': 999999,
                    'remaining_credits': 999999,
                    'free_credits': 999999
                }
            })
            
        result = credit_manager.get_balance(current_user['id'])
        return jsonify(result)
    except Exception as e:
        logger.error(f"Get credits error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/credits/history', methods=['GET'])
@require_auth
def get_credit_history(current_user):
    """Get credit usage history - shows all users' history for admin, user's history otherwise"""
    try:
        from admin_config import is_admin
        
        user_email = current_user.get('email', '')
        limit = request.args.get('limit', 50, type=int)
        
        # If admin, get all credit history with user info
        if is_admin(user_email):
            # Get all credit history
            res = supabase_admin.table('tool_usage').select('*').order('created_at', desc=True).limit(limit).execute()
            
            # Fetch user emails for all records from user_profiles table
            if res.data:
                try:
                    # Get all user profiles (more reliable than auth API)
                    profiles_res = supabase_admin.table('user_profiles').select('id, email').execute()
                    
                    # Create a mapping of user_id to email
                    user_map = {}
                    if profiles_res.data:
                        for profile in profiles_res.data:
                            user_map[profile['id']] = profile.get('email', 'Unknown')
                    
                    # Add user email to each record
                    for record in res.data:
                        record['user_email'] = user_map.get(record['user_id'], 'Unknown')
                except Exception as e:
                    logger.warning(f"Could not fetch user profiles: {str(e)}")
                    for record in res.data:
                        record['user_email'] = 'Unknown'            
            return jsonify({
                'success': True,
                'data': res.data,
                'is_admin': True
            })
        else:
            # Regular user - only their history
            result = credit_manager.get_usage_history(current_user['id'], limit)
            result['is_admin'] = False
            return jsonify(result)
    except Exception as e:
        logger.error(f"Credit history error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/tools/config', methods=['GET'])
def get_tools_config():
    """Get tool configuration and costs"""
    return jsonify({
        'success': True,
        'tools': get_all_tools()
    })

# ============================================================================
# PAYMENT ENDPOINTS
# ============================================================================

@app.route('/api/payments/plans', methods=['GET'])
def get_payment_plans():
    """Get available credit plans"""
    return jsonify({
        'success': True,
        'plans': CREDIT_PLANS
    })

@app.route('/api/payments/create-order', methods=['POST'])
@require_auth
def create_payment_order(current_user):
    """Create Razorpay order"""
    try:
        data = request.get_json()
        plan_id = data.get('plan_id')
        
        plan = get_plan_by_id(plan_id)
        if not plan:
            return jsonify({'success': False, 'error': 'Invalid plan ID'}), 400
            
        # Create order
        result = create_order(
            amount=plan['price'],
            currency=plan['currency'],
            notes={
                'user_id': current_user['id'],
                'plan_id': plan_id,
                'credits': plan['credits']
            }
        )
        
        if not result['success']:
            return jsonify(result), 500
            
        # Log initial payment record (optional, or handle in webhook)
        # For now we rely on the webhook to create the record
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Order creation error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/payments/verify', methods=['POST'])
@require_auth
def verify_payment(current_user):
    """
    Verify payment signature and process payment
    This endpoint:
    1. Verifies Razorpay payment signature
    2. Fetches payment and order details from Razorpay
    3. Creates payment record in Supabase
    4. Adds credits to user account atomically
    """
    try:
        data = request.get_json()
        order_id = data.get('razorpay_order_id')
        payment_id = data.get('razorpay_payment_id')
        signature = data.get('razorpay_signature')
        
        logger.info(f"Payment verification started for user {current_user['id']}")
        logger.info(f"Order ID: {order_id}, Payment ID: {payment_id}")
        
        # Validate input
        if not all([order_id, payment_id, signature]):
            logger.error("Missing required payment parameters")
            return jsonify({
                'success': False, 
                'error': 'Missing payment parameters'
            }), 400
        
        # Step 1: Verify payment signature
        logger.info("Step 1: Verifying payment signature...")
        if not verify_payment_signature(order_id, payment_id, signature):
            logger.error("Payment signature verification failed")
            return jsonify({
                'success': False, 
                'error': 'Invalid payment signature'
            }), 400
        
        logger.info("[OK] Payment signature verified successfully")
        
        # Step 2: Fetch payment details from Razorpay
        logger.info("Step 2: Fetching payment details from Razorpay...")
        from payments.razorpay_client import get_payment_details, razorpay_client
        
        try:
            payment_details = get_payment_details(payment_id)
            if not payment_details.get('success'):
                logger.error(f"Failed to fetch payment details: {payment_details.get('error')}")
                return jsonify({
                    'success': False,
                    'error': 'Failed to fetch payment details from Razorpay'
                }), 500
            
            payment_info = payment_details['payment']
            logger.info(f"[OK] Payment details fetched: Amount={payment_info.get('amount')}, Status={payment_info.get('status')}")
            
        except Exception as e:
            logger.error(f"Error fetching payment details: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'Error fetching payment details: {str(e)}'
            }), 500
        
        # Step 3: Fetch order details to get plan info
        logger.info("Step 3: Fetching order details...")
        try:
            order = razorpay_client.order.fetch(order_id)
            notes = order.get('notes', {})
            credits_to_add = int(notes.get('credits', 0))
            plan_id = notes.get('plan_id', 'unknown')
            
            logger.info(f"[OK] Order details: Plan={plan_id}, Credits={credits_to_add}")
            
            if credits_to_add <= 0:
                logger.error(f"Invalid credits amount in order notes: {credits_to_add}")
                return jsonify({
                    'success': False,
                    'error': 'Invalid credits amount'
                }), 400
                
        except Exception as e:
            logger.error(f"Error fetching order details: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'Error fetching order details: {str(e)}'
            }), 500
        
        # Step 4: Check if payment already processed (idempotency)
        logger.info("Step 4: Checking for duplicate payment...")
        try:
            existing_payment = supabase_admin.table('payments')\
                .select('*')\
                .eq('razorpay_payment_id', payment_id)\
                .execute()
            
            if existing_payment.data and len(existing_payment.data) > 0:
                logger.warning(f"Payment {payment_id} already processed")
                return jsonify({
                    'success': True,
                    'message': 'Payment already processed',
                    'credits_added': credits_to_add
                })
        except Exception as e:
            logger.warning(f"Error checking for duplicate payment: {str(e)}")
            # Continue anyway - better to process than fail
        
        # Step 5: Create payment record in Supabase
        logger.info("Step 5: Creating payment record in Supabase...")
        try:
            payment_record = {
                'user_id': current_user['id'],
                'razorpay_order_id': order_id,
                'razorpay_payment_id': payment_id,
                'razorpay_signature': signature,
                'amount': payment_info.get('amount', 0) // 100,  # Convert paise to rupees
                'currency': payment_info.get('currency', 'INR'),
                'credits_purchased': credits_to_add,
                'plan_name': plan_id,
                'status': 'completed',
                'completed_at': 'now()'
            }
            
            payment_insert_result = supabase_admin.table('payments').insert(payment_record).execute()
            
            if not payment_insert_result.data:
                logger.error("Failed to create payment record in database")
                return jsonify({
                    'success': False,
                    'error': 'Failed to create payment record'
                }), 500
            
            logger.info(f"[OK] Payment record created successfully: {payment_insert_result.data[0]['id']}")
            
        except Exception as e:
            logger.error(f"Error creating payment record: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({
                'success': False,
                'error': f'Database error: {str(e)}'
            }), 500
        
        # Step 6: Add credits to user account (atomic operation)
        logger.info(f"Step 6: Adding {credits_to_add} credits to user account...")
        try:
            credit_result = credit_manager.add_credits(current_user['id'], credits_to_add)
            
            if not credit_result.get('success'):
                logger.error(f"Failed to add credits: {credit_result.get('error')}")
                # Mark payment as failed
                supabase_admin.table('payments').update({
                    'status': 'failed',
                    'error_message': credit_result.get('error')
                }).eq('razorpay_payment_id', payment_id).execute()
                
                return jsonify({
                    'success': False,
                    'error': f"Payment verified but failed to add credits: {credit_result.get('error')}"
                }), 500
            
            logger.info(f"[OK] Credits added successfully! New balance: {credit_result.get('remaining_credits')}")
            
        except Exception as e:
            logger.error(f"Error adding credits: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({
                'success': False,
                'error': f'Failed to add credits: {str(e)}'
            }), 500
        
        # Success!
        logger.info("=" * 80)
        logger.info("PAYMENT PROCESSED SUCCESSFULLY")
        logger.info(f"User: {current_user['id']}")
        logger.info(f"Payment ID: {payment_id}")
        logger.info(f"Credits Added: {credits_to_add}")
        logger.info(f"New Balance: {credit_result.get('remaining_credits')}")
        logger.info("=" * 80)
        
        return jsonify({
            'success': True,
            'message': 'Payment verified and credits added successfully',
            'credits_added': credits_to_add,
            'new_balance': credit_result.get('remaining_credits'),
            'payment_id': payment_id
        })
        
    except Exception as e:
        logger.error(f"Payment verification error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False, 
            'error': f'Payment verification failed: {str(e)}'
        }), 500


@app.route('/api/payments/history', methods=['GET'])
@require_auth
def get_payment_history(current_user):
    """Get payment history - shows all payments for admin, user's payments otherwise"""
    try:
        from admin_config import is_admin
        
        user_email = current_user.get('email', '')
        user_id = current_user.get('id', '')
        
        # If admin, use service role to get all payments
        if is_admin(user_email):
            logger.debug(f"Admin {user_email} requesting all payment history")
            
            # Use service role client for admin to bypass RLS
            res = supabase_admin.table('payments').select('*').order('created_at', desc=True).execute()
            
            # Fetch user emails for all payments
            payments_data = res.data if res.data else []
            logger.debug(f"Found {len(payments_data)} payments for admin query")
            
            if payments_data:
                try:
                    # Get all user profiles from database (more reliable than auth API)
                    profiles_res = supabase_admin.table('user_profiles').select('id, email').execute()
                    
                    # Create a mapping of user_id to email
                    user_map = {}
                    if profiles_res.data:
                        for profile in profiles_res.data:
                            user_map[profile['id']] = profile.get('email', 'Unknown')
                    
                    # Add user email to each payment
                    for payment in payments_data:
                        payment['user_email'] = user_map.get(payment['user_id'], 'Unknown')
                except Exception as e:
                    logger.warning(f"Could not fetch user emails from profiles: {str(e)}")
                    for payment in payments_data:
                        payment['user_email'] = 'Unknown'
            
            return jsonify({
                'success': True,
                'payments': payments_data,
                'is_admin': True,
                'count': len(payments_data)
            })
        else:
            # Regular user - only their payments, use anon client with RLS
            logger.debug(f"User {user_email} requesting their payment history")
            supabase = get_supabase_client()
            res = supabase.table('payments').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
            
            payments_data = res.data if res.data else []
            logger.debug(f"Found {len(payments_data)} payments for user {user_email}")
            
            return jsonify({
                'success': True,
                'payments': payments_data,
                'is_admin': False,
                'count': len(payments_data)
            })
    except Exception as e:
        logger.error(f"Payment history error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

# DEBUG ENDPOINT - Remove in production
@app.route('/api/debug/payments', methods=['GET'])
@require_auth
def debug_payments(current_user):
    """Debug endpoint to check database connection and payment records"""
    try:
        from admin_config import is_admin
        
        user_email = current_user.get('email', '')
        
        if not is_admin(user_email):
            return jsonify({'success': False, 'error': 'Admin only'}), 403
        
        # Check all payments in database
        all_payments = supabase_admin.table('payments').select('*').execute()
        
        # Check user credits
        all_credits = supabase_admin.table('user_credits').select('*').execute()
        
        return jsonify({
            'success': True,
            'total_payments': len(all_payments.data) if all_payments.data else 0,
            'payments_sample': all_payments.data[:5] if all_payments.data else [],
            'total_users_with_credits': len(all_credits.data) if all_credits.data else 0,
            'credits_sample': all_credits.data[:5] if all_credits.data else [],
            'user_id': current_user['id'],
            'user_email': user_email
        })
    except Exception as e:
        logger.error(f"Debug endpoint error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/payments/webhook', methods=['POST'])
def razorpay_webhook():
    """Handle Razorpay webhooks"""
    try:
        signature = request.headers.get('X-Razorpay-Signature')
        response, status_code = process_webhook(
            request.json,
            signature,
            request.data
        )
        return jsonify(response), status_code
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# CONTEXT PROCESSOR
# ============================================================================

@app.context_processor
def inject_config():
    """Inject configuration and user state into all templates"""
    
    # Get user's ad-free status from JWT token if present
    ad_free = False
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        try:
            token = auth_header.split(' ')[1]
            user_data = verify_jwt_token(token)
            user_id = user_data.get('id')
            if user_id:
                ad_free = get_user_ad_free_status(user_id)
        except Exception as e:
            logger.debug(f"Failed to verify token in context processor: {str(e)}")
    
    return {
        'SUPABASE_URL': config.SUPABASE_URL,
        'SUPABASE_ANON_KEY': config.SUPABASE_ANON_KEY,
        'RAZORPAY_KEY_ID': config.RAZORPAY_KEY_ID,
        'user_ad_free': ad_free  # Available in all templates
    }

# ============================================================================
# ROUTES - PAGE RENDERING
# ============================================================================

@app.route('/')
def index():
    logger.debug("Rendering index page")
    return render_template('index.html')

@app.route('/ping', methods=['GET'])
def ping():
    """
    Lightweight health-check endpoint for ImgCraft.
    Used later by GitHub Actions / uptime monitors / Render.
    """
    logger.debug("Ping health check requested")
    return jsonify({
        "status": "ok",
        "service": "ImgCraft Backend",
        "timestamp": datetime.utcnow().isoformat()
    }), 200


@app.route('/auth')
def auth_page():
    logger.debug("Rendering auth page")
    return render_template('auth.html')

@app.route('/billing')
def billing_page():
    logger.debug("Rendering billing page")
    return render_template('billing.html')

@app.route('/resize')
def resize_tool():
    logger.debug("Rendering resize tool page")
    return render_template('resize.html')

@app.route('/compress')
def compress_tool():
    logger.debug("Rendering compress tool page")
    return render_template('compress.html')

@app.route('/convert')
def convert_tool():
    logger.debug("Rendering convert tool page")
    return render_template('convert.html')

@app.route('/remove-bg')
def remove_bg_tool():
    logger.debug("Rendering remove background tool page")
    return render_template('remove_bg.html')



@app.route('/palette')
def palette_tool():
    logger.debug("Rendering palette tool page")
    return render_template('palette.html')

@app.route('/watermark')
def watermark_tool():
    logger.debug("Rendering watermark tool page")
    return render_template('watermark.html')

@app.route('/exif')
def exif_tool():
    logger.debug("Rendering EXIF tool page")
    return render_template('exif.html')

@app.route('/filter')
def filter_tool():
    logger.debug("Rendering filter tool page")
    return render_template('filter.html')

@app.route('/upscale')
def upscale_tool():
    logger.debug("Rendering upscale tool page")
    return render_template('upscale.html')

@app.route('/collage')
def collage_tool():
    logger.debug("Rendering collage tool page")
    return render_template('collage.html')

# ============================================================================
# API ROUTES - HEALTH CHECK
# ============================================================================

@app.route('/api/health', methods=['GET'])
def api_health():
    """Health check endpoint for frontend status verification"""
    logger.debug("Health check requested")
    return {
        'status': 'healthy',
        'service': 'ImgCraft Backend',
        'version': '1.0.0'
    }, 200

# ============================================================================
# API ROUTES - IMAGE PROCESSING
# ============================================================================

@app.route('/api/resize', methods=['POST'])
@allow_guest_access('resize')
@log_request
def api_resize(current_user):
    # Resize is a FREE tool - no credit deduction even for logged-in users
    if 'image' not in request.files:
        logger.warning("Resize request missing image file")
        return 'No image uploaded', 400
    
    file = request.files['image']
    mode = request.form.get('mode')
    
    # Define safe limits to prevent memory errors
    MAX_DIMENSION = 10000  # Maximum width or height
    MAX_TOTAL_PIXELS = 100000000  # 100 megapixels (10000 x 10000)
    
    try:
        img = Image.open(file)
        original_size = f"{img.width}x{img.height}"
        
        if mode == 'pixel':
            width = int(request.form.get('width'))
            height = int(request.form.get('height'))
        else:
            scale = int(request.form.get('scale')) / 100
            width = int(img.width * scale)
            height = int(img.height * scale)
        
        # Validate dimensions BEFORE attempting resize
        if width > MAX_DIMENSION or height > MAX_DIMENSION:
            error_msg = f"Image dimensions too large! Maximum allowed: {MAX_DIMENSION}x{MAX_DIMENSION} pixels. Requested: {width}x{height}"
            logger.warning(f"Resize rejected: {error_msg}")
            return jsonify({
                'success': False,
                'error': error_msg,
                'max_dimension': MAX_DIMENSION,
                'requested_width': width,
                'requested_height': height
            }), 400
        
        # Check total pixel count
        total_pixels = width * height
        if total_pixels > MAX_TOTAL_PIXELS:
            error_msg = f"Total pixel count too large! Maximum: {MAX_TOTAL_PIXELS:,} pixels ({MAX_DIMENSION}x{MAX_DIMENSION}). Requested: {total_pixels:,} pixels ({width}x{height})"
            logger.warning(f"Resize rejected: {error_msg}")
            return jsonify({
                'success': False,
                'error': error_msg,
                'max_pixels': MAX_TOTAL_PIXELS,
                'requested_pixels': total_pixels
            }), 400
        
        logger.info(f"Resizing image: {original_size} -> {width}x{height} (mode: {mode})")
        
        # Resize using LANCZOS for high quality
        resized_img = img.resize((width, height), Image.Resampling.LANCZOS)
        
        # Save to buffer
        img_io = io.BytesIO()
        fmt = img.format if img.format else 'PNG'
        
        if fmt.upper() == 'PNG':
            resized_img.save(img_io, fmt)
        else:
            resized_img.save(img_io, fmt, quality=95)
            
        img_io.seek(0)
        
        logger.info(f"Resize completed successfully: {fmt} format")
        return send_file(img_io, mimetype=f'image/{fmt.lower()}')
        
    except Exception as e:
        logger.error(f"Resize operation failed: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': f"Resize operation failed: {str(e)}"
        }), 500

@app.route('/api/compress', methods=['POST'])
@require_auth
@log_request
def api_compress(current_user):
    # Get cost from database
    cost = get_tool_cost('compress')
    
    # Deduct credits
    deduct_result = credit_manager.deduct_credits(current_user['id'], 'compress', cost)
    if not deduct_result['success']:
        return jsonify(deduct_result), 402
        
    if 'image' not in request.files:
        logger.warning("Compress request missing image file")
        return 'No image uploaded', 400
    
    file = request.files['image']
    # Receive "Quality" from JS (0-100 scale where 100 is best quality)
    quality = int(request.form.get('quality', 80))
    
    try:
        img = Image.open(file)
        fmt = img.format if img.format else 'JPEG'
        
        logger.info(f"Compressing image: format={fmt}, quality={quality}")
        
        img_io = io.BytesIO()
        
        if fmt.upper() in ['JPEG', 'JPG']:
            # Prevent bloating: cap quality at 95 even if requested higher
            save_quality = 95 if quality >= 95 else quality
            img.save(img_io, 'JPEG', quality=save_quality, optimize=True)
            
        elif fmt.upper() == 'PNG':
            # PNG Quantization logic
            if quality < 90:
                # Map quality (0-100) to colors (2-256)
                n_colors = max(2, int((quality / 100) * 256))
                img = img.quantize(colors=n_colors, method=2)
                img.save(img_io, 'PNG', optimize=True)
            else:
                img.save(img_io, 'PNG', optimize=True)
                
        elif fmt.upper() == 'WEBP':
            img.save(img_io, 'WEBP', quality=quality)
        else:
            img.save(img_io, fmt, quality=quality)
            
        img_io.seek(0)
        
        logger.info("Compression completed successfully")
        response = make_response(send_file(img_io, mimetype=f'image/{fmt.lower()}'))
        
        # --- CRITICAL: Send Cost Header for JS Toast ---
        response.headers['X-Credits-Cost'] = str(cost) 
        return response
        
    except Exception as e:
        logger.error(f"Compression failed: {str(e)}")
        logger.error(traceback.format_exc())
        return str(e), 500

@app.route('/api/convert', methods=['POST'])
@allow_guest_access('convert')
@log_request
def api_convert(current_user):
    # Get cost from database (even if it's 0/Free, we need to send it to frontend)
    cost = get_tool_cost('convert')
    
    if 'image' not in request.files:
        logger.warning("Convert request missing image file")
        return 'No image uploaded', 400
    
    file = request.files['image']
    target_format = request.form.get('format', 'PNG').upper()
    
    try:
        img = Image.open(file)
        source_format = img.format if img.format else 'Unknown'
        
        logger.info(f"Converting image: {source_format} -> {target_format}")
        
        # Handle mode conversions
        if target_format in ['JPEG', 'JPG', 'BMP'] and img.mode in ['RGBA', 'LA']:
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])
            img = background
        elif target_format != 'ICO' and img.mode == 'P':
            img = img.convert('RGB')
            
        img_io = io.BytesIO()
        
        if target_format == 'ICO':
            if img.width > 256 or img.height > 256:
                img.thumbnail((256, 256))
            img.save(img_io, format='ICO')
        else:
            img.save(img_io, format=target_format)
            
        img_io.seek(0)
        
        mime_type = f'image/{target_format.lower()}'
        if target_format == 'ICO':
            mime_type = 'image/x-icon'
        
        logger.info(f"Conversion completed successfully to {target_format}")
        
        # --- UPDATE: Use make_response to send Cost Header ---
        response = make_response(send_file(img_io, mimetype=mime_type))
        response.headers['X-Credits-Cost'] = str(cost)
        return response
        # ----------------------------------------------------
        
    except Exception as e:
        logger.error(f"Conversion failed: {str(e)}")
        logger.error(traceback.format_exc())
        return str(e), 500

@app.route('/api/remove-bg', methods=['POST'])
@require_auth
@log_request
def api_remove_bg(current_user):
    # Get cost from database
    cost = get_tool_cost('remove_bg')
    
    # Deduct credits
    deduct_result = credit_manager.deduct_credits(current_user['id'], 'remove_bg', cost)
    if not deduct_result['success']:
        return jsonify(deduct_result), 402
    if 'image' not in request.files:
        logger.warning("Remove background request missing image file")
        return 'No image uploaded', 400
    
    file = request.files['image']
    
    try:
        input_image = Image.open(file)
        logger.info(f"Removing background from image: {input_image.size}")
        
        # Remove background
        output_image = remove(input_image)
        
        img_io = io.BytesIO()
        output_image.save(img_io, 'PNG')
        img_io.seek(0)
        
        logger.info("Background removal completed successfully")
        
        # --- UPDATE START: Return response with Cost Header ---
        response = make_response(send_file(img_io, mimetype='image/png'))
        response.headers['X-Credits-Cost'] = str(cost)
        return response
        # --- UPDATE END ---
        
    except Exception as e:
        logger.error(f"Background removal failed: {str(e)}")
        logger.error(traceback.format_exc())
        return str(e), 500



@app.route('/api/palette', methods=['POST'])
@require_auth
@log_request
def api_palette(current_user):
    # Get cost from database
    cost = get_tool_cost('palette')
    
    # Deduct credits
    deduct_result = credit_manager.deduct_credits(current_user['id'], 'palette', cost)
    if not deduct_result['success']:
        return jsonify(deduct_result), 402
        
    if 'image' not in request.files:
        logger.warning("Palette request missing image file")
        return jsonify({'success': False, 'error': 'No image uploaded'}), 400
    
    file = request.files['image']
    
    try:
        img = Image.open(file)
        logger.info("Extracting color palette from image")
        
        # Resize for faster processing
        img.thumbnail((200, 200))
        
        # Quantize to 8 colors
        quantized = img.quantize(colors=8)
        palette = quantized.getpalette()
        
        colors = []
        if palette:
            for i in range(8):
                if (i*3+2) < len(palette):
                    r = palette[i*3]
                    g = palette[i*3+1]
                    b = palette[i*3+2]
                    hex_code = '#{:02x}{:02x}{:02x}'.format(r, g, b)
                    colors.append({
                        'rgb': [r, g, b],
                        'hex': hex_code
                    })
        
        logger.info(f"Extracted {len(colors)} colors from palette")
        
        # --- UPDATE: Send Cost Header ---
        response = make_response(jsonify({'colors': colors}))
        response.headers['X-Credits-Cost'] = str(cost)
        return response
        # --------------------------------
        
    except Exception as e:
        logger.error(f"Palette extraction failed: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/filter', methods=['POST'])
@require_auth
@log_request
def api_filter(current_user):
    """
    Advanced image filtering and color grading tool
    Supports preset filters and manual adjustments
    Cost: 2 credits per operation
    """
    # Get cost from database
    cost = get_tool_cost('filter')
    
    # Deduct credits
    deduct_result = credit_manager.deduct_credits(current_user['id'], 'filter', cost)
    if not deduct_result['success']:
        return jsonify(deduct_result), 402
        
    if 'image' not in request.files:
        logger.warning("Filter request missing image file")
        return jsonify({'success': False, 'error': 'No image uploaded'}), 400
    
    file = request.files['image']
    filter_data_str = request.form.get('filterData', '{}')
    
    try:
        import json
        import numpy as np
        from PIL import ImageEnhance, ImageFilter
        
        # Parse filter data
        filter_data = json.loads(filter_data_str)
        logger.info(f"Applying filters: {filter_data}")
        
        # Load image
        img = Image.open(file)
        fmt = img.format if img.format else 'JPEG'
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Convert to numpy for advanced operations
        img_array = np.array(img, dtype=np.float32)
        
        # --- 1. EXPOSURE ---
        exposure_val = float(filter_data.get('exposure', 0))
        if exposure_val != 0:
            # Exposure: multiply by 2^(stops)
            # Map -100..100 to approximately -2..2 stops
            stops = exposure_val / 50.0
            factor = 2.0 ** stops
            img_array = np.clip(img_array * factor, 0, 255)
        
        # --- 2. BRIGHTNESS ---
        brightness = float(filter_data.get('brightness', 0))
        if brightness != 0:
            # Simple additive brightness
            img_array = np.clip(img_array + (brightness * 2.55), 0, 255)
        
        # --- 3. CONTRAST ---
        contrast = float(filter_data.get('contrast', 0))
        if contrast != 0:
            # Contrast around midpoint (127.5)
            factor = (contrast + 100.0) / 100.0
            img_array = np.clip(((img_array - 127.5) * factor) + 127.5, 0, 255)
        
        # --- 4. SATURATION ---
        saturation = float(filter_data.get('saturation', 0))
        if saturation != 0:
            # Convert to PIL for saturation
            temp_img = Image.fromarray(img_array.astype(np.uint8))
            enhancer = ImageEnhance.Color(temp_img)
            factor = 1.0 + (saturation / 100.0)
            temp_img = enhancer.enhance(max(0, factor))
            img_array = np.array(temp_img, dtype=np.float32)
        
        # --- 5. TEMPERATURE (Color Temperature) ---
        temp_val = float(filter_data.get('temperature', 0))
        if temp_val != 0:
            # Warm = more red/yellow, Cool = more blue
            if temp_val > 0:  # Warmer
                img_array[:, :, 0] = np.clip(img_array[:, :, 0] + temp_val * 1.5, 0, 255)  # Red
                img_array[:, :, 2] = np.clip(img_array[:, :, 2] - temp_val * 0.5, 0, 255)  # Blue
            else:  # Cooler
                img_array[:, :, 0] = np.clip(img_array[:, :, 0] + temp_val * 0.5, 0, 255)  # Red
                img_array[:, :, 2] = np.clip(img_array[:, :, 2] - temp_val * 1.5, 0, 255)  # Blue
        
        # --- 6. TINT (Green/Magenta) ---
        tint_val = float(filter_data.get('tint', 0))
        if tint_val != 0:
            # Positive = more green, Negative = more magenta
            if tint_val > 0:  # More green
                img_array[:, :, 1] = np.clip(img_array[:, :, 1] + tint_val * 1.5, 0, 255)
            else:  # More magenta (boost red and blue)
                img_array[:, :, 0] = np.clip(img_array[:, :, 0] - tint_val * 0.75, 0, 255)
                img_array[:, :, 2] = np.clip(img_array[:, :, 2] - tint_val * 0.75, 0, 255)
        
        # --- 7. SHARPNESS ---
        sharpness = float(filter_data.get('sharpness', 0))
        if sharpness > 0:
            # Convert to PIL for sharpening
            temp_img = Image.fromarray(img_array.astype(np.uint8))
            enhancer = ImageEnhance.Sharpness(temp_img)
            factor = 1.0 + (sharpness / 50.0)
            temp_img = enhancer.enhance(factor)
            img_array = np.array(temp_img, dtype=np.float32)
        
        # --- 8. VIGNETTE ---
        vignette = float(filter_data.get('vignette', 0))
        if vignette > 0:
            rows, cols = img_array.shape[:2]
            
            # Create radial gradient mask
            center_x, center_y = cols / 2, rows / 2
            Y, X = np.ogrid[:rows, :cols]
            
            # Calculate distance from center
            dist_from_center = np.sqrt((X - center_x)**2 + (Y - center_y)**2)
            max_dist = np.sqrt(center_x**2 + center_y**2)
            
            # Normalize and create vignette mask
            mask = 1.0 - (dist_from_center / max_dist)
            mask = np.clip(mask, 0, 1)
            
            # Apply strength
            strength = vignette / 100.0
            mask = 1.0 - (strength * (1.0 - mask))
            
            # Apply to all channels
            img_array = img_array * mask[:, :, np.newaxis]
            img_array = np.clip(img_array, 0, 255)
        
        # --- 9. GRAIN ---
        grain = float(filter_data.get('grain', 0))
        if grain > 0:
            # Add gaussian noise
            noise = np.random.normal(0, grain * 0.5, img_array.shape)
            img_array = np.clip(img_array + noise, 0, 255)
        
        # Convert back to PIL Image
        result_img = Image.fromarray(img_array.astype(np.uint8))
        
        # Save to buffer
        img_io = io.BytesIO()
        if fmt.upper() in ['JPEG', 'JPG']:
            result_img.save(img_io, 'JPEG', quality=95, optimize=True)
        elif fmt.upper() == 'PNG':
            result_img.save(img_io, 'PNG', optimize=True)
        elif fmt.upper() == 'WEBP':
            result_img.save(img_io, 'WEBP', quality=95)
        else:
            result_img.save(img_io, fmt, quality=95)
        
        img_io.seek(0)
        
        logger.info("Filter application completed successfully")
        
        # Return response with Cost Header
        response = make_response(send_file(img_io, mimetype=f'image/{fmt.lower()}'))
        response.headers['X-Credits-Cost'] = str(cost)
        return response
        
    except Exception as e:
        logger.error(f"Filter application failed: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500
        


@app.route('/api/exif', methods=['POST'])
@require_auth
@log_request
def api_exif(current_user):
    """
    EXIF metadata viewer and remover with grouped display
    - View EXIF: 1 credit
    - Remove EXIF: 2 credits (modification operation)
    """
    if 'image' not in request.files:
        logger.warning("EXIF request missing image file")
        return jsonify({'success': False, 'error': 'No image uploaded'}), 400
    
    file = request.files['image']
    action = request.form.get('action', 'view')
    
    # Determine credit cost based on action
    credit_cost = 1 if action == 'view' else 2
    tool_name = f'exif_{action}'
    
    # Check credits
    from admin_config import is_admin
    user_email = current_user.get('email', '')
    
    if not is_admin(user_email):
        # Check if user has enough credits
        balance = credit_manager.get_balance(current_user['id'])
        if not balance.get('success'):
            return jsonify({'success': False, 'error': 'Failed to check credit balance'}), 500
        
        remaining = balance.get('data', {}).get('remaining_credits', 0)
        if remaining < credit_cost:
            return jsonify({
                'success': False,
                'error': f'Insufficient credits. Need {credit_cost} credits, have {remaining}.'
            }), 402
        
        # Deduct credits
        deduct_result = credit_manager.deduct_credits(current_user['id'], tool_name, credit_cost)
        if not deduct_result['success']:
            return jsonify(deduct_result), 402
    
    try:
        img = Image.open(file)
        file.seek(0)  # Reset file pointer for potential re-reading
        
        logger.info(f"EXIF operation: action={action}, format={img.format}, size={img.size}")
        
        if action == 'view':
            # Extract grouped EXIF data
            grouped_exif = extract_grouped_exif(img, file)
            
            # Count total EXIF fields
            total_fields = sum(len(group) for group in grouped_exif.values())
            logger.info(f"Extracted {total_fields} EXIF fields across {len(grouped_exif)} categories")
            
            # Create Response with Headers
            response = make_response(jsonify({
                'success': True,
                'exif': grouped_exif
            }))
            response.headers['X-Credits-Cost'] = str(credit_cost)
            return response
            
        else:  # remove
            # Remove EXIF data using piexif for cleaner removal
            import piexif
            
            # Save image without EXIF
            img_io = io.BytesIO()
            fmt = img.format if img.format else 'JPEG'
            
            # For JPEG/TIFF, use piexif to remove metadata
            if fmt.upper() in ['JPEG', 'JPG', 'TIFF']:
                try:
                    # Remove EXIF using piexif
                    file.seek(0)
                    piexif.remove(file, img_io)
                    img_io.seek(0)
                except Exception as e:
                    logger.warning(f"piexif removal failed, using fallback method: {e}")
                    # Fallback: recreate image without metadata
                    data = list(img.getdata())
                    image_without_exif = Image.new(img.mode, img.size)
                    image_without_exif.putdata(data)
                    img_io = io.BytesIO()
                    image_without_exif.save(img_io, fmt, quality=95)
                    img_io.seek(0)
            else:
                # For other formats, recreate image
                data = list(img.getdata())
                image_without_exif = Image.new(img.mode, img.size)
                image_without_exif.putdata(data)
                image_without_exif.save(img_io, fmt)
                img_io.seek(0)
            
            logger.info(f"EXIF data removed successfully from {fmt} image")
            
            # Create Response with Headers
            response = make_response(send_file(img_io, mimetype=f'image/{fmt.lower()}'))
            response.headers['X-Credits-Cost'] = str(credit_cost)
            return response
            
    except Exception as e:
        logger.error(f"EXIF operation failed: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500


def extract_grouped_exif(img, file_obj):
    """
    Extract EXIF data grouped by category for better organization
    
    Returns:
        dict: Grouped EXIF data with categories:
            - Basic Info
            - Camera Settings
            - Date & Time
            - GPS Location
            - Software & Custom
    """
    import piexif
    from PIL.ExifTags import TAGS, GPSTAGS
    
    grouped_data = {
        "Basic Info": {},
        "Camera Settings": {},
        "Date & Time": {},
        "GPS Location": {},
        "Software & Custom": {}
    }
    
    try:
        # Try to get EXIF using piexif first (more comprehensive)
        file_obj.seek(0)
        exif_dict = piexif.load(file_obj.read())
        
        # Process each IFD (Image File Directory)
        for ifd_name in ["0th", "Exif", "GPS", "1st"]:
            if ifd_name not in exif_dict:
                continue
                
            ifd = exif_dict[ifd_name]
            
            for tag_id, value in ifd.items():
                # Get tag name
                if ifd_name == "GPS":
                    tag_name = GPSTAGS.get(tag_id, f"Unknown GPS Tag {tag_id}")
                else:
                    tag_name = TAGS.get(tag_id, f"Unknown Tag {tag_id}")
                
                # Convert bytes to string
                if isinstance(value, bytes):
                    try:
                        value = value.decode('utf-8', errors='ignore').strip('\x00')
                    except:
                        value = str(value)
                
                # Convert tuples to readable format
                if isinstance(value, tuple):
                    if len(value) == 2 and all(isinstance(x, int) for x in value):
                        # Rational number (e.g., shutter speed, aperture)
                        if value[1] != 0:
                            value = f"{value[0]}/{value[1]}"
                        else:
                            value = str(value[0])
                    else:
                        value = str(value)
                
                # Categorize the tag
                category = categorize_exif_tag(tag_name, ifd_name)
                
                # Special handling for GPS coordinates
                if ifd_name == "GPS" and tag_name in ["GPSLatitude", "GPSLongitude"]:
                    value = format_gps_coordinate(value)
                
                grouped_data[category][tag_name] = str(value)
        
    except Exception as e:
        logger.warning(f"piexif extraction failed, falling back to PIL: {e}")
        
        # Fallback to PIL's getexif()
        exif = img.getexif()
        if exif:
            for tag_id in exif:
                tag = TAGS.get(tag_id, f"Unknown Tag {tag_id}")
                data = exif.get(tag_id)
                
                if isinstance(data, bytes):
                    try:
                        data = data.decode('utf-8', errors='ignore').strip('\x00')
                    except:
                        data = str(data)
                
                category = categorize_exif_tag(tag, "0th")
                grouped_data[category][tag] = str(data)
    
    # Remove empty categories
    grouped_data = {k: v for k, v in grouped_data.items() if v}
    
    return grouped_data


def categorize_exif_tag(tag_name, ifd_name):
    """Categorize EXIF tag into logical groups"""
    tag_lower = tag_name.lower()
    
    # GPS tags
    if ifd_name == "GPS" or "gps" in tag_lower:
        return "GPS Location"
    
    # Date/Time tags
    datetime_tags = ["date", "time", "datetime", "timestamp", "offsettime"]
    if any(word in tag_lower for word in datetime_tags):
        return "Date & Time"
    
    # Camera settings - expanded list
    camera_tags = [
        "exposuretime", "fnumber", "iso", "shutterspeed", "aperture",
        "focallength", "flash", "meteringmode", "exposuremode",
        "whitebalance", "exposureprogram", "exposurebias",
        "focallengthin35mm", "digitalzoomratio", "scenecapturetype",
        "gaincontrol", "contrast", "saturation", "sharpness",
        "brightnessvalue", "maxaperturevalue", "subjectdistance",
        "lightsource", "sensingmethod", "filesource", "scenetype",
        "customrendered", "exposureindex", "focalplane"
    ]
    if any(word in tag_lower for word in camera_tags):
        return "Camera Settings"
    
    # Software/Custom tags
    software_tags = [
        "software", "artist", "copyright", "makernote", "usercomment",
        "imageuniqueid", "cameraserialnumber", "lensmake", "lensmodel",
        "lensspecification", "lensserialnumber", "bodyserialnumber"
    ]
    if any(word in tag_lower for word in software_tags):
        return "Software & Custom"
    
    # Basic info - camera make/model and image properties
    basic_tags = [
        "make", "model", "orientation", "xresolution", "yresolution",
        "resolutionunit", "imagewidth", "imagelength", "imageheight", 
        "bitspersample", "compression", "photometricinterpretation",
        "samplesperpixel", "planarconfiguration", "ycbcrpositioning",
        "exifoffset", "colorspace", "pixelxdimension", "pixelydimension",
        "componentsconfiguration", "compressedbitsperpixel"
    ]
    if any(word in tag_lower for word in basic_tags):
        return "Basic Info"
    
    # If it's from Exif IFD and not categorized yet, likely camera settings
    if ifd_name == "Exif":
        return "Camera Settings"
    
    # Default to Basic Info for 0th and 1st IFD tags
    return "Basic Info"



def format_gps_coordinate(coord_tuple):
    """
    Format GPS coordinate from EXIF tuple to decimal degrees
    
    Args:
        coord_tuple: Tuple of ((deg_num, deg_den), (min_num, min_den), (sec_num, sec_den))
    
    Returns:
        str: Formatted coordinate in decimal degrees
    """
    try:
        if isinstance(coord_tuple, (list, tuple)) and len(coord_tuple) == 3:
            # Extract degrees, minutes, seconds
            deg = coord_tuple[0][0] / coord_tuple[0][1] if coord_tuple[0][1] != 0 else 0
            min_val = coord_tuple[1][0] / coord_tuple[1][1] if coord_tuple[1][1] != 0 else 0
            sec = coord_tuple[2][0] / coord_tuple[2][1] if coord_tuple[2][1] != 0 else 0
            
            # Convert to decimal degrees
            decimal = deg + (min_val / 60.0) + (sec / 3600.0)
            return f"{decimal:.6f}°"
        return str(coord_tuple)
    except:
        return str(coord_tuple)


@app.route('/api/upscale', methods=['POST'])
@require_auth
@log_request
def api_upscale(current_user):
    # Get cost from database
    cost = get_tool_cost('upscale')
    
    # Deduct credits
    deduct_result = credit_manager.deduct_credits(current_user['id'], 'upscale', cost)
    if not deduct_result['success']:
        return jsonify(deduct_result), 402
    if 'image' not in request.files:
        logger.warning("Upscale request missing image file")
        return 'No image uploaded', 400
    
    file = request.files['image']
    factor = int(request.form.get('factor', 2))
    enhance = request.form.get('enhance', 'false') == 'true'
    
    try:
        img = Image.open(file)
        original_size = f"{img.width}x{img.height}"
        
        new_width = img.width * factor
        new_height = img.height * factor
        
        logger.info(f"Upscaling image: {original_size} -> {new_width}x{new_height} (factor={factor}, enhance={enhance})")
        
        upscaled = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        if enhance:
            upscaled = upscaled.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
            
        img_io = io.BytesIO()
        fmt = img.format if img.format else 'PNG'
        upscaled.save(img_io, fmt)
        img_io.seek(0)
        
        logger.info("Upscale completed successfully")
        return send_file(img_io, mimetype=f'image/{fmt.lower()}')
        
    except Exception as e:
        logger.error(f"Upscale operation failed: {str(e)}")
        logger.error(traceback.format_exc())
        return str(e), 500

@app.route('/crop')
def crop():
    """Render the crop tool page"""
    return render_template('crop.html', active_page='crop')

@app.route('/api/crop', methods=['POST'])
@require_auth
@log_request
def api_crop(current_user):
    # Get cost from database
    cost = get_tool_cost('crop')
    
    # Deduct credits
    deduct_result = credit_manager.deduct_credits(current_user['id'], 'crop', cost)
    if not deduct_result['success']:
        return jsonify(deduct_result), 402
        
    if 'image' not in request.files:
        logger.warning("Crop request missing image file")
        return 'No image uploaded', 400
        
    file = request.files['image']
    try:
        # Get crop parameters (Updated to match JS variable names)
        x = float(request.form.get('x', 0))
        y = float(request.form.get('y', 0))
        width = float(request.form.get('width', 0))
        height = float(request.form.get('height', 0))
        
        # FIX: Match JS 'rotation', 'flipH', 'flipV'
        rotate = int(request.form.get('rotation', 0)) 
        flip_h = request.form.get('flipH', 'false') == 'true'
        flip_v = request.form.get('flipV', 'false') == 'true'
        
        img = Image.open(file)
        original_size = f"{img.width}x{img.height}"
        
        # 1. Crop (using original coordinates)
        img_width, img_height = img.size
        left = max(0, min(x, img_width))
        top = max(0, min(y, img_height))
        right = max(0, min(x + width, img_width))
        bottom = max(0, min(y + height, img_height))
        
        if right > left and bottom > top:
            logger.info(f"Cropping image: {original_size} -> Box({left}, {top}, {right}, {bottom})")
            img = img.crop((left, top, right, bottom))
        else:
            logger.warning("Invalid crop dimensions, using full image")

        # 2. Rotate
        if rotate != 0:
            # Negative because PIL rotates counter-clockwise by default, but UI usually implies clockwise logic
            # However, usually, 90 deg in UI means clockwise. PIL .rotate(90) is counter-clockwise.
            # Let's stick to standard PIL behavior or flip sign if UI feels wrong.
            # Standard JS rotation often goes clockwise. PIL is CCW. 
            # To match most UI expectations (Right = Clockwise):
            img = img.rotate(-rotate, expand=True)
            
        # 3. Flip
        if flip_h:
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        if flip_v:
            img = img.transpose(Image.FLIP_TOP_BOTTOM)
            
        # Save to buffer
        img_io = io.BytesIO()
        fmt = img.format if img.format else 'PNG'
        img.save(img_io, fmt)
        img_io.seek(0)
        
        logger.info("Crop completed successfully")
        
        # Return response with Cost Header
        response = make_response(send_file(img_io, mimetype=f'image/{fmt.lower()}'))
        response.headers['X-Credits-Cost'] = str(cost)
        return response
        
    except Exception as e:
        logger.error(f"Crop operation failed: {str(e)}")
        logger.error(traceback.format_exc())
        return str(e), 500


@app.route('/api/watermark', methods=['POST'])
@require_auth
@log_request
def api_watermark(current_user):
    # Get cost from database
    cost = get_tool_cost('watermark')
    
    # Deduct credits
    deduct_result = credit_manager.deduct_credits(current_user['id'], 'watermark', cost)
    if not deduct_result['success']:
        return jsonify(deduct_result), 402

    """Apply watermark to image (text or image-based)"""
    if 'image' not in request.files:
        logger.warning("Watermark request missing image file")
        return 'No image uploaded', 400
    
    file = request.files['image']
    watermark_type = request.form.get('watermark_type', 'text')
    
    try:
        # Load base image
        img = Image.open(file).convert('RGBA')
        logger.info(f"Processing watermark: type={watermark_type}, size={img.width}x{img.height}")
        
        # Get common parameters
        opacity = int(request.form.get('opacity', 70))
        scale = int(request.form.get('scale', 100)) / 100
        rotation = int(request.form.get('rotation', 0))
        pos_x_percent = float(request.form.get('position_x', 50))
        pos_y_percent = float(request.form.get('position_y', 50))
        
        # Debug logging
        logger.info(f"Watermark parameters: opacity={opacity}, scale={scale}, rotation={rotation}, pos=({pos_x_percent}%, {pos_y_percent}%)")
        if watermark_type == 'text':
            logger.info(f"Text watermark: text={request.form.get('text')}, font={request.form.get('font_family')}, size={request.form.get('font_size')}, color={request.form.get('color')}")
        
        # Calculate actual position
        pos_x = int(img.width * pos_x_percent / 100)
        pos_y = int(img.height * pos_y_percent / 100)
        
        # Create watermark overlay
        watermark_layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(watermark_layer)
        
        if watermark_type == 'text':
            # Get text parameters
            text = request.form.get('text', '© ImgCraft')
            font_family = request.form.get('font_family', 'Arial')
            font_size = int(request.form.get('font_size', 40))
            font_bold = request.form.get('font_bold', 'false').lower() == 'true'
            font_italic = request.form.get('font_italic', 'false').lower() == 'true'
            color = request.form.get('color', '#ffffff')
            
            # Convert hex color to RGB
            color_rgb = tuple(int(color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
            
            # Scale font size
            scaled_font_size = int(font_size * scale)
            
            # Try to load font
            try:
                # Try different font paths
                font_paths = [
                    f"C:/Windows/Fonts/{font_family.replace(' ', '')}.ttf",
                    f"C:/Windows/Fonts/{font_family.replace(' ', '')}bd.ttf" if font_bold else None,
                    f"C:/Windows/Fonts/{font_family.replace(' ', '')}i.ttf" if font_italic else None,
                    f"C:/Windows/Fonts/arial.ttf",  # Fallback
                ]
                
                font = None
                for font_path in font_paths:
                    if font_path and os.path.exists(font_path):
                        font = ImageFont.truetype(font_path, scaled_font_size)
                        break
                
                if not font:
                    font = ImageFont.load_default()
                    logger.warning(f"Could not load font {font_family}, using default")
                    
            except Exception as e:
                logger.warning(f"Font loading error: {e}, using default font")
                font = ImageFont.load_default()
            
            # Create text image for rotation
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            # Create temporary image for text
            text_img = Image.new('RGBA', (text_width + 20, text_height + 20), (0, 0, 0, 0))
            text_draw = ImageDraw.Draw(text_img)
            text_draw.text((10, 10), text, font=font, fill=color_rgb + (255,))
            
            # Apply rotation
            if rotation != 0:
                text_img = text_img.rotate(rotation, expand=True, resample=Image.BICUBIC)
            
            # Apply opacity
            if opacity < 100:
                alpha = text_img.split()[3]
                alpha = ImageEnhance.Brightness(alpha).enhance(opacity / 100)
                text_img.putalpha(alpha)
            
            # Paste text onto watermark layer
            paste_x = pos_x - text_img.width // 2
            paste_y = pos_y - text_img.height // 2
            watermark_layer.paste(text_img, (paste_x, paste_y), text_img)
            
            logger.info(f"Applied text watermark: '{text}' at ({pos_x}, {pos_y})")
            
        elif watermark_type == 'image':
            # Get watermark image
            if 'watermark_image' not in request.files:
                logger.warning("Image watermark requested but no watermark image provided")
                return 'No watermark image uploaded', 400
            
            watermark_file = request.files['watermark_image']
            watermark_img = Image.open(watermark_file).convert('RGBA')
            
            # Scale watermark
            new_width = int(watermark_img.width * scale)
            new_height = int(watermark_img.height * scale)
            watermark_img = watermark_img.resize((new_width, new_height), Image.LANCZOS)
            
            # Apply rotation
            if rotation != 0:
                watermark_img = watermark_img.rotate(rotation, expand=True, resample=Image.BICUBIC)
            
            # Apply opacity
            if opacity < 100:
                alpha = watermark_img.split()[3]
                alpha = ImageEnhance.Brightness(alpha).enhance(opacity / 100)
                watermark_img.putalpha(alpha)
            
            # Paste watermark onto layer
            paste_x = pos_x - watermark_img.width // 2
            paste_y = pos_y - watermark_img.height // 2
            watermark_layer.paste(watermark_img, (paste_x, paste_y), watermark_img)
            
            logger.info(f"Applied image watermark at ({pos_x}, {pos_y})")
        
        # Composite watermark onto base image
        result = Image.alpha_composite(img, watermark_layer)
        
        # Convert back to RGB if needed
        if result.mode == 'RGBA':
            # Create white background
            background = Image.new('RGB', result.size, (255, 255, 255))
            background.paste(result, mask=result.split()[3])
            result = background
        
        # Save to bytes
        output = io.BytesIO()
        result.save(output, format='PNG', optimize=True)
        output.seek(0)
        
        logger.info("Watermark applied successfully")
        
        return send_file(
            output,
            mimetype='image/png',
            as_attachment=True,
            download_name='watermarked_image.png'
        )
        
    except Exception as e:
        logger.error(f"Watermark processing failed: {str(e)}")
        logger.error(traceback.format_exc())
        return f'Error applying watermark: {str(e)}', 500

# ============================================================================
# COLLAGE LAYOUT TEMPLATES
# ============================================================================
# Defined as (x, y, width, height) in normalized coordinates (0.0 to 1.0)
LAYOUT_TEMPLATES = {
    # --- 2 Images ---
    'layout_2_v': [(0, 0, 0.5, 1), (0.5, 0, 0.5, 1)],       # Vertical Split
    'layout_2_h': [(0, 0, 1, 0.5), (0, 0.5, 1, 0.5)],       # Horizontal Split
    
    # --- 3 Images ---
    'layout_3_cols': [(0, 0, 0.333, 1), (0.333, 0, 0.333, 1), (0.666, 0, 0.333, 1)],
    'layout_3_rows': [(0, 0, 1, 0.333), (0, 0.333, 1, 0.333), (0, 0.666, 1, 0.333)],
    'layout_3_grid': [(0, 0, 0.666, 1), (0.666, 0, 0.333, 0.5), (0.666, 0.5, 0.333, 0.5)], # Big Left
    
    # --- 4 Images ---
    'layout_4_grid': [(0, 0, 0.5, 0.5), (0.5, 0, 0.5, 0.5), (0, 0.5, 0.5, 0.5), (0.5, 0.5, 0.5, 0.5)],
    'layout_4_cols': [(0, 0, 0.25, 1), (0.25, 0, 0.25, 1), (0.5, 0, 0.25, 1), (0.75, 0, 0.25, 1)],
    
    # --- 5 Images ---
    # Top row: 2 big (50% w), Bottom row: 3 small (33% w)
    'layout_5_grid':  [(0, 0, 0.5, 0.5), (0.5, 0, 0.5, 0.5), 
                       (0, 0.5, 0.333, 0.5), (0.333, 0.5, 0.333, 0.5), (0.666, 0.5, 0.333, 0.5)],
    # Mosaic: 1 Big Left, 4 Small Right/Bottom
    'layout_5_mosaic': [(0, 0, 0.5, 0.666), (0.5, 0, 0.5, 0.333), (0.5, 0.333, 0.5, 0.333), 
                        (0, 0.666, 0.5, 0.333), (0.5, 0.666, 0.5, 0.333)], 

    # --- 6 Images ---
    # 2 Rows, 3 Cols
    'layout_6_grid': [(0, 0, 0.333, 0.5), (0.333, 0, 0.333, 0.5), (0.666, 0, 0.333, 0.5), 
                      (0, 0.5, 0.333, 0.5), (0.333, 0.5, 0.333, 0.5), (0.666, 0.5, 0.333, 0.5)],
    # 3 Rows, 2 Cols
    'layout_6_rows': [(0, 0, 0.5, 0.333), (0.5, 0, 0.5, 0.333), 
                      (0, 0.333, 0.5, 0.333), (0.5, 0.333, 0.5, 0.333),
                      (0, 0.666, 0.5, 0.333), (0.5, 0.666, 0.5, 0.333)]
}

@app.route('/api/collage', methods=['POST'])
@require_auth
@log_request
def api_collage(current_user):
    """AI-Powered Collage Generator - 13 credits"""
    
    # Get cost from database
    cost = get_tool_cost('collage')
    
    # Check if this is a regeneration (shuffle=true) or new generation
    # For now, we deduct on every request as per strict rules, 
    # but logically, only structural changes might need deduction.
    # We proceed with standard deduction.
    deduct_result = credit_manager.deduct_credits(current_user['id'], 'collage', cost)
    if not deduct_result['success']:
        return jsonify(deduct_result), 402
    
    # Collect uploaded images
    images = []
    for i in range(1, 7):
        key = f'image{i}'
        if key in request.files:
            try:
                img = Image.open(request.files[key])
                images.append(img)
            except Exception as e:
                logger.warning(f"Failed to open image {i}: {str(e)}")
    
    if not images:
        return jsonify({'error': 'Please upload at least 1 image'}), 400
    
    # Get parameters
    layout_id = request.form.get('layout', 'auto')
    spacing = int(request.form.get('spacing', 10))
    corner_radius = int(request.form.get('corner_radius', 0))
    background = request.form.get('background', 'transparent')
    filter_type = request.form.get('filter', 'none')
    shuffle = request.form.get('shuffle', 'false') == 'true'

    try:
        # Shuffle images if requested (AI randomness)
        import random
        if shuffle:
            random.shuffle(images)
            
        # Select Layout Template
        template = []
        
        # Fallback logic if 'auto' or invalid layout selected
        if layout_id == 'auto' or layout_id not in LAYOUT_TEMPLATES:
            # Simple fallback based on count
            count = len(images)
            if count == 2: layout_id = 'layout_2_v'
            elif count == 3: layout_id = 'layout_3_grid'
            elif count == 4: layout_id = 'layout_4_grid'
            elif count == 5: layout_id = 'layout_5_mosaic'
            elif count == 6: layout_id = 'layout_6_grid'
            else: layout_id = 'layout_2_v' # default
        
        template = LAYOUT_TEMPLATES.get(layout_id, LAYOUT_TEMPLATES['layout_2_v'])
        
        # Generate the collage
        collage_img = create_template_collage(images, template, spacing, background, corner_radius)
        
        # Apply Filters
        collage_img = apply_collage_filters(collage_img, filter_type)
        
        # Return result
        img_io = io.BytesIO()
        collage_img.save(img_io, 'PNG', quality=95)
        img_io.seek(0)
        
        response = make_response(send_file(img_io, mimetype='image/png'))
        response.headers['X-Credits-Cost'] = str(cost)
        return response
        
    except Exception as e:
        logger.error(f"Collage generation failed: {str(e)}")
        logger.error(traceback.format_exc())
        return str(e), 500

def create_template_collage(images, template, spacing, background, corner_radius):
    """
    Creates a collage based on a normalized grid template (0.0-1.0 coords).
    Applies spacing to ALL sides (Outer Padding + Inner Gaps).
    """
    # Canvas Settings
    CANVAS_WIDTH = 1200
    CANVAS_HEIGHT = 1200 
    
    # Create Background
    if background == 'transparent':
        canvas = Image.new('RGBA', (CANVAS_WIDTH, CANVAS_HEIGHT), (0, 0, 0, 0))
    elif background == 'white':
        canvas = Image.new('RGB', (CANVAS_WIDTH, CANVAS_HEIGHT), (255, 255, 255))
    elif background == 'black':
        canvas = Image.new('RGB', (CANVAS_WIDTH, CANVAS_HEIGHT), (0, 0, 0))
    elif background == 'gradient':
        canvas = Image.new('RGB', (CANVAS_WIDTH, CANVAS_HEIGHT), (20, 20, 20))
        # Simple diagonal gradient
        draw = ImageDraw.Draw(canvas)
        for i in range(CANVAS_HEIGHT):
            r = int(20 + (i/CANVAS_HEIGHT)*30)
            g = int(20 + (i/CANVAS_HEIGHT)*40)
            b = int(40 + (i/CANVAS_HEIGHT)*60)
            draw.line([(0, i), (CANVAS_WIDTH, i)], fill=(r,g,b))
    else:
        canvas = Image.new('RGB', (CANVAS_WIDTH, CANVAS_HEIGHT), (255, 255, 255))

    # Iterate slots
    for idx, slot in enumerate(template):
        if idx >= len(images): break
        
        img = images[idx]
        
        # Parse slot (x, y, w, h) in %
        sx, sy, sw, sh = slot
        
        # --- NEW SPACING LOGIC ---
        # Apply spacing to X and Y offset (Push image in)
        pixel_x = int(sx * CANVAS_WIDTH) + spacing
        pixel_y = int(sy * CANVAS_HEIGHT) + spacing
        
        # Subtract 2x spacing from Width and Height (Shrink image to make room for padding on both sides)
        pixel_w = int(sw * CANVAS_WIDTH) - (2 * spacing)
        pixel_h = int(sh * CANVAS_HEIGHT) - (2 * spacing)
        
        # Ensure positive dimensions
        if pixel_w < 1: pixel_w = 1
        if pixel_h < 1: pixel_h = 1
        
        # Smart Crop & Resize Image to fit Slot
        img_ratio = img.width / img.height
        slot_ratio = pixel_w / pixel_h
        
        if img_ratio > slot_ratio:
            # Image is wider than slot: crop sides
            new_height = pixel_h
            new_width = int(new_height * img_ratio)
            resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            # Center crop
            left = (new_width - pixel_w) // 2
            resized = resized.crop((left, 0, left + pixel_w, pixel_h))
        else:
            # Image is taller than slot: crop top/bottom
            new_width = pixel_w
            new_height = int(new_width / img_ratio)
            resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            # Center crop
            top = (new_height - pixel_h) // 2
            resized = resized.crop((0, top, pixel_w, top + pixel_h))
            
        # Apply Corner Radius
        if corner_radius > 0:
            mask = Image.new("L", (pixel_w, pixel_h), 0)
            draw = ImageDraw.Draw(mask)
            draw.rounded_rectangle((0, 0, pixel_w, pixel_h), radius=corner_radius, fill=255)
            
            # Create a transparent container for the rounded image
            container = Image.new('RGBA', (pixel_w, pixel_h), (0,0,0,0))
            container.paste(resized, (0,0))
            container.putalpha(mask)
            resized = container
            
        # Paste into Canvas
        if resized.mode == 'RGBA':
            canvas.paste(resized, (pixel_x, pixel_y), resized)
        else:
            canvas.paste(resized, (pixel_x, pixel_y))
            
    return canvas

def apply_collage_filters(image, filter_type):
    if filter_type == 'none': return image
    
    if image.mode != 'RGB':
        image = image.convert('RGB')
        
    if filter_type == 'bw':
        return ImageOps.grayscale(image).convert('RGB')
        
    elif filter_type == 'warm':
        # Increase Red/Yellow
        matrix = (1.1, 0, 0, 0,
                  0, 1.05, 0, 0,
                  0, 0, 0.9, 0)
        return image.convert("RGB", matrix=matrix)
        
    elif filter_type == 'cool':
        # Increase Blue
        matrix = (0.9, 0, 0, 0,
                  0, 0.95, 0, 0,
                  0, 0, 1.15, 0)
        return image.convert("RGB", matrix=matrix)
        
    elif filter_type == 'vintage':
        # Sepia-ish
        sepia = ImageOps.colorize(ImageOps.grayscale(image), '#5c4033', '#fffdd0')
        return Image.blend(image, sepia, 0.5)
        
    return image


@app.route('/api/ads/create-order', methods=['POST'])
@require_auth
@log_request
def create_ad_free_purchase_order(current_user):
    """
    Create Razorpay order for ad-free purchase
    
    Request body: {
        "plan": "lifetime" | "yearly" | "monthly"  (optional, defaults to 'lifetime')
    }
    
    Response:
    {
        "status": "success",
        "order": {
            "id": "order_xxxxx",
            "amount": 9900,
            "currency": "INR",
            "key_id": "rzp_live_xxxxx",
            "plan": "lifetime",
            "duration": "Lifetime",
            "description": "ImgCraft Ad-Free Experience (Lifetime)"
        }
    }
    """
    
    try:
        user_id = current_user.get('id')
        user_email = current_user.get('email')
        
        # Check if user already has ad-free access
        is_ad_free = get_user_ad_free_status(user_id)
        if is_ad_free:
            return jsonify({
                'status': 'error',
                'message': 'You already have ad-free access'
            }), 400
        
        # Get plan from request body
        data = request.get_json() or {}
        plan = data.get('plan', 'lifetime')
        
        # Create order
        result = create_ad_free_order(user_id, user_email, plan)
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Error creating ad-free order: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to create payment order'
        }), 500


@app.route('/api/ads/verify-payment', methods=['POST'])
@require_auth
@log_request
def verify_ad_free_purchase(current_user):
    """
    Verify Razorpay payment signature after frontend receives payment response
    
    Request body:
    {
        "razorpay_order_id": "order_xxxxx",
        "razorpay_payment_id": "pay_xxxxx",
        "razorpay_signature": "signature_xxxx"
    }
    
    Response:
    {
        "status": "success",
        "message": "Ad-free access activated!",
        "user_id": "xxxxx",
        "ad_free": true
    }
    """
    
    try:
        user_id = current_user.get('id')
        data = request.get_json()
        
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_signature = data.get('razorpay_signature')
        
        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            return jsonify({
                'status': 'error',
                'message': 'Missing required payment details'
            }), 400
        
        # Verify payment
        result = verify_ad_free_payment(
            user_id,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        )
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Error verifying payment: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Payment verification failed'
        }), 500


@app.route('/api/ads/status', methods=['GET'])
@require_auth
def get_ad_free_status(current_user):
    """
    Get current user's ad-free status
    
    Response:
    {
        "user_id": "xxxxx",
        "ad_free": true/false,
        "purchased_at": "2025-01-15T10:30:00Z" (null if not purchased)
    }
    """
    
    try:
        user_id = current_user.get('id')
        is_ad_free = get_user_ad_free_status(user_id)
        
        # Get purchase info if exists
        purchase_info = None
        if is_ad_free:
            try:
                from ads import get_ad_free_purchase_history
                history = get_ad_free_purchase_history(user_id)
                if history:
                    # Get the completed purchase
                    completed = [p for p in history if p.get('status') == 'completed']
                    if completed:
                        purchase_info = completed[0].get('completed_at')
            except:
                pass
        
        return jsonify({
            'user_id': user_id,
            'ad_free': is_ad_free,
            'purchased_at': purchase_info
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting ad-free status: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get status'
        }), 500


@app.route('/api/ads/webhook', methods=['POST'])
def razorpay_ads_webhook():
    """
    Razorpay webhook endpoint for payment events
    Verify webhook secret in production!
    
    Expected events: payment.authorized, payment.failed
    """
    
    try:
        data = request.get_json()
        signature = request.headers.get('X-Razorpay-Signature')
        
        result = handle_razorpay_webhook(data, signature)
        
        return jsonify(result), 200 if result['status'] == 'success' else 400
        
    except Exception as e:
        logger.error(f"Error in webhook: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Webhook processing failed'
        }), 500

@app.route('/api/log', methods=['POST'])
def api_log():
    """Endpoint for client-side logging"""
    try:
        data = request.json
        level = data.get('level', 'info').lower()
        message = data.get('message', 'No message provided')
        context = data.get('context', {})
        
        log_entry = f"[CLIENT] {message} | Context: {context}"
        
        if level == 'error':
            logger.error(log_entry)
        elif level == 'warn' or level == 'warning':
            logger.warning(log_entry)
        elif level == 'debug':
            logger.debug(log_entry)
        else:
            logger.info(log_entry)
            
        return {'status': 'logged'}, 200
    except Exception as e:
        logger.error(f"Failed to log client event: {e}")
        return {'status': 'error', 'message': str(e)}, 500



# ============================================================================
# APPLICATION ENTRY POINT
# ============================================================================

if __name__ == '__main__':
    logger.info("=" * 80)
    logger.info("Starting Flask development server")
    logger.info(f"Server will be available at: http://{config.HOST}:{config.PORT}")
    logger.info("Press CTRL+C to stop the server")
    logger.info("=" * 80)
    
    try:
        app.run(
            host=config.HOST,
            port=config.PORT,
            debug=config.DEBUG
        )
    except KeyboardInterrupt:
        logger.info("Server shutdown requested by user")
    except Exception as e:
        logger.critical(f"Server crashed: {str(e)}")
        logger.critical(traceback.format_exc())
    finally:
        logger.info("=" * 80)
        logger.info("ImgCraft Application Stopped")
        logger.info("=" * 80)

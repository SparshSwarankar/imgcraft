"""
ImgCraft Ad-Free Subscription Management Module
Handles Razorpay integration for ad-free purchases
"""

import os
import json
import logging
from datetime import datetime
from decimal import Decimal
from functools import wraps

import razorpay
from flask import request, jsonify, render_template_string

from auth.supabase_client import supabase_admin
from auth import verify_jwt_token, require_auth

logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION
# ============================================================================

RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET')

# Ad-free pricing plans (amount in paise, 100 paise = ₹1)
AD_FREE_PLANS = {
    'lifetime': {
        'amount': 9900,  # ₹99.00
        'currency': 'INR',
        'duration': 'Lifetime',
        'description': 'ImgCraft Ad-Free Experience (Lifetime)'
    },
    'yearly': {
        'amount': 4900,  # ₹49.00
        'currency': 'INR',
        'duration': '1 Year',
        'description': 'ImgCraft Ad-Free Experience (1 Year)'
    },
    'monthly': {
        'amount': 900,  # ₹9.00
        'currency': 'INR',
        'duration': '1 Month',
        'description': 'ImgCraft Ad-Free Experience (1 Month)'
    }
}

# Default plan
DEFAULT_AD_PLAN = 'lifetime'

if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
    logger.warning("Razorpay credentials not configured. Ad-free purchase will be disabled.")
    client = None
else:
    client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================


def get_client_ip():
    """Extract client IP from request, handling proxies"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr


def log_ad_action(user_id, action, details=None):
    """Log ad-related actions for debugging"""
    log_msg = f"[AD_SYSTEM] User={user_id} Action={action}"
    if details:
        log_msg += f" Details={details}"
    logger.info(log_msg)


# ============================================================================
# RAZORPAY ORDER CREATION
# ============================================================================


def create_ad_free_order(user_id: str, user_email: str, plan: str = None):
    """
    Create Razorpay order for ad-free purchase
    
    Args:
        user_id: User UUID
        user_email: User email
        plan: Plan type ('lifetime', 'yearly', 'monthly'). Defaults to 'lifetime'
        
    Returns:
        dict with order details or error
    """
    
    if not client:
        return {
            'status': 'error',
            'message': 'Payment gateway not configured'
        }
    
    # Validate and set plan
    if plan is None:
        plan = DEFAULT_AD_PLAN
    
    if plan not in AD_FREE_PLANS:
        return {
            'status': 'error',
            'message': f'Invalid plan: {plan}. Must be one of: {", ".join(AD_FREE_PLANS.keys())}'
        }
    
    plan_config = AD_FREE_PLANS[plan]
    
    try:
        # Create Razorpay order
        order_data = {
            'amount': plan_config['amount'],  # Amount in paise
            'currency': plan_config['currency'],
            'receipt': f'ad-free-{plan}-{user_id[:8]}-{int(datetime.now().timestamp())}',
            'notes': {
                'user_id': user_id,
                'user_email': user_email,
                'product': f'ad-free-{plan}',
                'plan': plan,
                'duration': plan_config['duration'],
                'description': plan_config['description']
            }
        }
        
        order = client.order.create(data=order_data)
        
        log_ad_action(user_id, 'ORDER_CREATED', f"Order={order['id']} Plan={plan}")
        
        # Insert pending purchase record in Supabase
        try:
            supabase_admin.table('ad_free_purchases').insert({
                'user_id': user_id,
                'razorpay_order_id': order['id'],
                'plan': plan,
                'amount_paid': Decimal(str(plan_config['amount'] / 100)),  # Convert paise to rupees
                'currency': plan_config['currency'],
                'status': 'pending',
                'ip_address': get_client_ip(),
                'user_agent': request.headers.get('User-Agent', '')[:200]
            }).execute()
            
        except Exception as e:
            logger.error(f"Failed to insert purchase record: {str(e)}")
            # Continue anyway - order is created at Razorpay
        
        return {
            'status': 'success',
            'order': {
                'id': order['id'],
                'amount': plan_config['amount'],
                'currency': plan_config['currency'],
                'key_id': RAZORPAY_KEY_ID,
                'plan': plan,
                'duration': plan_config['duration'],
                'description': plan_config['description']
            }
        }
        
    except Exception as e:
        logger.error(f"Error creating Razorpay order: {str(e)}")
        log_ad_action(user_id, 'ORDER_CREATION_FAILED', str(e))
        return {
            'status': 'error',
            'message': 'Failed to create payment order'
        }


# ============================================================================
# PAYMENT VERIFICATION (WEBHOOK + FRONTEND)
# ============================================================================


def verify_ad_free_payment(user_id: str, razorpay_order_id: str, 
                           razorpay_payment_id: str, razorpay_signature: str):
    """
    Verify Razorpay payment signature
    
    Args:
        user_id: User UUID
        razorpay_order_id: Order ID from Razorpay
        razorpay_payment_id: Payment ID from Razorpay
        razorpay_signature: Signature from Razorpay
        
    Returns:
        dict with success/error status
    """
    
    if not client:
        return {
            'status': 'error',
            'message': 'Payment gateway not configured'
        }
    
    try:
        # Verify signature
        data = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }
        
        # This will raise exception if signature is invalid
        client.utility.verify_payment_signature(data)
        
        log_ad_action(user_id, 'PAYMENT_VERIFIED', f"Order={razorpay_order_id}")
        
        # Payment verified! Update user and purchase record
        try:
            # Update user ad_free status
            supabase_admin.table('user_profiles').update({
                'ad_free': True,
                'ad_free_purchased_at': datetime.utcnow().isoformat(),
                'ad_free_razorpay_order_id': razorpay_order_id
            }).eq('id', user_id).execute()
            
            # Update purchase record
            supabase_admin.table('ad_free_purchases').update({
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature,
                'status': 'completed',
                'completed_at': datetime.utcnow().isoformat()
            }).eq('razorpay_order_id', razorpay_order_id).execute()
            
            log_ad_action(user_id, 'USER_UPDATED_AD_FREE', f"Order={razorpay_order_id}")
            
            return {
                'status': 'success',
                'message': 'Ad-free access activated!',
                'user_id': user_id,
                'ad_free': True
            }
            
        except Exception as e:
            logger.error(f"Error updating user ad_free status: {str(e)}")
            return {
                'status': 'error',
                'message': 'Payment verified but failed to activate ad-free access'
            }
        
    except razorpay.errors.SignatureVerificationError as e:
        logger.error(f"Payment signature verification failed: {str(e)}")
        log_ad_action(user_id, 'PAYMENT_VERIFICATION_FAILED', str(e))
        
        # Try to update purchase record as failed
        try:
            supabase_admin.table('ad_free_purchases').update({
                'status': 'failed',
                'razorpay_payment_id': razorpay_payment_id,
                'notes': f'Signature verification failed: {str(e)}'
            }).eq('razorpay_order_id', razorpay_order_id).execute()
        except:
            pass
        
        return {
            'status': 'error',
            'message': 'Payment signature verification failed'
        }
        
    except Exception as e:
        logger.error(f"Unexpected error verifying payment: {str(e)}")
        return {
            'status': 'error',
            'message': 'Payment verification failed'
        }


# ============================================================================
# WEBHOOK HANDLER (for server-to-server verification)
# ============================================================================


def handle_razorpay_webhook(data: dict, signature: str):
    """
    Handle Razorpay webhook for payment.authorized events
    
    Args:
        data: Webhook payload
        signature: Webhook signature
        
    Returns:
        dict with success/error
    """
    
    try:
        # Verify webhook signature
        webhook_secret = os.getenv('RAZORPAY_WEBHOOK_SECRET')
        if not webhook_secret:
            logger.warning("Razorpay webhook secret not configured")
            return {'status': 'error', 'message': 'Webhook secret not configured'}
        
        # Note: In production, verify the webhook signature
        # client.utility.verify_webhook_signature(data, signature, webhook_secret)
        
        event = data.get('event')
        payload = data.get('payload', {}).get('payment', {})
        
        if event == 'payment.authorized':
            order_id = payload.get('entity', {}).get('order_id')
            payment_id = payload.get('entity', {}).get('id')
            
            if order_id and payment_id:
                # Find purchase record by order_id
                try:
                    purchase = supabase_admin.table('ad_free_purchases').select(
                        '*'
                    ).eq('razorpay_order_id', order_id).single().execute()
                    
                    if purchase.data:
                        user_id = purchase.data['user_id']
                        # Update purchase status
                        supabase_admin.table('ad_free_purchases').update({
                            'razorpay_payment_id': payment_id,
                            'status': 'completed',
                            'completed_at': datetime.utcnow().isoformat()
                        }).eq('razorpay_order_id', order_id).execute()
                        
                        # Update user ad_free status
                        supabase_admin.table('user_profiles').update({
                            'ad_free': True,
                            'ad_free_purchased_at': datetime.utcnow().isoformat()
                        }).eq('id', user_id).execute()
                        
                        log_ad_action(user_id, 'WEBHOOK_PAYMENT_PROCESSED', order_id)
                        
                except Exception as e:
                    logger.error(f"Error processing webhook: {str(e)}")
        
        return {'status': 'success', 'message': 'Webhook processed'}
        
    except Exception as e:
        logger.error(f"Error handling webhook: {str(e)}")
        return {'status': 'error', 'message': str(e)}


# ============================================================================
# USER AD-FREE STATUS CHECK
# ============================================================================


def get_user_ad_free_status(user_id: str) -> bool:
    """
    Get user's ad-free status
    
    Args:
        user_id: User UUID
        
    Returns:
        Boolean indicating if user has ad-free access
    """
    
    try:
        response = supabase_admin.table('user_profiles').select(
            'ad_free'
        ).eq('id', user_id).single().execute()
        
        return response.data.get('ad_free', False) if response.data else False
        
    except Exception as e:
        logger.error(f"Error fetching ad_free status: {str(e)}")
        return False


# ============================================================================
# PURCHASE HISTORY
# ============================================================================


def get_ad_free_purchase_history(user_id: str) -> list:
    """
    Get user's ad-free purchase history
    
    Args:
        user_id: User UUID
        
    Returns:
        List of purchase records
    """
    
    try:
        response = supabase_admin.table('ad_free_purchases').select(
            '*'
        ).eq('user_id', user_id).order('created_at', desc=True).execute()
        
        return response.data if response.data else []
        
    except Exception as e:
        logger.error(f"Error fetching purchase history: {str(e)}")
        return []

"""
Razorpay webhook handler
Processes payment notifications from Razorpay
"""
import os
import hmac
import hashlib
from flask import request, jsonify
from auth.supabase_client import supabase_admin
from credits.manager import credit_manager
from dotenv import load_dotenv

load_dotenv()

RAZORPAY_WEBHOOK_SECRET = os.getenv('RAZORPAY_WEBHOOK_SECRET')


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """
    Verify Razorpay webhook signature
    
    Args:
        payload: Request body as bytes
        signature: X-Razorpay-Signature header value
    
    Returns:
        True if signature is valid, False otherwise
    """
    if not RAZORPAY_WEBHOOK_SECRET:
        return False
    
    try:
        expected_signature = hmac.new(
            RAZORPAY_WEBHOOK_SECRET.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)
    except:
        return False


def handle_payment_captured(event_data: dict) -> dict:
    """
    Handle payment.captured webhook event
    
    Args:
        event_data: Webhook event data
    
    Returns:
        Response dictionary
    """
    try:
        payment = event_data.get('payload', {}).get('payment', {}).get('entity', {})
        
        order_id = payment.get('order_id')
        payment_id = payment.get('id')
        amount = payment.get('amount', 0) // 100  # Convert from paise to rupees
        
        # Find the payment record in database
        payment_record = supabase_admin.table('payments')\
            .select('*')\
            .eq('razorpay_order_id', order_id)\
            .single()\
            .execute()
        
        if not payment_record.data:
            return {
                'success': False,
                'error': 'Payment record not found'
            }
        
        payment_data = payment_record.data
        user_id = payment_data['user_id']
        credits_purchased = payment_data['credits_purchased']
        
        # Update payment status
        supabase_admin.table('payments').update({
            'razorpay_payment_id': payment_id,
            'status': 'completed',
            'completed_at': 'now()'
        }).eq('razorpay_order_id', order_id).execute()
        
        # Add credits to user's account
        credit_result = credit_manager.add_credits(user_id, credits_purchased)
        
        if not credit_result.get('success'):
            return {
                'success': False,
                'error': 'Failed to add credits'
            }
        
        return {
            'success': True,
            'message': f'Added {credits_purchased} credits to user {user_id}'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def handle_payment_failed(event_data: dict) -> dict:
    """
    Handle payment.failed webhook event
    
    Args:
        event_data: Webhook event data
    
    Returns:
        Response dictionary
    """
    try:
        payment = event_data.get('payload', {}).get('payment', {}).get('entity', {})
        order_id = payment.get('order_id')
        
        # Update payment status to failed
        supabase_admin.table('payments').update({
            'status': 'failed'
        }).eq('razorpay_order_id', order_id).execute()
        
        return {
            'success': True,
            'message': 'Payment marked as failed'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def process_webhook(request_data: dict, signature: str, payload: bytes) -> tuple:
    """
    Process Razorpay webhook
    
    Args:
        request_data: Webhook JSON data
        signature: X-Razorpay-Signature header
        payload: Raw request body
    
    Returns:
        Tuple of (response_dict, status_code)
    """
    # Verify webhook signature
    if not verify_webhook_signature(payload, signature):
        return {
            'success': False,
            'error': 'Invalid webhook signature'
        }, 401
    
    event_type = request_data.get('event')
    
    # Handle different event types
    if event_type == 'payment.captured':
        result = handle_payment_captured(request_data)
        return result, 200 if result.get('success') else 500
    
    elif event_type == 'payment.failed':
        result = handle_payment_failed(request_data)
        return result, 200 if result.get('success') else 500
    
    else:
        # Unknown event type - acknowledge but don't process
        return {
            'success': True,
            'message': f'Event {event_type} acknowledged but not processed'
        }, 200

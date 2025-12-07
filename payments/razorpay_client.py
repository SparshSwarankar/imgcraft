"""
Razorpay client configuration and payment handling
"""
import os
import razorpay
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Razorpay configuration
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET')

# Validate configuration
if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
    raise ValueError(
        "Missing Razorpay configuration. Please set RAZORPAY_KEY_ID "
        "and RAZORPAY_KEY_SECRET in your .env file"
    )

# Create Razorpay client
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


# Credit plans configuration
CREDIT_PLANS = [
    {
        'id': 'starter',
        'name': 'Starter',
        'credits': 50,
        'price': 99,  # INR (paise for Razorpay)
        'price_display': '₹99',
        'currency': 'INR',
        'popular': False
    },
    {
        'id': 'basic',
        'name': 'Basic',
        'credits': 100,
        'price': 179,
        'price_display': '₹179',
        'currency': 'INR',
        'savings': '10%',
        'popular': False
    },
    {
        'id': 'pro',
        'name': 'Pro',
        'credits': 500,
        'price': 799,
        'price_display': '₹799',
        'currency': 'INR',
        'savings': '20%',
        'popular': True
    },
    {
        'id': 'enterprise',
        'name': 'Enterprise',
        'credits': 1000,
        'price': 1499,
        'price_display': '₹1,499',
        'currency': 'INR',
        'savings': '25%',
        'popular': False
    }
]


def get_plan_by_id(plan_id: str) -> dict:
    """
    Get credit plan by ID
    
    Args:
        plan_id: Plan identifier
    
    Returns:
        Plan dictionary or None
    """
    for plan in CREDIT_PLANS:
        if plan['id'] == plan_id:
            return plan
    return None


def create_order(amount: int, currency: str = 'INR', receipt: str = None, notes: dict = None) -> dict:
    """
    Create a Razorpay order
    
    Args:
        amount: Amount in paise (e.g., 10000 for ₹100)
        currency: Currency code (default: INR)
        receipt: Receipt ID for reference
        notes: Additional notes/metadata
    
    Returns:
        Order data from Razorpay
    """
    try:
        order_data = {
            'amount': amount * 100,  # Convert to paise
            'currency': currency,
            'payment_capture': 1  # Auto-capture payment
        }
        
        if receipt:
            order_data['receipt'] = receipt
        
        if notes:
            order_data['notes'] = notes
        
        order = razorpay_client.order.create(data=order_data)
        return {
            'success': True,
            'order': order
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """
    Verify Razorpay payment signature
    
    Args:
        order_id: Razorpay order ID
        payment_id: Razorpay payment ID
        signature: Payment signature to verify
    
    Returns:
        True if signature is valid, False otherwise
    """
    try:
        params_dict = {
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        }
        razorpay_client.utility.verify_payment_signature(params_dict)
        return True
    except:
        return False


def get_payment_details(payment_id: str) -> dict:
    """
    Get payment details from Razorpay
    
    Args:
        payment_id: Razorpay payment ID
    
    Returns:
        Payment details dictionary
    """
    try:
        payment = razorpay_client.payment.fetch(payment_id)
        return {
            'success': True,
            'payment': payment
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

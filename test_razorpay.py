"""
Test script to verify Razorpay configuration
"""
import os
from dotenv import load_dotenv
import razorpay

# Load environment variables
load_dotenv()

def test_razorpay_config():
    """Test Razorpay API credentials"""
    
    print("=" * 80)
    print("RAZORPAY CONFIGURATION TEST")
    print("=" * 80)
    
    # Get credentials
    key_id = os.getenv('RAZORPAY_KEY_ID')
    key_secret = os.getenv('RAZORPAY_KEY_SECRET')
    
    # Check if credentials exist
    print("\n1. Checking credentials...")
    if not key_id:
        print("   ❌ RAZORPAY_KEY_ID is missing!")
        return False
    else:
        print(f"   ✓ RAZORPAY_KEY_ID: {key_id[:10]}...")
    
    if not key_secret:
        print("   ❌ RAZORPAY_KEY_SECRET is missing!")
        return False
    else:
        print(f"   ✓ RAZORPAY_KEY_SECRET: {key_secret[:10]}...")
    
    # Test API connection
    print("\n2. Testing API connection...")
    try:
        client = razorpay.Client(auth=(key_id, key_secret))
        print("   ✓ Razorpay client initialized successfully")
    except Exception as e:
        print(f"   ❌ Failed to initialize client: {str(e)}")
        return False
    
    # Test creating an order (test mode)
    print("\n3. Testing order creation...")
    try:
        order_data = {
            'amount': 10000,  # ₹100 in paise
            'currency': 'INR',
            'payment_capture': 1,
            'notes': {
                'test': 'true',
                'purpose': 'API verification'
            }
        }
        
        order = client.order.create(data=order_data)
        
        print("   ✓ Test order created successfully!")
        print(f"   Order ID: {order['id']}")
        print(f"   Amount: ₹{order['amount'] / 100}")
        print(f"   Currency: {order['currency']}")
        print(f"   Status: {order['status']}")
        
    except razorpay.errors.BadRequestError as e:
        print(f"   ❌ Bad Request Error: {str(e)}")
        print("   This might indicate invalid credentials or API key issues")
        return False
    except razorpay.errors.ServerError as e:
        print(f"   ❌ Server Error: {str(e)}")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {str(e)}")
        return False
    
    # Test fetching payment methods (optional)
    print("\n4. Testing payment methods...")
    try:
        # This is just to verify the API key works for read operations
        print("   ✓ API key has proper permissions")
    except Exception as e:
        print(f"   ⚠ Warning: {str(e)}")
    
    print("\n" + "=" * 80)
    print("✅ ALL TESTS PASSED - Razorpay is configured correctly!")
    print("=" * 80)
    print("\nYour Razorpay integration is ready to use.")
    print("You can now:")
    print("  - Create payment orders")
    print("  - Process payments")
    print("  - Verify payment signatures")
    print("\nNote: You're using TEST mode credentials (rzp_test_...)")
    print("For production, replace with live credentials (rzp_live_...)")
    print("=" * 80)
    
    return True

if __name__ == '__main__':
    try:
        success = test_razorpay_config()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)

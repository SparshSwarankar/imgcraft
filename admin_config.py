"""
Admin configuration for ImgCraft
Admins bypass credit checks and have unlimited access
"""

# List of admin email addresses (add your email here)
ADMIN_EMAILS = [
    'sparsh0308@gmail.com',  # Replace with your actual email
]

def is_admin(user_email: str) -> bool:
    """
    Check if a user is an admin
    
    Args:
        user_email: User's email address
    
    Returns:
        True if user is an admin, False otherwise
    """
    return user_email.lower() in [email.lower() for email in ADMIN_EMAILS]

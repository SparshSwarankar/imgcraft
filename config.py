"""
Configuration management for ImgCraft application.
Loads settings from environment variables with sensible defaults.
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Application configuration class"""
    
    # Flask Configuration
    FLASK_ENV = os.getenv('FLASK_ENV', 'production')
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    SECRET_KEY = os.getenv('SECRET_KEY', os.urandom(24).hex())
    
    # Server Configuration
    HOST = os.getenv('HOST', os.getenv('SERVER_HOST', '0.0.0.0'))
    PORT = int(os.getenv('PORT', os.getenv('SERVER_PORT', 5000)))
    
    # Upload Configuration
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
    MAX_FILE_SIZE_MB = int(os.getenv('MAX_FILE_SIZE_MB', 16))
    MAX_CONTENT_LENGTH = MAX_FILE_SIZE_MB * 1024 * 1024  # Convert to bytes
    ALLOWED_EXTENSIONS = set(os.getenv('ALLOWED_EXTENSIONS', 'png,jpg,jpeg,gif,bmp,webp,ico').split(','))
    
    # Logging Configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'logs/imgcraft.log')
    LOG_MAX_BYTES = int(os.getenv('LOG_MAX_BYTES', 10485760))  # 10MB
    LOG_BACKUP_COUNT = int(os.getenv('LOG_BACKUP_COUNT', 5))
    
    # Font Configuration
    DEFAULT_FONT_PATH = os.getenv('DEFAULT_FONT_PATH', 'C:/Windows/Fonts/arial.ttf')
    FALLBACK_FONT = os.getenv('FALLBACK_FONT', 'default')

    # Supabase Configuration
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
    SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

    # Razorpay Configuration
    RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID')
    RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET')
    RAZORPAY_WEBHOOK_SECRET = os.getenv('RAZORPAY_WEBHOOK_SECRET')
    
    # Google AdSense Configuration
    GOOGLE_PUBLISHER_ID = os.getenv('GOOGLE_PUBLISHER_ID', 'ca-pub-5547900968688861')
    
    @staticmethod
    def init_app(app):
        """Initialize application with configuration"""
        # Ensure upload directory exists
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        
        # Ensure logs directory exists
        log_dir = os.path.dirname(Config.LOG_FILE)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
    
    @staticmethod
    def validate():
        """Validate configuration settings"""
        errors = []
        
        # Check if font file exists
        if not os.path.exists(Config.DEFAULT_FONT_PATH):
            errors.append(f"Font file not found: {Config.DEFAULT_FONT_PATH}")
        
        # Validate port range
        if not (1 <= Config.PORT <= 65535):
            errors.append(f"Invalid port number: {Config.PORT}")
        
        # Validate max file size
        if Config.MAX_FILE_SIZE_MB <= 0:
            errors.append(f"Invalid max file size: {Config.MAX_FILE_SIZE_MB}MB")
        
        return errors

# Create config instance
config = Config()

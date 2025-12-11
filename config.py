"""Central configuration for ImgCraft."""
import os
from dataclasses import dataclass, field
from typing import List, Set

from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()


def _to_bool(value: str, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


@dataclass
class Config:
    """Application configuration values with validation helpers."""

    # Flask / Server
    FLASK_ENV: str = os.getenv('FLASK_ENV', 'production')
    DEBUG: bool = _to_bool(os.getenv('FLASK_DEBUG'), False)
    SECRET_KEY: str = os.getenv('SECRET_KEY')
    HOST: str = os.getenv('HOST', os.getenv('SERVER_HOST', '0.0.0.0'))
    PORT: int = int(os.getenv('PORT', os.getenv('SERVER_PORT', 5000)))

    # Uploads & processing
    UPLOAD_FOLDER: str = os.getenv('UPLOAD_FOLDER', 'uploads')
    MAX_FILE_SIZE_MB: int = int(os.getenv('MAX_FILE_SIZE_MB', 32))
    ALLOWED_EXTENSIONS: Set[str] = field(default_factory=lambda: set(os.getenv('ALLOWED_EXTENSIONS', 'png,jpg,jpeg,gif,bmp,webp,ico').split(',')))
    MAX_PIXELS: int = int(os.getenv('MAX_PIXELS', 40_000_000))
    MAX_IMAGE_SIDE: int = int(os.getenv('MAX_IMAGE_SIDE', 8000))
    MAX_COLLAGE_IMAGES: int = int(os.getenv('MAX_COLLAGE_IMAGES', 6))
    MAX_COLLAGE_SIDE: int = int(os.getenv('MAX_COLLAGE_SIDE', 4000))

    # Logging
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE: str = os.getenv('LOG_FILE', 'logs/imgcraft.log')
    LOG_MAX_BYTES: int = int(os.getenv('LOG_MAX_BYTES', 10 * 1024 * 1024))
    LOG_BACKUP_COUNT: int = int(os.getenv('LOG_BACKUP_COUNT', 5))
    LOG_TO_STDOUT: bool = _to_bool(os.getenv('LOG_TO_STDOUT', 'true'), True)

    # Fonts - Cross-platform professional fonts
    DEFAULT_FONT_PATH: str = os.getenv('DEFAULT_FONT_PATH', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
    FALLBACK_FONT: str = os.getenv('FALLBACK_FONT', 'DejaVuSans')

    # External services
    SUPABASE_URL: str = os.getenv('SUPABASE_URL')
    SUPABASE_ANON_KEY: str = os.getenv('SUPABASE_ANON_KEY')
    SUPABASE_SERVICE_KEY: str = os.getenv('SUPABASE_SERVICE_KEY')
    RAZORPAY_KEY_ID: str = os.getenv('RAZORPAY_KEY_ID')
    RAZORPAY_KEY_SECRET: str = os.getenv('RAZORPAY_KEY_SECRET')
    RAZORPAY_WEBHOOK_SECRET: str = os.getenv('RAZORPAY_WEBHOOK_SECRET')

    # Ads / Misc
    GOOGLE_PUBLISHER_ID: str = os.getenv('GOOGLE_PUBLISHER_ID', 'ca-pub-5547900968688861')

    # Launch / rollout controls - COMING_SOON_MODE removed, site is live

    # Derived
    MAX_CONTENT_LENGTH: int = field(init=False)
    REQUIRED_ENV_VARS: List[str] = field(default_factory=lambda: [
        'SECRET_KEY',
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_KEY',
        'RAZORPAY_KEY_ID',
        'RAZORPAY_KEY_SECRET',
        'RAZORPAY_WEBHOOK_SECRET'
    ])

    def __post_init__(self) -> None:
        self.MAX_CONTENT_LENGTH = self.MAX_FILE_SIZE_MB * 1024 * 1024
        # Normalize allowed extensions to lowercase with no whitespace
        self.ALLOWED_EXTENSIONS = {ext.strip().lower() for ext in self.ALLOWED_EXTENSIONS if ext}

    def init_app(self, app) -> None:
        """Ensure filesystem prerequisites exist and sync Flask config."""
        os.makedirs(self.UPLOAD_FOLDER, exist_ok=True)
        log_dir = os.path.dirname(self.LOG_FILE)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
        app.config['MAX_CONTENT_LENGTH'] = self.MAX_CONTENT_LENGTH

    def validate(self) -> List[str]:
        """Return a list of validation warnings/errors."""
        errors: List[str] = []

        missing = [name for name in self.REQUIRED_ENV_VARS if not getattr(self, name)]
        if missing:
            errors.append(f"Missing required environment variables: {', '.join(missing)}")

        if not (1 <= self.PORT <= 65535):
            errors.append(f"Invalid port number: {self.PORT}")

        if self.MAX_FILE_SIZE_MB <= 0:
            errors.append('MAX_FILE_SIZE_MB must be greater than zero')

        if self.MAX_PIXELS <= 0:
            errors.append('MAX_PIXELS must be greater than zero')

        if not os.path.exists(self.DEFAULT_FONT_PATH):
            errors.append(f"Font file not found: {self.DEFAULT_FONT_PATH}")

        return errors

    def require(self) -> None:
        """Raise immediately if critical configuration is missing."""
        missing = [name for name in self.REQUIRED_ENV_VARS if not getattr(self, name)]
        if missing:
            raise RuntimeError(
                'Missing required environment variables: ' + ', '.join(missing)
            )


config = Config()

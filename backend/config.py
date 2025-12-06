import os
from dotenv import load_dotenv
from pathlib import Path

# Get the directory where config.py is located
basedir = Path(__file__).resolve().parent

# Load .env file from the backend directory
dotenv_path = basedir / '.env'
load_dotenv(dotenv_path)

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'hard-to-guess-string'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Supabase Settings
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_KEY = os.environ.get('SUPABASE_ANON_KEY')
    SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

    # Email configuration
    SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
    SMTP_USER = os.environ.get('SMTP_USER')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')
    EMAIL_FROM = os.environ.get('EMAIL_FROM')
    EMAIL_FROM_NAME = os.environ.get('EMAIL_FROM_NAME', 'FileEncryption App')

    # File Upload Settings
    STORAGE_BUCKET = 'encrypted-files'
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
    ALLOWED_FILE_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg', '.docx'}
    UPLOAD_FOLDER = '/tmp/uploads'

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or \
        'sqlite:///data-dev.sqlite'

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL') or \
        'sqlite://'

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///data.sqlite'

config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

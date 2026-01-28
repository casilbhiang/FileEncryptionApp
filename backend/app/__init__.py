from flask import Flask
from flask_cors import CORS
from config import config

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Enable CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })
    
    # Register blueprints
    from app.api.auth import auth_bp
    from app.api.keys import keys_bp
    from app.api.files import files_bp
    from app.api.audit import audit_bp
    from app.api.shares import shares_bp
    from app.api.biometric import biometric_bp
    from app.api.notifications import notifications_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(keys_bp, url_prefix='/api/keys')
    app.register_blueprint(files_bp, url_prefix='/api/files')
    app.register_blueprint(audit_bp, url_prefix='/api/audit')
    app.register_blueprint(shares_bp, url_prefix='/api/shares')
    app.register_blueprint(biometric_bp, url_prefix='/api/auth/biometric')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    
    @app.route('/')
    def home():
        return {'message': 'Backend is running!'}, 200
    
    @app.route('/health')
    def health():
        return {'status': 'healthy'}, 200
    
    @app.route('/api/status')
    def api_status():
        return {
            'status': 'online',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/api/auth',
                'keys': '/api/keys',
                'files': '/api/files',
                'audit': '/api/audit',
                'shares': '/api/shares',
                'biometric': '/api/auth/biometric',
                'notifications': '/api/notifications'
            }
        }, 200
    
    # Add after_request handler for CORS headers
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
    
    return app
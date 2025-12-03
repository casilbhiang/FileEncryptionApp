from flask import Flask
from flask_cors import CORS
from config import config

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Enable CORS
    CORS(app)
    
    # Register blueprints
    from app.api.keys import keys_bp
    from app.api.files import files_bp
    from app.api.audit import audit_bp
    
    app.register_blueprint(keys_bp, url_prefix='/api/keys')
    app.register_blueprint(files_bp, url_prefix='/api/files')
    app.register_blueprint(audit_bp, url_prefix='/api/audit')
    
    @app.route('/health')
    def health():
        return {'status': 'healthy'}, 200
    
    @app.route('/api/status')
    def api_status():
        return {
            'status': 'online',
            'version': '1.0.0',
            'endpoints': {
                'keys': '/api/keys',
                'files': '/api/files',
                'audit': '/api/audit'
            }
        }, 200
    
    return app

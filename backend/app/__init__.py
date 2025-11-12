from flask import Flask
from flask_cors import CORS
from config import config

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Enable CORS
    CORS(app)
    
    # Register blueprints (we'll create these later)
    # from app.api import api_bp
    # app.register_blueprint(api_bp, url_prefix='/api')
    
    @app.route('/health')
    def health():
        return {'status': 'healthy'}, 200
    
    return app
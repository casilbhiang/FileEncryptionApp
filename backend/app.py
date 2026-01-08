from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
from app.api.files import files_bp
from app.api.shares import shares_bp
from app.api.biometric import biometric_bp

# Load environment variables from .env file
load_dotenv()

# Create Flask app
app = Flask(__name__)

# Allow frontend to connect
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-User-ID"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

# Connect to file routes
app.register_blueprint(files_bp)

# Connect to dashboard routes
app.register_blueprint(shares_bp)

# Connect to biometric routes
app.register_blueprint(biometric_bp)

# Test route
@app.route('/')
def home():
    return {'message': 'Backend is running!'}, 200

# Health check route
@app.route('/health')
def health():
    return {'status': 'OK'}, 200

# Test route for file API
@app.route('/test')
def test():
    return {'message': 'Test endpoint working'}, 200

# Start server
if __name__ == '__main__':
    print("Server starting on http://localhost:5000")
    print("Biometric routes registered")
    app.run(debug=True, port=5000, host='0.0.0.0')
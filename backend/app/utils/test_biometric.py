"""
Standalone test Flask app for biometric routes.
Run this to verify your biometric blueprint works correctly.
"""
from flask import Flask, Blueprint, request, jsonify
from flask_cors import CORS
import secrets
import base64

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
    }
})

# Create biometric blueprint
biometric_bp = Blueprint('biometric', __name__)

@biometric_bp.route('/challenge', methods=['POST', 'OPTIONS'])
def generate_challenge():
    print(f"Received {request.method} request to /challenge")
    
    if request.method == "OPTIONS":
        return '', 204
    
    try:
        data = request.get_json()
        print(f"Request data: {data}")
        
        user_id = data.get('user_id')
        challenge_type = data.get('type')
        
        if not user_id or not challenge_type:
            return jsonify({'message': 'Missing required fields'}), 400
        
        # Generate random challenge (32 bytes)
        challenge = secrets.token_bytes(32)
        challenge_b64 = base64.b64encode(challenge).decode('utf-8')
        
        response_data = {
            'challenge': challenge_b64
        }
        
        # For authentication, return empty credential_ids for now
        if challenge_type == 'authentication':
            response_data['credential_ids'] = []
        
        print(f"Challenge generated successfully for user {user_id}")
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': 'Failed to generate challenge', 'error': str(e)}), 500

@biometric_bp.route('/register', methods=['POST', 'OPTIONS'])
def register_biometric():
    print(f"Received {request.method} request to /register")
    
    if request.method == "OPTIONS":
        return '', 204
    
    return jsonify({'message': 'Registration endpoint working'}), 200

@biometric_bp.route('/verify', methods=['POST', 'OPTIONS'])
def verify_biometric():
    print(f"Received {request.method} request to /verify")
    
    if request.method == "OPTIONS":
        return '', 204
    
    return jsonify({'message': 'Verification endpoint working'}), 200

@biometric_bp.route('/check', methods=['GET', 'OPTIONS'])
def check_biometric():
    print(f"Received {request.method} request to /check")
    
    if request.method == "OPTIONS":
        return '', 204
    
    user_id = request.args.get('user_id')
    return jsonify({'has_biometric': False, 'user_id': user_id}), 200

# Register blueprint with the prefix
app.register_blueprint(biometric_bp, url_prefix='/api/auth/biometric')

# Add after_request handler
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/')
def home():
    return {'message': 'Test server is running!'}, 200

if __name__ == '__main__':
    print("\n" + "="*60)
    print("REGISTERED ROUTES:")
    print("="*60)
    for rule in app.url_map.iter_rules():
        methods = ','.join(sorted(rule.methods - {'HEAD'}))
        print(f"{rule.rule:50s} {methods}")
    print("="*60 + "\n")
    
    print("Starting test server on http://127.0.0.1:5000")
    print("Test the endpoint with:")
    print('curl -X POST http://127.0.0.1:5000/api/auth/biometric/challenge \\')
    print('  -H "Content-Type: application/json" \\')
    print('  -d \'{"user_id": "test", "type": "registration"}\'')
    print()
    
    app.run(debug=True, port=5000)
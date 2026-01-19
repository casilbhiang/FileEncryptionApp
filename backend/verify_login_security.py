
import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def test_login_sanitization():
    print("Testing Login Input Sanitization...")
    
    # 1. Valid Input
    valid_payload = {
        "role": "doctor",
        "userId": "TESTDOC-123",
        "password": "password123",
        "nric": "S1234567A"
    }
    # Note: This might fail on actual login if user doesn't exist, but should pass validation
    try:
        # 2. Invalid Role (SQL Injection attempt)
        invalid_role = {
            "role": "doctor' OR '1'='1",
            "userId": "TESTDOC-123",
            "password": "password",
            "nric": "S1234567A"
        }
        res = requests.post(f"{BASE_URL}/api/auth/login", json=invalid_role)
        if res.status_code == 400 and "Invalid role" in res.text:
             print("✅ Role sanitization passed")
        else:
             print(f"❌ Role sanitization failed: {res.status_code} - {res.text}")

        # 3. Invalid User ID (Script injection)
        invalid_userid = {
            "role": "doctor",
            "userId": "<script>alert(1)</script>",
            "password": "password",
            "nric": "S1234567A"
        }
        res = requests.post(f"{BASE_URL}/api/auth/login", json=invalid_userid)
        if res.status_code == 400 and "Invalid User ID" in res.text:
             print("✅ User ID sanitization passed")
        else:
             print(f"❌ User ID sanitization failed: {res.status_code} - {res.text}")
             
        # 4. Invalid NRIC
        invalid_nric = {
            "role": "doctor",
            "userId": "TESTDOC-123",
            "password": "password",
            "nric": "S1234567A; DROP TABLE users;"
        }
        res = requests.post(f"{BASE_URL}/api/auth/login", json=invalid_nric)
        if res.status_code == 400 and "Invalid NRIC" in res.text:
             print("✅ NRIC sanitization passed")
        else:
             print(f"❌ NRIC sanitization failed: {res.status_code} - {res.text}")

    except requests.exceptions.ConnectionError:
        print("⚠️ Backend is not running. Please start the backend to run this test.")

if __name__ == "__main__":
    test_login_sanitization()

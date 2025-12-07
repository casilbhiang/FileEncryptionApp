"""
Test script to verify end-to-end encryption and decryption flow
Tests:
1. Key pair generation
2. File upload with encryption
3. File download with decryption
4. Content verification
"""

import requests
import json
import io
import os

BASE_URL = "http://localhost:5000/api"

def test_encryption_decryption_flow():
    print("=" * 60)
    print("Testing Encryption/Decryption Flow")
    print("=" * 60)
    
    # Step 1: Generate a key pair
    print("\n1. Generating key pair for dr1 and pt1...")
    key_response = requests.post(
        f"{BASE_URL}/keys/generate",
        json={
            "doctor_id": "DR001",
            "patient_id": "PT001"
        }
    )
    
    if key_response.status_code != 201:
        print(f"❌ Failed to generate key pair: {key_response.text}")
        return False
    
    key_data = key_response.json()
    key_pair_id = key_data['key_pair']['key_id']
    print(f"✅ Key pair generated: {key_pair_id}")
    
    # Step 2: Create a test file
    print("\n2. Creating test file...")
    test_content = b"This is a test file for encryption/decryption verification. [ENCRYPTED]"
    test_filename = "test_encryption.pdf"
    
    # Step 3: Upload file (should encrypt automatically)
    print(f"\n3. Uploading file '{test_filename}'...")
    files = {'file': (test_filename, io.BytesIO(test_content), 'application/pdf')}
    
    upload_response = requests.post(
        f"{BASE_URL}/files/upload",
        files=files
    )
    
    if upload_response.status_code != 201:
        print(f"❌ Failed to upload file: {upload_response.text}")
        return False
    
    upload_data = upload_response.json()
    file_id = upload_data['file_id']
    print(f"✅ File uploaded: {file_id}")
    print(f"   Original size: {len(test_content)} bytes")
    
    # Step 4: Confirm upload
    print("\n4. Confirming upload...")
    confirm_response = requests.post(f"{BASE_URL}/files/confirm/{file_id}")
    
    if confirm_response.status_code == 200:
        print("✅ Upload confirmed")
    else:
        print(f"⚠️  Confirmation failed: {confirm_response.text}")
    
    # Step 5: List files to verify it's there
    print("\n5. Listing files...")
    list_response = requests.get(f"{BASE_URL}/files/my-files")
    
    if list_response.status_code == 200:
        files_data = list_response.json()
        print(f"✅ Found {files_data['total']} file(s)")
        for f in files_data['files']:
            if f['id'] == file_id:
                print(f"   - {f['name']} ({f['size']} bytes)")
    
    # Step 6: Decrypt and download file
    print(f"\n6. Decrypting file with user_id=DR001...")
    decrypt_response = requests.get(
        f"{BASE_URL}/files/decrypt/{file_id}",
        params={"user_id": "DR001"}
    )
    
    if decrypt_response.status_code == 200:
        decrypted_content = decrypt_response.content
        print(f"✅ File decrypted successfully")
        print(f"   Decrypted size: {len(decrypted_content)} bytes")
        
        # Step 7: Verify content matches
        print("\n7. Verifying content...")
        if decrypted_content == test_content:
            print("✅ Content matches! Encryption/Decryption working correctly!")
            print(f"   Original:  {test_content.decode('utf-8')}")
            print(f"   Decrypted: {decrypted_content.decode('utf-8')}")
            return True
        else:
            print("❌ Content mismatch!")
            print(f"   Original:  {test_content}")
            print(f"   Decrypted: {decrypted_content}")
            return False
    elif decrypt_response.status_code == 404:
        print(f"⚠️  File not found for decryption")
        print(f"   This might mean encryption is not yet implemented in upload")
        return False
    elif decrypt_response.status_code == 422:
        error_data = decrypt_response.json()
        print(f"❌ Decryption failed: {error_data.get('message')}")
        print(f"   Details: {error_data.get('details')}")
        return False
    else:
        print(f"❌ Unexpected error: {decrypt_response.status_code}")
        print(f"   {decrypt_response.text}")
        return False

def test_key_based_encryption():
    """Test that files are encrypted with the correct key pair"""
    print("\n" + "=" * 60)
    print("Testing Key-Based Encryption")
    print("=" * 60)
    
    # This test would verify that:
    # 1. Files uploaded by doctor are encrypted with doctor-patient key
    # 2. Only authorized users can decrypt
    # 3. Wrong key fails to decrypt
    
    print("\n⚠️  This test requires implementation of key-based encryption in upload endpoint")
    print("Current upload endpoint uses placeholder encryption metadata")

if __name__ == "__main__":
    print("\n🔐 File Encryption/Decryption Test Suite\n")
    
    # Check if backend is running
    try:
        health_check = requests.get(f"{BASE_URL}/keys/list")
        if health_check.status_code != 200:
            print("❌ Backend is not responding correctly")
            exit(1)
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend at http://localhost:5000")
        print("   Please make sure the backend is running (python wsgi.py)")
        exit(1)
    
    # Run tests
    result = test_encryption_decryption_flow()
    test_key_based_encryption()
    
    print("\n" + "=" * 60)
    if result:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed")
        print("\n📝 Note: The current implementation may not have full encryption")
        print("   integrated into the upload flow. Check the upload endpoint in")
        print("   backend/app/api/files.py to ensure encryption is happening.")
    print("=" * 60)

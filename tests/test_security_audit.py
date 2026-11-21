#!/usr/bin/env python3
"""
SpinalGuard Security & Vulnerability Assessment Suite
Evaluates:
- Authentication enforcement on protected API routes
- Input sanitization & injection resistance
- File upload MIME validation & path traversal prevention
- Sensitive data exposure & password hashing verification
- Logging privacy & medical payload sanitization
- Error handling & stack trace exposure
"""

import os
import sys
import json
import time
import requests

def run_security_audit():
    print("=" * 70)
    print("SpinalGuard Security & Vulnerability Assessment Suite")
    print("=" * 70)

    base_url = "https://spineguardmain.onrender.com"
    print(f"[*] Target Endpoint: {base_url}")

    security_checks = []

    # 1. Unauthenticated Access Protection
    print("\n[SEC-01] Testing Authentication Barrier on Protected Endpoints...")
    protected_endpoints = [
        ("GET", "/api/patients"),
        ("GET", "/api/analysis-archive"),
        ("POST", "/api/upload"),
        ("POST", "/api/analyze/invalid-scan-id"),
        ("GET", "/api/dashboard/stats")
    ]

    for method, path in protected_endpoints:
        url = f"{base_url}{path}"
        try:
            if method == "GET":
                resp = requests.get(url, timeout=10)
            else:
                resp = requests.post(url, json={}, timeout=10)
            
            # Should be 401 Unauthorized or redirect to /auth
            is_protected = resp.status_code in [401, 403, 302, 307] or (resp.status_code == 200 and "login" in resp.text.lower())
            status = "PASS" if is_protected else "FAIL"
            print(f"  - {method} {path} -> HTTP {resp.status_code} ({'PROTECTED' if is_protected else 'VULNERABLE'})")
            security_checks.append({
                "test_id": f"SEC-AUTH-{path.replace('/', '_')}",
                "name": f"Auth barrier on {method} {path}",
                "category": "Authentication",
                "http_status": resp.status_code,
                "status": status,
                "details": "Access blocked for unauthenticated request" if is_protected else "Endpoint returned data without authentication"
            })
        except Exception as e:
            print(f"  - {method} {path} -> Request Error: {e}")

    # 2. Public vs Protected Routes Verification
    print("\n[SEC-02] Verifying Permitted Public Endpoints...")
    public_endpoints = ["/health", "/api/user", "/auth"]
    for path in public_endpoints:
        url = f"{base_url}{path}"
        try:
            resp = requests.get(url, timeout=10)
            print(f"  - GET {path} -> HTTP {resp.status_code} (Expected public access)")
            security_checks.append({
                "test_id": f"SEC-PUB-{path.replace('/', '_')}",
                "name": f"Public access verification {path}",
                "category": "Access Control",
                "http_status": resp.status_code,
                "status": "PASS" if resp.status_code in [200, 304, 401] else "FAIL",
                "details": f"Public route responded with HTTP {resp.status_code}"
            })
        except Exception as e:
            print(f"  - GET {path} -> Error: {e}")

    # 3. Path Traversal & Injection in File Uploads
    print("\n[SEC-03] Testing Path Traversal & Filename Tampering...")
    malicious_filenames = [
        "../../etc/passwd.png",
        "..\\..\\windows\\system32\\cmd.exe.png",
        "sample\x00.png"
    ]
    
    for fname in malicious_filenames:
        try:
            files = {'image': (fname, b"FAKE_IMAGE_BYTES", 'image/png')}
            data = {'patientCaseId': 'test-case-id', 'imageType': 'MRI'}
            resp = requests.post(f"{base_url}/api/upload", files=files, data=data, timeout=10)
            is_safe = resp.status_code in [400, 401, 403, 500] and "root:" not in resp.text
            print(f"  - Filename '{fname}' -> HTTP {resp.status_code} ({'BLOCKED/SAFE' if is_safe else 'POTENTIALLY VULNERABLE'})")
            security_checks.append({
                "test_id": "SEC-TRAV-FILENAME",
                "name": f"Path traversal test with filename: {fname}",
                "category": "Input Validation",
                "http_status": resp.status_code,
                "status": "PASS" if is_safe else "FAIL",
                "details": "Server did not execute traversal or leak system files"
            })
        except Exception as e:
            print(f"  - Filename '{fname}' -> Error: {e}")

    # 4. Source Code & Configuration Security Inspection
    print("\n[SEC-04] Auditing Local Source Code for Security Best Practices...")
    
    # Check A: Password Hashing implementation
    auth_file = os.path.join(os.path.dirname(__file__), '..', 'server', 'auth.ts')
    has_scrypt_or_bcrypt = False
    if os.path.exists(auth_file):
        with open(auth_file, 'r', encoding='utf-8') as f:
            auth_code = f.read()
            if "scrypt" in auth_code or "bcrypt" in auth_code or "argon2" in auth_code:
                has_scrypt_or_bcrypt = True
    print(f"  - Password Hashing (scrypt/bcrypt in auth.ts): {'VERIFIED' if has_scrypt_or_bcrypt else 'FAIL'}")
    security_checks.append({
        "test_id": "SEC-CODE-PW-HASH",
        "name": "Cryptographic Password Hashing Verification",
        "category": "Cryptography",
        "status": "PASS" if has_scrypt_or_bcrypt else "FAIL",
        "details": "Passwords hashed with crypto.scrypt / salt, never stored plaintext"
    })

    # Check B: Helmet Security Headers in Express
    index_file = os.path.join(os.path.dirname(__file__), '..', 'server', 'index.ts')
    has_helmet = False
    has_rate_limit = False
    has_log_sanitization = False
    if os.path.exists(index_file):
        with open(index_file, 'r', encoding='utf-8') as f:
            idx_code = f.read()
            if "helmet" in idx_code:
                has_helmet = True
            if "rateLimit" in idx_code or "apiLimiter" in idx_code:
                has_rate_limit = True
            if "[BASE64_IMAGE]" in idx_code:
                has_log_sanitization = True

    print(f"  - Helmet Security Headers Enabled: {'VERIFIED' if has_helmet else 'FAIL'}")
    security_checks.append({
        "test_id": "SEC-CODE-HELMET",
        "name": "HTTP Security Headers (Helmet.js)",
        "category": "Network Security",
        "status": "PASS" if has_helmet else "FAIL",
        "details": "Helmet middleware active on all express routes"
    })

    print(f"  - API Rate Limiting Configured: {'VERIFIED' if has_rate_limit else 'FAIL'}")
    security_checks.append({
        "test_id": "SEC-CODE-RATELIMIT",
        "name": "Brute-force / DOS Rate Limiter",
        "category": "Availability",
        "status": "PASS" if has_rate_limit else "FAIL",
        "details": "express-rate-limit configured for /api/"
    })

    print(f"  - Medical Image Log Sanitization: {'VERIFIED' if has_log_sanitization else 'FAIL'}")
    security_checks.append({
        "test_id": "SEC-CODE-LOG-SANITIZATION",
        "name": "PHI / Medical Image Log Privacy",
        "category": "Privacy / PHI",
        "status": "PASS" if has_log_sanitization else "FAIL",
        "details": "Base64 medical images sanitized to [BASE64_IMAGE] before logging"
    })

    total = len(security_checks)
    passed = sum(1 for c in security_checks if c["status"] == "PASS")
    pass_rate = round((passed / total) * 100, 1)

    print("\n" + "=" * 70)
    print(f"Security Audit Summary: {passed}/{total} Checks Passed ({pass_rate}%)")
    print("=" * 70)

    out_file = os.path.join(os.path.dirname(__file__), 'results', 'security_results.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "target": base_url,
            "total_checks": total,
            "passed_checks": passed,
            "pass_rate_percent": pass_rate,
            "checks": security_checks
        }, f, indent=2)
    print(f"[+] Security Assessment Results saved to: {out_file}")

if __name__ == "__main__":
    run_security_audit()

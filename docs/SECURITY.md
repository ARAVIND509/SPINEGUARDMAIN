# SpineGuard AI — Security Architecture & Access Control Specification

> **Classification:** Confidential Medical System Security Document  
> **Compliance Standard:** HIPAA Security Rule & OWASP Top 10 Defenses  
> **Updated:** November 2026  

---

## 1. Security Architecture Overview

Medical imaging applications handle Protected Health Information (PHI). SpineGuard AI implements defense-in-depth security principles across authentication, session management, access control, storage integrity, and auditability.

---

## 2. Authentication & Session Management

- **Password Hashing:** Passwords are salted and hashed using `scrypt` with a cryptographically secure 16-byte random salt generated via `crypto.randomBytes(16)`.
- **Timing Attack Mitigation:** Password verification uses `crypto.timingSafeEqual` over fixed-length buffer digests, eliminating side-channel timing attacks.
- **Session Architecture:** Sessions are managed by `express-session` with a persistent SQLite/PostgreSQL session store. Session cookies are HTTP-only, enforce `SameSite=Lax`, and enable `secure: true` in production environments behind reverse proxies.
- **Protected Endpoints:** All `/api/*` endpoints (except `/api/login`, `/api/register`, and `/api/logout`) are gated by `ensureAuthenticated` middleware.

---

## 3. Role-Based Access Control (RBAC) Matrix

| Resource / Action | Administrator (`admin`) | Clinical Reviewer (`reviewer`) | Read-Only User (`viewer`) |
| :--- | :---: | :---: | :---: |
| View Owned Patients & Scans | Allowed | Allowed | Allowed |
| View All Patients (Cross-Tenant) | Allowed (Governance) | Denied (IDOR Blocked) | Denied |
| Upload Medical Scans | Allowed | Allowed | Denied |
| Trigger AI Inference | Allowed | Allowed | Denied |
| Submit Clinical Review (Accept/Reject/Modify) | Allowed | Allowed | **DENIED (HTTP 403)** |
| Finalize & Lock Diagnostic Report | Allowed | Allowed | **DENIED (HTTP 403)** |
| View System Audit Logs | **ALLOWED** | Denied (HTTP 403) | Denied (HTTP 403) |

---

## 4. Insecure Direct Object Reference (IDOR) Protection

In earlier prototypes, client-provided IDs (`scanId`, `patientCaseId`) could be queried directly without ownership verification.

**Modernization Fix:**
1. **Patient Isolation:** `storage.getPatient(id, userId)` strictly matches `patient.userId === userId` unless the requester possesses administrative credentials.
2. **Scan Ownership:** `GET /api/scans/:patientCaseId` and `GET /api/scans/single/:scanId` cross-reference the patient's owning `userId`. Unauthorized cross-doctor requests are rejected with HTTP 403 or HTTP 404.
3. **Analysis & Report Access:** `GET /api/analysis/:scanId` ensures the requesting user owns the underlying scan before returning clinical predictions.
4. **Review Tampering Prevention:** `POST /api/analysis/:id/review` and `POST /api/analysis/:id/finalize` verify patient ownership at the database level before committing modifications.

---

## 5. Storage Integrity & Path Traversal Defenses

- **No Base64 Blobs in SQL:** Medical scans are written as binary files directly to disk or object storage (`uploads/scans/`). Only sanitized URL pointers are stored in the database.
- **UUID-Based Storage Identifiers:** File names are sanitized and appended with cryptographically random UUIDs:
  `{timestamp}-{sanitized_base}-{uuid}.{ext}`
- **Path Traversal Elimination:** The `sanitizeFileName` and `resolveScanFilePath` routines reject dangerous directory traversal tokens (`..`, `/`, `\`), ensuring file retrieval is locked strictly within the scans root directory.
- **Private Content Headers:** All file delivery endpoints transmit `Cache-Control: private, max-age=86400` and `X-Content-Type-Options: nosniff` headers.

---

## 6. Audit Logging & Compliance Trails

Every clinical action in SpineGuard is permanently recorded in the `audit_logs` table:
- **Events Tracked:**
  - `ANALYSIS_REVIEW_SUBMITTED`: Logged when an authorized reviewer accepts, rejects, or modifies AI findings.
  - `REPORT_FINALIZED`: Logged when a diagnostic report is locked.
  - `SCAN_UPLOADED`: Logged when new medical imagery is stored.
- **Audit Schema Attributes:** `id`, `userId`, `action`, `resource`, `details` (JSON payload with reviewer decisions), `ipAddress`, and `timestamp`.
- **Access Restrictions:** The `/api/audit-logs` endpoint is strictly restricted to users with the `admin` role.

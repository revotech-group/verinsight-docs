# VerInsight — Verification Ingestion API Contract

**Version:** 1.0  
**Date:** February 2026  
**Audience:** truuth Development Team  
**Status:** Draft

---

## Purpose

This document defines the API contract for pushing verification results from truuth services into VerInsight. It covers the ingestion endpoint, request format, and per-type payload requirements for the following verification types:

- `face_auth` — Face Authentication
- `idv` — Identity Verification
- `doc_fraud` — Document Fraud Detection
- `repeat_image` — Repeat Image Check
- `repeat_text` — Repeat Text Check

---

## 1. Endpoint

```
POST /v1/verifications
Authorization: Bearer <api_key>
Content-Type: application/json
```

Authentication is API key only (system-to-system).

---

## 2. Request Format

All requests use the following envelope:

```json
{
  "verification_type": "face_auth",
  "idempotency_key": "5b48597e-3f53-464c-adc2-008f61b33636",
  "data": {
    // raw truuth service payload
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `verification_type` | string | Yes | The verification type key. Must match an active platform type. |
| `idempotency_key` | string | No | Caller-supplied key to prevent duplicate submissions. If the same key is received more than once, the second request returns the original result without creating a new record. |
| `data` | object | Yes | The raw payload from the truuth verification service. |

---

## 3. Data Block

The `data` object contains the service's native event payload. Its structure is specific to each service and is agreed upon during integration setup.

### 3.1 Conventions

**Include status and outcome fields.** Every event should include the service's own status/result fields indicating the outcome of the verification (e.g., pass/fail, verified/denied).

**Include identity fields.** Include the primary identity value for the verification subject (e.g., email address, phone number, document number).

**Include reference IDs.** Include session IDs, check IDs, or other identifiers that tenants use to cross-reference with the source service.

**Include scores and thresholds as raw values.** Send numeric values as-is.

**Use `metadata` for tenant-injectable fields.** If your service allows tenants to inject custom key-value pairs (e.g., `employee_id`, `branch_code`), place them in `data.metadata` alongside service-specific fields:

```json
"data": {
  "username": "user@example.com",
  "metadata": {
    "similarity": 95,
    "similarityThreshold": 70,
    "employee_id": "EMP-5678",
    "branch_code": "SYD-001"
  }
}
```

Tenant-configured fields are automatically recognised. Service-specific fields (like `similarity`) are ignored unless explicitly configured.

> **Tip:** No coordination is required to support tenant-injectable fields — just place them in `data.metadata`.

### 3.2 Media Files

If your event includes media files (images, PDFs, scans), include them as **pre-signed S3 URLs** within `data`. Do not inline binary content or base64-encoded data.

**Requirements:**

- Pre-signed S3 URLs with a **minimum 48-hour TTL**
- VerInsight copies files asynchronously — the 48-hour window provides time for retries
- Once copied, the original URL's expiry is irrelevant

```json
"data": {
  "face_image_url": "https://s3.ap-southeast-2.amazonaws.com/truuth-media/...",
  "document_scan_url": "https://s3.ap-southeast-2.amazonaws.com/truuth-media/..."
}
```

---

## 4. Response

### 4.1 Success (200)

```json
{
  "object": "verification",
  "id": "ver_xyz789",
  "verification_type": "face_auth"
}
```

### 4.2 Duplicate Submission (200)

Returned when an `idempotency_key` is reused. Returns the original verification object unchanged.

### 4.3 Conflict (409)

Returned when a `source_verification_id` already exists with a different payload (single mode only).

```json
{
  "error": {
    "type": "conflict_error",
    "code": "duplicate_source_verification",
    "message": "A verification with source_verification_id '5b48597e-...' already exists with different data",
    "existing_verification_id": "ver_xyz789"
  }
}
```

### 4.4 Validation Error (400)

```json
{
  "error": {
    "type": "validation_error",
    "code": "invalid_payload",
    "message": "Required field 'auditLogId' is missing or null"
  }
}
```

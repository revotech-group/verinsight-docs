# VerInsight Webhook Integration Guide

**Version:** 1.0  
**Date:** February 2026  
**Audience:** truuth Development Teams  
**Status:** Draft

---

## 1. Overview

This document defines the webhook contract for truuth services to send verification events to the VerInsight platform.

Each truuth service sends events to a tenant-scoped ingestion endpoint using a common envelope structure. The envelope carries a service-specific `data` block containing the native event payload.

**Base URL:**

```
https://api.truuth.id
```

**Endpoint:**

```
POST /v1/ingest/{tenant_alias}
```

The `tenant_alias` path parameter is the truuth tenant slug (e.g., `acme`, `westpac`).

---

## 2. Authentication

Requests are authenticated using HMAC-SHA256 signatures. There are no API keys or Bearer tokens.

### 2.1 HMAC Signature

Every request must include a signature proving payload integrity and authenticity.

**Required headers:**

| Header | Description | Example |
|--------|-------------|---------|
| `X-Signature` | HMAC-SHA256 signature | `sha256=a1b2c3d4e5f6...` |
| `X-Timestamp` | Unix timestamp (seconds) when the request was signed | `1711929600` |

**Signature computation:**

```
signing_payload = <X-Timestamp value> + "." + <raw request body>
signature = HMAC-SHA256(signing_payload, shared_secret)
header_value = "sha256=" + hex(signature)
```

**Python:**

```python
import hmac, hashlib, time, json

timestamp = str(int(time.time()))
body = json.dumps(payload)  # raw JSON body as sent

signing_payload = timestamp + "." + body
signature = hmac.new(
    shared_secret.encode(),
    signing_payload.encode(),
    hashlib.sha256
).hexdigest()

headers = {
    "X-Signature": f"sha256={signature}",
    "X-Timestamp": timestamp
}
```

**Go:**

```go
func SignPayload(body []byte, secret string) (signature string, timestamp string) {
    ts := strconv.FormatInt(time.Now().Unix(), 10)
    signingPayload := ts + "." + string(body)

    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(signingPayload))
    sig := hex.EncodeToString(mac.Sum(nil))

    return "sha256=" + sig, ts
}
```

**Node.js:**

```javascript
const crypto = require("crypto");

function signPayload(body, secret) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signingPayload = timestamp + "." + body;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(signingPayload)
    .digest("hex");

  return {
    "X-Signature": `sha256=${signature}`,
    "X-Timestamp": timestamp,
  };
}

// Usage
const body = JSON.stringify(payload);
const headers = signPayload(body, sharedSecret);

await fetch(`https://api.truuth.id/v1/ingest/${tenantAlias}`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...headers,
  },
  body,
});
```

### 2.2 Replay Protection

Requests where `X-Timestamp` is more than **5 minutes** from the server's current time are rejected. The timestamp is included in the signing payload, so modifying it invalidates the signature.

### 2.3 Shared Secrets

Each truuth service is assigned its own signing secret. A compromised secret affects only the service it belongs to.

> **Secret provisioning:** Secrets are exchanged during service integration setup. Contact the VerInsight platform team for issuance and rotation.

---

## 3. Request Format

### 3.1 Headers

```http
POST /v1/ingest/acme HTTP/1.1
Host: api.truuth.id
Content-Type: application/json
X-Signature: sha256=a1b2c3d4e5f6...
X-Timestamp: 1711929600
```

### 3.2 Envelope

Every request body follows this structure:

```json
{
  "api_version": "2026-03-06",
  "event_type": "<service_name>.completed",
  "event_id": "<unique UUID>",
  "timestamp": "<ISO 8601>",
  "data": { ... }
}
```

**Envelope fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `api_version` | string | Yes | Date-based version of the envelope contract (e.g., `"2026-03-06"`). |
| `event_type` | string | Yes | The service event type. See [§4 Event Types](#4-event-types). |
| `event_id` | string (UUID) | Yes | Globally unique event identifier. Used as the idempotency key — resubmitting the same `event_id` with an identical payload is a safe no-op (`202 Accepted`). Resubmitting with a different payload returns `409 Conflict`. |
| `timestamp` | string (ISO 8601) | Yes | When the event occurred. Must include timezone (UTC recommended). Example: `"2026-01-22T08:31:43.858Z"` |
| `data` | object | Yes | Service-specific event payload. Structure varies by service. See [§5 Data Block](#5-data-block). |

**Rules:**

- All envelope fields are **required**. Missing fields result in `400 Bad Request`.
- `event_id` must be a valid UUID (v4 recommended).
- `timestamp` must be valid ISO 8601.
- `api_version` must be a supported version. Unsupported versions result in `400 Bad Request`.

---

## 4. Event Types

### 4.1 Naming Convention

All event types follow the pattern `{service_name}.completed`. Each service emits a single event type when processing is finished.

### 4.2 Registered Event Types

| Event Type | Service | Description |
|------------|---------|-------------|
| `face_auth.completed` | Face Authentication | Face authentication challenge completed |
| `idv.completed` | Identity Verification | Identity document verification completed |
| `doc_fraud_check.completed` | Document Fraud Check | Document fraud analysis completed |
| `repeat_image_check.completed` | Repeat Image Check | Duplicate image detection completed |
| `repeat_text_check.completed` | Repeat Text Check | Duplicate text detection completed |

### 4.3 Service Details

#### Face Authentication (`face_auth.completed`)

Facial authentication challenge events used for login authentication. Each event represents a discrete face challenge attempt producing a pass or fail outcome based on similarity and liveness scoring.

#### Identity Verification (`idv.completed`)

Identity document verification results. Covers document capture, data extraction, and identity checks against authoritative sources.

#### Document Fraud Check (`doc_fraud_check.completed`)

Document fraud analysis results. Examines identity documents for signs of tampering, forgery, or other fraudulent modifications.

#### Repeat Image Check (`repeat_image_check.completed`)

Duplicate image detection results. Compares submitted images against previously seen images to detect reuse across different identity claims.

#### Repeat Text Check (`repeat_text_check.completed`)

Duplicate text detection results. Compares submitted identity text fields (names, addresses, document numbers) against previously seen values to detect reuse across different identity claims.

> **Adding new event types:** When building a new service integration, coordinate with the VerInsight platform team to register your event type before sending events.

---

## 5. Data Block

The `data` object contains the service's native event payload. Its structure is specific to each service and is agreed upon during integration setup.

### 5.1 Conventions

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

### 5.2 Media Files

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

## 6. Examples

### 6.1 Face Authentication — Pass

```http
POST /v1/ingest/acme HTTP/1.1
Host: api.truuth.id
Content-Type: application/json
X-Signature: sha256=a1b2c3d4e5f6...
X-Timestamp: 1711929600
```

```json
{
  "api_version": "2026-03-06",
  "event_type": "face_auth.completed",
  "event_id": "5b48597e-3f53-464c-adc2-008f61b33636",
  "timestamp": "2026-01-22T08:31:43.858Z",
  "data": {
    "sessionId": "4d66f9a5-9509-4ddc-9f4d-0cb5bca5ef47",
    "userId": "npB9HDsDeUhppGz7xDEN",
    "username": "applicant+user1@gmail.com",
    "clientId": "3C1ttDTUc2vTJ1JF8yqn",
    "clientName": "Acme Bank Demo",
    "projectId": "SqmXMOukuvqbYkVEGVGq",
    "flag": "NONE",
    "category": "LOGIN",
    "event": "Face Challenge Verified",
    "eventType": "FACE_CHALLENGE_VERIFIED",
    "authMethod": "FACE_ID",
    "challengeType": "FACE_VERIFIER",
    "status": "Verified",
    "challenge": "Face",
    "endpoint": {
      "userAgent": "Mozilla/5.0 ...",
      "ip": "104.28.125.3",
      "browser": { "name": "Mobile Safari", "version": "26.2", "major": "26" },
      "os": { "name": "iOS", "version": "18.7" },
      "device": { "vendor": "Apple", "model": "iPhone", "type": "mobile" },
      "location": {
        "countryCode": "AU",
        "country": "Australia",
        "latitude": -33.8689,
        "longitude": 151.2071,
        "administrativeArea": "New South Wales",
        "postalCode": "2000"
      }
    },
    "authenticator": { "type": "PHONE" },
    "metadata": {
      "similarity": 97,
      "similarityThreshold": 95,
      "livenessScore": 92,
      "livenessThreshold": 70,
      "employee_id": "EMP-5678"
    }
  }
}
```

### 6.2 Face Authentication — Fail

```json
{
  "api_version": "2026-03-06",
  "event_type": "face_auth.completed",
  "event_id": "a1b2c3d4-5678-9012-3456-789012345678",
  "timestamp": "2026-01-22T09:15:00.000Z",
  "data": {
    "sessionId": "b2c3d4e5-6789-0123-4567-890123456789",
    "userId": "npB9HDsDeUhppGz7xDEN",
    "username": "applicant+user1@gmail.com",
    "clientId": "3C1ttDTUc2vTJ1JF8yqn",
    "clientName": "Acme Bank Demo",
    "projectId": "SqmXMOukuvqbYkVEGVGq",
    "flag": "SUSPICIOUS",
    "category": "LOGIN",
    "event": "Face Challenge Denied",
    "eventType": "FACE_CHALLENGE_DENIED",
    "authMethod": "FACE_ID",
    "challengeType": "FACE_VERIFIER",
    "status": "Denied",
    "challenge": "Face",
    "endpoint": { "..." },
    "authenticator": { "type": "PHONE" },
    "metadata": {
      "similarity": 12,
      "similarityThreshold": 95,
      "livenessScore": 0,
      "livenessThreshold": 70
    }
  }
}
```

---

## 7. Responses

### 7.1 Success

**`202 Accepted`** — Event received.

```json
{
  "object": "event",
  "event_id": "5b48597e-3f53-464c-adc2-008f61b33636",
  "received_at": 1737535903
}
```

Idempotent replays (same `event_id`, same payload) also return `202`.

### 7.2 Errors

**`400 Bad Request`** — Envelope validation failed.

```json
{
  "error": {
    "type": "validation_error",
    "code": "missing_field",
    "message": "Required envelope field 'event_type' is missing"
  }
}
```

**`403 Forbidden`** — Signature validation failed.

```json
{
  "error": {
    "type": "authentication_error",
    "code": "invalid_signature",
    "message": "The request signature is invalid or the timestamp is outside the allowed window"
  }
}
```

**`404 Not Found`** — Unknown or inactive tenant.

```json
{
  "error": {
    "type": "routing_error",
    "code": "unknown_tenant",
    "message": "Tenant 'unknown_alias' is not registered or is inactive"
  }
}
```

**`409 Conflict`** — Duplicate `event_id` with different payload.

```json
{
  "error": {
    "type": "conflict_error",
    "code": "duplicate_event",
    "message": "An event with event_id '5b48597e-...' already exists with a different payload",
    "existing_verification_id": "ver_abc123"
  }
}
```

**`422 Unprocessable Entity`** — Unknown or inactive event type.

```json
{
  "error": {
    "type": "validation_error",
    "code": "unknown_event_type",
    "message": "Event type 'face_auth.expired' is not registered"
  }
}
```

---

## 8. Retry & Delivery Guidance

| Response Code | Meaning | Action |
|---------------|---------|--------|
| `202` | Accepted | No retry needed |
| `400` | Bad request | Do not retry — fix the payload |
| `403` | Signature failed | Do not retry — check secret and signing logic |
| `404` | Unknown tenant | Do not retry — check `tenant_alias` in URL |
| `409` | Duplicate with different payload | Do not retry — investigate `event_id` reuse |
| `422` | Unknown event type | Do not retry — register event type first |
| `429` | Rate limited | Retry after `Retry-After` header value |
| `500` | Server error | Retry with exponential backoff |
| `502`/`503`/`504` | Temporary failure | Retry with exponential backoff |

**Recommended retry strategy:**

- Max retries: 5
- Initial delay: 1 second
- Backoff multiplier: 2x (1s, 2s, 4s, 8s, 16s)
- Max delay: 60 seconds
- Include jitter to avoid thundering herd

---

## 9. Implementation Checklist

- [ ] **Coordinate event type registration** with the VerInsight platform team
- [ ] **Obtain signing secret** — one per service, exchanged during integration setup
- [ ] **Configure webhook URL per tenant** — `https://api.truuth.id/v1/ingest/{tenant_alias}`
- [ ] **Wrap native event payload** in the standard envelope (§3.2)
- [ ] **Generate UUID v4 for `event_id`** per event — must be unique, used for idempotency
- [ ] **Compute HMAC signature** on every request (§2.1)
- [ ] **Use pre-signed S3 URLs** for media files — minimum 48-hour TTL (§5.2)
- [ ] **Place tenant-injectable fields** in `data.metadata` (§5.1)
- [ ] **Handle response codes** — retry on `5xx` with exponential backoff; do not retry `4xx` except `429`
- [ ] **Test against VerInsight staging** before production deployment

---

## Appendix A: Envelope Schema (JSON Schema)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["api_version", "event_type", "event_id", "timestamp", "data"],
  "additionalProperties": false,
  "properties": {
    "api_version": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
      "description": "Date-based envelope version"
    },
    "event_type": {
      "type": "string",
      "minLength": 1,
      "description": "Service event type identifier"
    },
    "event_id": {
      "type": "string",
      "format": "uuid",
      "description": "Globally unique event identifier (idempotency key)"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of when the event occurred"
    },
    "data": {
      "type": "object",
      "description": "Service-specific event payload"
    }
  }
}
```

---

## Appendix B: Changelog

| Date | Version | Changes |
|------|---------|---------|
| February 2026 | 1.0 | Initial version |

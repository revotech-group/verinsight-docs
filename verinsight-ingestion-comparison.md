# VerInsight — Verification Ingestion: Approach Comparison

**Version:** 1.0
**Date:** March 2026
**Status:** Draft

---

## Executive Summary

VerInsight supports two approaches for ingesting verification results from truuth services. **Approach A (Direct API)** offers a lightweight REST endpoint with Bearer token authentication and a minimal three-field envelope, optimised for fast integration with minimal overhead. **Approach B (Webhook)** provides a webhook-style integration with HMAC-SHA256 request signing, tenant-scoped endpoints, a richer five-field envelope with built-in versioning and timestamps, and detailed retry guidance. Both approaches support the same verification types and share identical conventions for the `data` block, including media file handling via pre-signed S3 URLs and tenant-injectable metadata fields.

---

## Side-by-Side Comparison

| Dimension | Approach A — Direct API | Approach B — Webhook |
|-----------|------------------------|----------------------|
| **Authentication** | Bearer token (`Authorization: Bearer <api_key>`) | HMAC-SHA256 signature (`X-Signature` + `X-Timestamp` headers) |
| **Endpoint structure** | Single endpoint: `POST /v1/verifications` | Tenant-scoped: `POST /v1/ingest/{tenant_alias}` |
| **Envelope fields** | 3 fields: `verification_type`, `idempotency_key`, `data` | 5 fields: `api_version`, `event_type`, `event_id`, `timestamp`, `data` |
| **Idempotency** | Optional `idempotency_key` (caller-supplied) | Required `event_id` (UUID v4, doubles as idempotency key) |
| **Versioning** | None (endpoint path only: `/v1/`) | Explicit `api_version` field (date-based, e.g. `"2026-03-06"`) |
| **Security** | API key in header; relies on TLS for transport security | HMAC signature with per-service secrets + 5-minute replay protection window |
| **Response style** | Synchronous `200 OK` with verification object returned | Asynchronous `202 Accepted` with `event_id` acknowledgement |
| **Error codes** | 3 codes: `200`, `400`, `409` | 6 codes: `202`, `400`, `403`, `404`, `409`, `422` (plus `429`, `5xx` guidance) |
| **Retry guidance** | Not specified | Detailed: exponential backoff, 5 retries, jitter, per-status-code actions |
| **Tenant routing** | Determined server-side (not in request) | Explicit via `{tenant_alias}` path parameter |
| **Secret scope** | Single API key per integration | One signing secret per service (blast-radius isolation) |
| **Implementation effort** | Lower — standard Bearer auth, fewer required fields | Higher — HMAC signing logic, stricter envelope, more error handling |

---

## Pros and Cons

### Approach A — Direct API

| Pros | Cons |
|------|------|
| Minimal integration effort — standard Bearer token auth works with any HTTP client | No built-in replay protection |
| Fewer required fields reduce payload size and validation surface | No explicit envelope versioning — harder to evolve the contract without breaking changes |
| Synchronous response returns the created verification object immediately | Idempotency is optional — callers may forget to supply it, risking duplicates |
| Simpler to test and debug (fewer moving parts) | Single API key — a compromised key exposes the entire integration |
| No cryptographic signing logic required on the caller side | No documented retry strategy — callers must define their own |
| Tenant routing is implicit, reducing URL management | Less granular error responses (fewer status codes) |

### Approach B — Webhook

| Pros | Cons |
|------|------|
| HMAC-SHA256 signing ensures payload integrity and authenticity | Higher implementation effort — callers must implement signing logic |
| Per-service secrets limit blast radius of a compromised key | Stricter validation — all five envelope fields are required |
| 5-minute replay protection window guards against replay attacks | Requires clock synchronisation between caller and server |
| Explicit `api_version` field supports safe contract evolution | Tenant alias must be known and managed per-request URL |
| Required `event_id` enforces idempotency by design | Asynchronous `202` response provides less immediate feedback |
| Comprehensive error taxonomy with actionable status codes | More infrastructure to manage (secrets per service, tenant aliases) |
| Documented retry strategy reduces ambiguity for callers | — |

---

## Recommendation Guidance

**Choose Approach A (Direct API) if:**

- You need the fastest path to a working integration
- Your services already use Bearer token authentication patterns
- The calling environment has limited ability to implement HMAC signing (e.g., low-code platforms, simple scripts)
- Replay protection and payload integrity are handled at a different layer (e.g., mutual TLS, VPN, API gateway)
- You are integrating a single service and do not need per-service secret isolation

**Choose Approach B (Webhook) if:**

- Security is a priority and you need payload-level integrity verification beyond transport-layer encryption
- You are integrating multiple services and want per-service secret isolation to limit the impact of a compromised credential
- You need built-in replay protection for events delivered over public networks
- You want explicit envelope versioning to support non-breaking contract evolution over time
- Your team can implement HMAC-SHA256 signing (code samples are provided for Python, Go, and Node.js)
- You prefer a clearly defined retry strategy and comprehensive error handling guidance

**Note:** Both approaches share identical conventions for the `data` block (payload structure, media file handling via pre-signed S3 URLs, and tenant-injectable metadata). Switching between approaches later affects only the envelope and authentication layer, not the service-specific payload.

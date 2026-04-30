# VerInsight Operations Handbook

**Version:** 1.0  
**Date:** April 2026  
**Audience:** truuth Development Team  

---

## 1. Overview

VerInsight is truuth's multi-tenant verification data platform. It ingests verification results from truuth services (Face Auth, IDV, Document Fraud Check, Repeat Image Check, Repeat Text Check, and others), links each result to an **entity** being verified, and surfaces unified insights to tenant operators via a dashboard.

For a truuth verification service to integrate with VerInsight, two things must be in place:

1. **A verification type registered on the platform** — telling VerInsight what the service's payload looks like, how to extract VerInsight's standard fields and properties from it, what media files to copy, and how the dashboard should render it.
2. **A push integration** — the service POSTs its events to VerInsight's ingestion endpoint as they happen.

This handbook covers both surfaces. The three sub-documents are linked from §3 below; this README is the entry point.

> **Platform vs. tenant scope.** Verification types are **platform-managed** by truuth and live in a shared platform database. Adding or updating a verification type affects every tenant on the platform immediately. There is no per-tenant rollout, no tenant-level toggle, and no tenant-facing API for creating verification types. Treat verification type changes as platform-wide changes.

---

## 2. Key Concepts

A handful of terms repeat across all three sub-documents. These are the ones you'll meet on every page.

| Term | Meaning |
|------|---------|
| **Tenant** | A customer of truuth using VerInsight. Each tenant has its own database, dashboard subdomain, and Cognito user pool. |
| **Verification Type** | A category of verification check (e.g. `face_auth`, `idv`). Platform-managed by truuth, shared across all tenants. |
| **Verification** | A single check result ingested from a truuth service. Identified by `source_verification_id` (the originating service's ID, used as the idempotency key). |
| **Entity** | The subject being verified (a person, a business, a document). Verifications are matched to entities by their extracted properties. |
| **Payload** | The raw request body posted to the ingestion endpoint. Stored verbatim on the verification document. |
| **Property** | A typed key-value pair (e.g. `sys:email = user@example.com`) used for entity matching. Properties come either from platform extractions configured on the verification type, or from tenant metadata promotion. |
| **`sys:` prefix** | Naming convention for platform-managed property types (e.g. `sys:email`, `sys:phone`, `sys:document_id`). Tenant-defined property types use unprefixed keys (e.g. `employee_id`). |

---

## 3. Documents in This Handbook

| # | Document | Audience | When to read it |
|---|----------|----------|-----------------|
| 1 | [`verinsight-ingestion-api-contract.md`](./docs/verinsight-ingestion-api-contract.md) | Service engineers building the push integration | When wiring your service up to POST verification events to VerInsight. |
| 2 | [`verification-type-authoring-guide.md`](./docs/verification-type-authoring-guide.md) | Platform engineers registering or updating a verification type | When adding a new service to the platform, or when changing the payload, header field extraction, properties, or media handling for an existing type. |
| 3 | [`render-schema-authoring-guide.md`](./docs/render-schema-authoring-guide.md) | Platform engineers authoring the dashboard layout for a verification type | When you want to control how a verification's payload is displayed on the VerInsight dashboard. |

### 3.1 What's in Each Document

**Ingestion API Contract** — defines the wire-level contract: endpoint, authentication, request format, response codes, conventions for status/identity/score/media fields, and the `metadata` convention for tenant-injectable fields. Read this if you're sending HTTP requests at VerInsight.

**Verification Type Authoring Guide** — covers everything that goes onto a `verification_type` document except the dashboard layout: payload schema, ingestion mode, GJSON path syntax, field mappings (with all five transforms — direct/constant/enum/match/round_clamp), property extractions, media extractions, registration, and a full end-to-end example. Read this when introducing a new verification type or restructuring an existing one.

**Render Schema Authoring Guide** — covers the dashboard layout for a verification type: source path syntax (different from the backend's GJSON), field definitions, the format catalogue (image, pdf, document, location, percentage, status, etc.), groups and column layouts, card layouts with header/body/footer zones, nested fields, and common patterns. Read this when controlling what a verification looks like in the dashboard.

---

## 4. Common Workflows

### 4.1 Building a brand-new verification service from scratch

```
1. Capture sample payloads (one per outcome) from your service
2. Author the verification type document (verification-type-authoring-guide.md)
   - payload_schema, field_mappings, property_extractions, media_extractions
3. Author the dashboard layout (render-schema-authoring-guide.md)
   - render_schema with groups, formats, card layouts as needed
4. Insert the verification type into the platform DB
5. Wire up the push integration (verinsight-ingestion-api-contract.md)
   - POST /v1/verifications/{key}/ingest with the raw payload
6. End-to-end test: send a real payload, verify it ingests, renders, and matches entities
```

### 4.2 Adding new fields to an existing service's payload

```
1. Update payload_schema to declare the new fields
2. If new properties should be extracted → update property_extractions
3. If new media URLs should be copied → update media_extractions
4. If the new fields should be visible in the dashboard → update render_schema
5. Bump updated_at on the verification type document
```

> Changes to `field_mappings`, `property_extractions`, and `media_extractions` apply **forward-only** — historical verifications are not reprocessed. Changes to `render_schema` apply **immediately to all verifications** since rendering reads the stored payload at view time.

### 4.3 Changing only the dashboard layout for an existing type

```
1. Edit render_schema on the verification type document
2. Bump updated_at
```

The ingestion pipeline is untouched. All historical verifications of that type are re-rendered on the dashboard with the new layout on next view.

### 4.4 Retiring a verification service

```
1. Set status: "inactive" on the verification type document
   - The ingestion endpoint POST /v1/verifications/{key}/ingest will reject new submissions
   - Historical verifications remain visible in the dashboard
2. Coordinate with downstream tenants who may still reference the type in entity matching rules
```

There is no DELETE for verification types — soft delete via deactivation only. This preserves referential integrity for historical verifications.


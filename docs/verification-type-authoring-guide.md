# Verification Type Authoring Guide

**Version:** 1.0  
**Date:** April 2026  
**Audience:** truuth Development Team  

---

## 1. Overview

A **Verification Type** describes one category of verification check that VerInsight knows how to ingest — for example `idv`, `face_auth`, `doc_fraud`, `repeat_image`, `repeat_text`. It tells the platform:

- What the raw payload from the upstream truuth service looks like (`payload_schema`)
- How to extract VerInsight's standardised header fields from that payload (`field_mappings`)
- What standard properties to pull out of the payload for entity matching (`property_extractions`)
- Which payload fields contain media files to copy into VerInsight S3 (`media_extractions`)
- How the dashboard should display the payload (`render_schema`)
- Whether re-submissions of the same `source_verification_id` are accepted or rejected (`ingestion_mode`)

A new verification type is added by inserting a single document into the platform-managed `verification_types` collection. **No backend code changes are required** — the ingestion pipeline is fully data-driven from the verification type document.

### 1.1 Platform-Managed, Not Per-Tenant

> **Important:** Verification types live in the **shared platform database**, not in any tenant's database. They are managed by truuth and are read-only for tenants.
>
> **Any change to a verification type — adding it, updating it, deactivating it — affects every tenant on the platform immediately.** There is no per-tenant override, no staged rollout, and no tenant-level toggle. Treat verification type changes the same way you would treat a global schema migration: review carefully, validate end-to-end, and roll out during a controlled window.

There is no tenant-facing API for creating, updating, or deleting verification types. Tenants only have read access (`GET /v1/verification-types` and `GET /v1/verification-types/{key}`) so they can list types, see payload shapes, and configure entity-type matching rules.

### 1.2 When to Add a New Verification Type

Add a new verification type when:

- truuth launches a new verification service, or
- An existing service starts emitting a meaningfully different payload that can't be expressed as a superset of the current `payload_schema`, or
- An existing service splits into two distinct event streams that should be filtered, listed, and rendered differently in the dashboard.

Do **not** add a new verification type when:

- The payload only adds a few optional fields → just update `payload_schema` (and `render_schema` if the new fields should be visible).
- The payload contains a new `metadata` key that some tenants want as a property → tenants handle that themselves by creating a tenant property type with the matching `key`. No platform change needed.

### 1.3 Authoring Workflow at a Glance

```
1. Capture a representative sample of the upstream webhook payload(s)
   - One per outcome (verified, denied, error if applicable)

2. Author payload_schema (JSON Schema, no vendor extensions)

3. Author field_mappings (extract header fields from the payload)
   - source_verification_id, external_id, status, outcome, score, agent, performed_at

4. Author property_extractions (sys: properties from the payload)

5. Author media_extractions (URLs to copy into VerInsight S3)

6. Author render_schema (dashboard layout) -- see render-schema-authoring-guide.md

7. Insert the verification_type document into the platform DB

8. Validate end-to-end with a real payload via the ingestion endpoint

9. Add an entry to the verification type spec doc (one per type, e.g. face-auth-verification-type-spec.md)
```

---

## 2. Anatomy of a Verification Type

A verification type document has the following top-level fields. All are platform-managed.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Internal ID with `vtype_` prefix (e.g. `vtype_face_auth`). |
| `key` | string | Yes | Public identifier, snake_case, used in URL paths and in the `object` field of batch payloads (e.g. `face_auth`). Immutable once set. |
| `name` | string | Yes | Human-readable name (e.g. "Face Authentication"). |
| `description` | string | No | One-paragraph description shown in the dashboard. |
| `ingestion_mode` | string | Yes | Always `"single"` for now. See §3. |
| `field_mappings` | object | Yes | Map of target header field → extraction config. See §5. |
| `property_extractions` | array | No | List of platform property extractions. See §6. |
| `media_extractions` | array | No | List of media URL extractions. See §7. |
| `payload_schema` | object | Yes | JSON Schema describing the raw payload. See §4. |
| `render_schema` | object \| null | No | Dashboard layout configuration. See `render-schema-authoring-guide.md`. |
| `status` | string | Yes | `"active"` or `"inactive"`. Inactive types reject ingestion. |
| `created_at` | int64 | Yes | Unix epoch seconds. |
| `updated_at` | int64 | Yes | Unix epoch seconds. |

Skeleton:

```json
{
  "id": "vtype_<key>",
  "key": "<snake_case_key>",
  "name": "<Human Name>",
  "description": "<One-paragraph description>",
  "ingestion_mode": "single",
  "field_mappings": { },
  "property_extractions": [ ],
  "media_extractions": [ ],
  "payload_schema": { },
  "render_schema": { },
  "status": "active",
  "created_at": 1735689600,
  "updated_at": 1735689600
}
```

---

## 3. Ingestion Mode

`ingestion_mode` controls how VerInsight handles re-submissions of a verification with the same `source_verification_id`.

| Mode | Behaviour |
|------|-----------|
| `single` | One submission per `source_verification_id`. Same payload → 200 (idempotent return of existing). Different payload → 409 conflict. |
| `progressive` | Multiple submissions accepted; payload is overwritten, header fields re-extracted, properties merged, entity matching re-evaluated. |

> **Always set `ingestion_mode` to `"single"` for now.** Progressive mode is part of the long-term design but is **not implemented in the current release**. Setting it to anything other than `"single"` will result in undefined behaviour.

If a future verification type genuinely needs progressive accumulation, raise it as a separate piece of work — the ingestion pipeline, atomic property merge logic, and re-evaluation of entity matching all need to be exercised end-to-end before that mode can be relied upon.

---

## 4. Payload Schema (`payload_schema`)

`payload_schema` is the **data contract** between the upstream truuth verification service and VerInsight. It is a standard JSON Schema describing the shape of the request body that VerInsight will receive at `POST /v1/verifications/{verification_type}/ingest`.

### 4.1 Authoring Rules

1. **Standard JSON Schema only — no vendor extensions.** Do not put `x-format`, `x-hidden`, `x-group`, `x-sensitive`, or any other `x-*` properties on `payload_schema`. Display concerns belong in `render_schema`.
2. **Describe what the upstream service actually sends.** This is not the place to design the ideal payload; it is the place to document reality. If the upstream sends extra fields, decide whether to declare them or rely on `additionalProperties` (default behaviour in JSON Schema is to allow them).
3. **Mark the truly required fields.** A field is `required` if VerInsight cannot ingest a verification without it — typically the source ID, status fields, and the timestamp.
4. **Leave `metadata` open.** Where the upstream payload has a `metadata` object that tenants may inject keys into, set `additionalProperties: true` on it. This is what enables tenant metadata promotion (Category 3 of the extraction pipeline). Without this, tenant-injected keys would be rejected by payload validation.

### 4.2 Required `metadata` Convention

Every verification type whose payload supports tenant-injected fields should put them inside a top-level `metadata` object. Tenant property type promotion (Category 3) only scans the `metadata` object — keys at any other path are not promotable.

```json
"metadata": {
  "type": "object",
  "properties": {
    "similarity": { "type": "number", "minimum": 0, "maximum": 100 },
    "similarityThreshold": { "type": "number", "minimum": 0, "maximum": 100 }
  },
  "required": ["similarity", "similarityThreshold"],
  "additionalProperties": true
}
```

The `additionalProperties: true` on `metadata` is what allows a tenant to inject `employee_id`, `branch_code`, or any other tenant-specific key without payload validation rejecting it.

### 4.3 Example (Face Auth, abbreviated)

```json
{
  "type": "object",
  "properties": {
    "auditLogId":  { "type": "string", "format": "uuid" },
    "sessionId":   { "type": "string", "format": "uuid" },
    "username":    { "type": "string", "format": "email" },
    "timestamp":   { "type": "string", "format": "date-time" },
    "eventType":   { "type": "string", "enum": ["FACE_CHALLENGE_VERIFIED", "FACE_CHALLENGE_DENIED"] },
    "metadata": {
      "type": "object",
      "properties": {
        "similarity":          { "type": "number", "minimum": 0, "maximum": 100 },
        "similarityThreshold": { "type": "number", "minimum": 0, "maximum": 100 },
        "livenessScore":       { "type": "number", "minimum": 0, "maximum": 100 },
        "livenessThreshold":   { "type": "number", "minimum": 0, "maximum": 100 }
      },
      "required": ["similarity", "similarityThreshold", "livenessScore", "livenessThreshold"],
      "additionalProperties": true
    }
  },
  "required": ["auditLogId", "sessionId", "username", "timestamp", "eventType", "metadata"]
}
```

### 4.4 Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Missing `additionalProperties: true` on `metadata` | Tenant-injected keys cause payload validation failures. Always set it. |
| Vendor extensions (`x-format`, `x-sensitive`) on `payload_schema` | Move them to `render_schema`. `payload_schema` is a pure data contract. |
| Marking optional upstream fields as `required` | Causes spurious rejections when the upstream service legitimately omits them. Only mark a field required if VerInsight needs it. |
| Hand-rolling JSON Schema by inspection | Generate from a real captured payload first, then tighten. Hand-rolled schemas miss optional fields and edge cases. |

---

## 5. GJSON Path Syntax

`field_mappings`, `property_extractions`, and `media_extractions` all run on the backend and use **GJSON** to address values inside the raw payload. GJSON is a path query syntax for JSON; the same syntax is used in all three places.

> **Note:** The frontend `render_schema` uses a different, simpler `source` path syntax (dot, index, filter). Don't mix them up. See `render-schema-authoring-guide.md`. Everything in this section applies only to the **backend extraction paths**.

### 5.1 Basics

| Syntax | Description | Example | Result |
|--------|-------------|---------|--------|
| `name` | Top-level property | `auditLogId` | `"5b48597e-..."` |
| `a.b` | Nested object | `metadata.similarity` | `99` |
| `a.0.b` | Array index (zero-based) | `documents.0.documentNumber` | `"DL12345"` |
| `a.#` | Array length | `documents.#` | `3` |

GJSON uses **dots** between segments, including before array indices. Brackets are not part of standard GJSON syntax.

### 5.2 Iterating Arrays

`#` after a key extracts the corresponding field from every element in an array.

| Syntax | Description | Example | Result |
|--------|-------------|---------|--------|
| `a.#.b` | All `b` values from array `a` | `documents.#.documentNumber` | `["DL12345", "PP67890"]` |

This is the syntax to use in `property_extractions` and `media_extractions` when a verification can carry multiple documents, multiple images, etc.

### 5.3 Querying Arrays

GJSON supports filter expressions inside `#(...)` brackets to find elements matching a condition.

| Syntax | Description |
|--------|-------------|
| `a.#(key=="value")` | First element in `a` where `key` equals the literal string |
| `a.#(key=="value")#` | **All** elements where `key` equals the literal string |
| `a.#(score>=80)#` | All elements where `score` is greater than or equal to 80 |
| `a.#(name%"D*")` | First element where `name` matches a wildcard pattern (% = wildcard) |
| `a.#(name!%"D*")` | First element where `name` does **not** match the pattern |

Supported operators: `==`, `!=`, `<`, `<=`, `>`, `>=`, `%` (pattern match), `!%` (pattern not-match).

### 5.4 Modifiers and Length-of-Match

Pipes apply a modifier to the result on the right.

| Syntax | Description | Example |
|--------|-------------|---------|
| `a.#(...)#\|#` | Count of matched elements | `documents.#(status=="MATCH")#\|#` → `2` |
| `a\|@reverse` | Reverse the array | `documents\|@reverse` |
| `a\|@flatten` | Flatten one level | `pages.#.documents\|@flatten` |

The `#|#` pattern (count of matched elements) is the most common one for VerInsight — it lets you map "how many documents matched" to a `pass`/`fail` outcome via the `match` transform.

### 5.5 Worked Examples

Given this payload:

```json
{
  "auditLogId": "abc-123",
  "applicant": {
    "email": "user@example.com",
    "phone": "+61412345678"
  },
  "documents": [
    { "documentNumber": "DL12345", "type": "DRIVERS_LICENCE", "status": "MATCH",    "frontImage": "https://s3/.../front1.jpg" },
    { "documentNumber": "PP67890", "type": "PASSPORT",         "status": "NO_MATCH", "frontImage": "https://s3/.../front2.jpg" }
  ],
  "metadata": {
    "confidence": 0.87
  }
}
```

| Goal | GJSON Path | Result |
|------|------------|--------|
| Source verification ID | `auditLogId` | `"abc-123"` |
| Applicant email | `applicant.email` | `"user@example.com"` |
| First document number | `documents.0.documentNumber` | `"DL12345"` |
| All document numbers | `documents.#.documentNumber` | `["DL12345", "PP67890"]` |
| All passport numbers | `documents.#(type=="PASSPORT")#.documentNumber` | `["PP67890"]` |
| Number of documents that matched | `documents.#(status=="MATCH")#\|#` | `1` |
| All front-image URLs | `documents.#.frontImage` | `["https://s3/.../front1.jpg", "https://s3/.../front2.jpg"]` |
| Confidence as 0–1 fraction | `metadata.confidence` | `0.87` |

### 5.6 Tips

- **GJSON path syntax tester**: paste a real payload and a path into the [GJSON Playground](https://gjson.dev/) to validate the path before adding it to the verification type document.
- **Quote string literals in queries** with `"..."`. `documents.#(type==PASSPORT)` may behave differently to `documents.#(type=="PASSPORT")` depending on the value type.
- **Escape literal dots in keys** with a backslash: a key named `user.email` (containing a literal dot) is addressed as `user\.email`. This is rare in practice — most upstream services don't put dots in JSON keys.

---

## 6. Field Mappings (`field_mappings`)

`field_mappings` define how to extract VerInsight's standardised header fields from the raw payload. They run first in the ingestion pipeline (Category 1).

### 6.1 Target Fields (Closed Set)

| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| `source_verification_id` | Yes | string | Idempotency key. Must be unique per type. |
| `external_id` | No | string | Tenant's client's reference. Free text. |
| `status` | Yes | string | One of: `not_started`, `in_progress`, `processing`, `done`. |
| `outcome` | Yes | string | One of: `pass`, `fail`, `warning`, `error`, `pending`. |
| `score` | No | integer | 0–100. |
| `agent` | No | string | Max 200 chars. |
| `performed_at` | Yes | string | ISO 8601 timestamp. |

You cannot add fields outside this list. If you need to capture additional structured data, use `property_extractions` (which feed entity matching) or rely on the raw payload (which is preserved verbatim).

### 6.2 The Five Mapping Types

#### Direct path

Copy the value at a GJSON path with no transformation.

```json
{ "source": "auditLogId" }
```

#### Constant

Always use the literal value. Use this when the upstream payload doesn't carry a header field but it has an obvious constant — for example, when both terminal events of an authentication challenge mean `status: "done"`.

```json
{ "value": "done" }
```

#### Enum transform

Map the source value through a lookup table. Useful for translating upstream event types into VerInsight outcomes.

```json
{
  "source": "eventType",
  "transform": "enum",
  "enum_map": {
    "FACE_CHALLENGE_VERIFIED": "pass",
    "FACE_CHALLENGE_DENIED":   "fail"
  }
}
```

If the source value is not a key in `enum_map`, ingestion fails with a validation error. There is no implicit default — make all valid upstream values explicit. If you need a default, use the `match` transform with a `default` rule.

#### Match transform

Conditional mapping with operators. Evaluates `match_rules` in order, returning the `result` of the first matching rule. Falls back to `match_default` (or empty string) if no rule matches.

```json
{
  "source": "matchedDocuments.#(status==\"MATCH\")#|#",
  "transform": "match",
  "match_rules": [
    { "op": "eq",  "value": 0,  "result": "fail" },
    { "op": "gte", "value": 1,  "result": "pass" }
  ]
}
```

Operators:

| Operator | Applies to | Description |
|----------|------------|-------------|
| `eq` | string, number, boolean | Exact equality (compared as strings). |
| `gt`, `gte`, `lt`, `lte` | number | Numeric comparison. Skips the rule if the resolved or rule value is non-numeric. |
| `regex` | string | Regular expression match. |
| `default` | any | Always matches. Use as the last rule for a fallback. |

Common patterns:

```json
// Numeric range with explicit fallback
{
  "source": "confidence",
  "transform": "match",
  "match_rules": [
    { "op": "gte",     "value": 80, "result": "pass" },
    { "op": "gte",     "value": 50, "result": "warning" },
    { "op": "default",              "result": "fail" }
  ]
}

// Regex on string status
{
  "source": "result.status",
  "transform": "match",
  "match_rules": [
    { "op": "eq",    "value": "MATCH",     "result": "pass" },
    { "op": "eq",    "value": "NO_MATCH",  "result": "fail" },
    { "op": "regex", "value": "PARTIAL.*", "result": "warning" }
  ],
  "match_default": "error"
}
```

#### Round & clamp

Multiply by `scale`, round to integer, clamp to `[0, 100]`. Use `scale: 100` when the upstream value is a 0–1 fraction (e.g. a similarity ratio); use `scale: 1` (the default) when the upstream value is already on a 0–100 scale.

```json
{ "source": "metadata.similarity", "transform": "round_clamp" }
{ "source": "outcome.similarity",  "transform": "round_clamp", "scale": 100 }
```

### 6.3 Worked Example: face_auth `field_mappings`

```json
{
  "source_verification_id": { "source": "auditLogId" },
  "external_id":            { "source": "sessionId" },
  "status":                 { "value":  "done" },
  "outcome": {
    "source":    "eventType",
    "transform": "enum",
    "enum_map": {
      "FACE_CHALLENGE_VERIFIED": "pass",
      "FACE_CHALLENGE_DENIED":   "fail"
    }
  },
  "score": {
    "source":    "metadata.similarity",
    "transform": "round_clamp"
  },
  "agent":        null,
  "performed_at": { "source": "timestamp" }
}
```

### 6.4 Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| `outcome` resolves to a value not in the closed set (`pass`/`fail`/`warning`/`error`/`pending`) | Add an `enum` or `match` transform that produces only valid values. |
| `score` field set when upstream value is 0–1 fraction | Use `scale: 100` on `round_clamp`. |
| Forgetting `agent: null` for fully automated services | Set it explicitly to `null` to make it clear no agent is involved. |
| Using `enum` transform with an unbounded set of upstream values | Switch to `match` with a `default` rule. |

---

## 7. Property Extractions (`property_extractions`)

`property_extractions` define standard properties that VerInsight expects every instance of this verification type to produce. They run in Category 2 of the ingestion pipeline (after field mappings, before tenant metadata promotion).

Each entry has three fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `property_type` | string | Yes | Must be a `sys:` prefixed key. Resolves to a platform property type (e.g. `sys:email`, `sys:phone`, `sys:document_id`). |
| `source_path` | string | Yes | GJSON path into the payload. |
| `required` | boolean | Yes | If `true`, ingestion fails when the path resolves to null/missing. |

### 7.1 The `sys:` Contract

`property_type` values **must** start with `sys:`. This prefix is both:

- **A naming convention** — clearly distinguishing platform-managed property types from tenant-defined ones.
- **A routing signal** — at ingestion time the pipeline resolves `sys:` keys from the **platform DB**; all other keys are resolved from the tenant DB (and only matched in Category 3 metadata promotion).

Because platform property types live in the platform DB and exist independently of any tenant configuration, Category 2 extraction can never fail due to a missing property type. The `required` flag has one clean meaning: fail ingestion if the **source path** resolves to null or missing in the payload.

### 7.2 Multi-value Extractions

If `source_path` resolves to an **array** (e.g. `documents.#.documentNumber`), every element is appended to the verification's properties array under the same `property_type`. This is how a single verification can carry multiple `sys:document_id` values.

### 7.3 Worked Examples

```json
// Single-value: face_auth
"property_extractions": [
  { "property_type": "sys:email", "source_path": "username", "required": true }
]
```

```json
// Multi-value: idv (all document numbers from any number of documents)
"property_extractions": [
  { "property_type": "sys:email",       "source_path": "applicant.email",          "required": true },
  { "property_type": "sys:phone",       "source_path": "applicant.phone",          "required": false },
  { "property_type": "sys:document_id", "source_path": "documents.#.documentNumber", "required": false }
]
```

### 7.4 Tenant Metadata Promotion (Read-Only Context)

You don't configure tenant metadata promotion on the verification type — it's automatic. But it's worth knowing it exists so you author `payload_schema` correctly:

- The ingestion pipeline scans `payload.metadata` for keys matching tenant property types in the **tenant DB** (only).
- `sys:` keys are skipped at this step (they're a Category 2 concern).
- Matched keys are coerced to strings and appended to the verification's properties array.

This is why `payload_schema` should always declare `metadata.additionalProperties: true` (§4.2) — without it, tenants couldn't inject promotable keys.

### 7.5 Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| `property_type` without `sys:` prefix | All Category 2 extractions must reference a platform property type — prefix it. |
| `required: true` on a path that legitimately may be missing | Causes ingestion failures for valid upstream payloads. Only mark required if VerInsight cannot do anything useful without it. |
| Extracting a tenant-specific field via `property_extractions` | Tenant fields are promoted automatically from `metadata`. Don't hardcode them. |
| Extracting properties from arrays where order matters | GJSON's array iteration preserves source order, but properties are deduplicated downstream — don't rely on duplicates conveying meaning. |

---

## 8. Media Extractions (`media_extractions`)

`media_extractions` tell VerInsight which payload fields contain media URLs (images, PDFs) that should be copied into VerInsight-owned S3 storage. The async copy runs after the verification is stored — copy failures do not affect the verification itself.

Each entry has three fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source_path` | string | Yes | GJSON path resolving to a string URL or an array of string URLs. |
| `content_type` | string | Yes | Expected MIME type or pattern (e.g. `image/jpeg`, `image/*`, `application/pdf`). Used to validate the downloaded file and as the `Content-Type` on proxy responses. |
| `label` | string | No | Human-readable label used in logs and (optionally) in the dashboard. |

### 8.1 Pre-Signed URL Convention

The platform expects upstream truuth services to deliver media as **pre-signed S3 URLs** with at least 48 hours of TTL. VerInsight does not negotiate auth with the upstream service; the URL is self-contained. Once VerInsight has copied the file to its own S3 bucket, the original URL's expiry is irrelevant.

### 8.2 Multi-File Extractions

`source_path` can resolve to an array of URLs — one media entry will be created per URL.

```json
"media_extractions": [
  {
    "source_path":  "documents.#.frontImage",
    "content_type": "image/*",
    "label":        "Document Front"
  },
  {
    "source_path":  "documents.#.backImage",
    "content_type": "image/*",
    "label":        "Document Back"
  },
  {
    "source_path":  "reports.#.pdfUrl",
    "content_type": "application/pdf",
    "label":        "Verification Report"
  }
]
```

### 8.3 What Happens at Ingestion

1. Verification is stored. Its `media` array is empty initially.
2. Async media copy task runs:
   - Resolves each `source_path` against the stored payload.
   - For each URL, downloads the file from the pre-signed URL.
   - Validates the downloaded file's content type matches `content_type`.
   - Uploads to `verinsight-media-{env}/{tenant_id}/{verification_id}/{media_id}.{ext}`.
   - Appends an entry to `verification.media` with `media_id`, `source_field_path`, `original_url`, `s3_key`, `content_type`, `size_bytes`, and `copied_at`.
3. The dashboard fetches media via `GET /v1/media/{media_id}` (tenant-isolated proxy).

Failures (download timeout, content-type mismatch, etc.) are retried with exponential backoff (3 attempts: 5s, 30s, 120s). If all retries fail, the entry is stored with `copied_at: null` and the proxy falls back to a 302 redirect to `original_url` until manually reconciled.

### 8.4 Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| `source_path` resolves to a non-URL value (e.g. base64 inline content) | Media must be referenced as URLs in the payload. Inline content cannot be copied. Coordinate with the upstream service to switch to URLs. |
| Pre-signed URL TTL shorter than 48 hours | Coordinate with the upstream service to bump TTL. Short TTLs cause race conditions with the async copy retry window. |
| `content_type: "image/jpeg"` when upstream may send PNG too | Use `image/*` or list both. Strict mismatch causes the file to be quarantined as an error. |
| Forgetting `media_extractions` for a type that has images | Images render as broken links in the dashboard. The schema renderer pulls media via `GET /v1/media/{id}` and that endpoint only knows about URLs that were extracted. |

---

## 9. Render Schema (`render_schema`)

`render_schema` controls how the verification payload is laid out on the dashboard. It has its own concept surface — groups, format hints, card layouts, sensitive-field masking — and is documented separately.

See **`render-schema-authoring-guide.md`**.

A few key points to keep in mind while authoring the rest of the verification type:

- `render_schema` can be omitted (or set to `null`) — the dashboard will fall back to a raw JSON view of the payload. Useful for getting a verification type live quickly while iterating on layout.
- `render_schema` source paths use a **different syntax** than the backend extraction paths described in §5. The frontend renderer uses dot/index/filter notation (e.g. `documents[0].frontImage`, `checks[?type=identity].score`) — not GJSON.
- `render_schema` is also platform-managed. Changes affect every tenant immediately.

---

## 10. Registering a Verification Type

Verification types live in the platform-managed `verification_types` collection in MongoDB. Adding one is a single document insert.

### 10.1 Mongo Insert

```javascript
db.verification_types.insertOne({
  id:               "vtype_<key>",
  key:              "<snake_case_key>",
  name:             "<Human Name>",
  description:      "<One-paragraph description>",
  ingestion_mode:   "single",
  field_mappings:   { /* §6 */ },
  property_extractions: [ /* §7 */ ],
  media_extractions:    [ /* §8 */ ],
  payload_schema:   { /* §4 */ },
  render_schema:    { /* see render-schema-authoring-guide.md */ },
  status:           "active",
  created_at:       Math.floor(Date.now() / 1000),
  updated_at:       Math.floor(Date.now() / 1000)
});
```

Once inserted, the type is available to **every tenant** on the platform. There is no per-tenant rollout control — see §1.1.

### 10.2 Updating an Existing Type

Edit the document in place (`updateOne` with `$set`). Changes apply forward-only:

- New `field_mappings` and `property_extractions` apply to **future ingestions**. Historical verifications are not reprocessed.
- New `payload_schema` applies to **future ingestions**. Historical payloads stored with the old schema are unchanged and will still render via the (current) `render_schema`.
- New `render_schema` applies to **all verifications immediately** — it's a presentation-layer change and reads from the stored payload at render time.

Always bump `updated_at`.

### 10.3 Deactivating a Type

Set `status: "inactive"`. The ingestion endpoint `POST /v1/verifications/{key}/ingest` will then reject new submissions for that type. Historical verifications remain visible in the dashboard. Re-activation is just `status: "active"`.

There is no DELETE for verification types — soft delete via deactivation only. This preserves referential integrity for historical verifications and the dashboard's ability to render them.

### 10.4 API Surface (Read-Only for Tenants)

For reference, this is what tenants see:

```bash
# List all active verification types
GET /v1/verification-types
Authorization: Bearer <tenant API key>

# Get a single verification type
GET /v1/verification-types/face_auth
Authorization: Bearer <tenant API key>
```

Both endpoints are read-only. There is no POST, PATCH, or DELETE on this resource.

---

## 11. Authoring Checklist

Use this when adding or updating a verification type.

**Discovery**

- [ ] Captured at least one real payload per outcome from the upstream service
- [ ] Confirmed the upstream service emits pre-signed URLs (≥48h TTL) for any media

**payload_schema**

- [ ] Standard JSON Schema only — no `x-*` extensions
- [ ] `metadata` object declared with `additionalProperties: true`
- [ ] `required` only includes fields VerInsight genuinely needs

**ingestion_mode**

- [ ] Set to `"single"` (always — `progressive` not implemented yet)

**field_mappings**

- [ ] All required fields covered: `source_verification_id`, `status`, `outcome`, `performed_at`
- [ ] `outcome` resolves only to values in `pass`/`fail`/`warning`/`error`/`pending`
- [ ] `status` resolves only to values in `not_started`/`in_progress`/`processing`/`done`
- [ ] `score` uses `scale: 100` if the upstream value is a 0–1 fraction
- [ ] `agent: null` set explicitly for fully automated services

**property_extractions**

- [ ] Every `property_type` is `sys:` prefixed
- [ ] `required` flags are correct (do not require fields that legitimately may be missing)
- [ ] Multi-value paths use `documents.#.x` style where appropriate

**media_extractions**

- [ ] Every payload field carrying a media URL has an extraction
- [ ] `content_type` matches what the upstream service actually delivers
- [ ] `label` set for anything that should appear named in the dashboard

**render_schema** (see `render-schema-authoring-guide.md`)

- [ ] Either authored, or intentionally left as `null` for raw JSON fallback

**Registration**

- [ ] `id`, `key`, `name`, `description` set
- [ ] `status: "active"`
- [ ] `created_at` and `updated_at` set to current epoch seconds
- [ ] Inserted into `verification_types` collection in the platform DB
- [ ] Verified `GET /v1/verification-types/{key}` returns the new type

**End-to-end validation**

- [ ] Ingested a real payload via `POST /v1/verifications/{key}/ingest` and got a `200` with a `ver_` ID
- [ ] Dashboard renders the verification correctly
- [ ] Properties extracted match expectation (visible on the verification detail page)
- [ ] Media files appear in S3 and stream correctly via `GET /v1/media/{media_id}`
- [ ] Existing entity types' matching rules updated to reference the new type if relevant

**Documentation**

- [ ] One spec doc per verification type (e.g. `xxx-verification-type-spec.md`) with: overview, ingestion mapping, payload schema, render schema, entity matching considerations, seed data, revision history

---

## 12. End-to-End Example: a fictional `liveness_check` type

A compact end-to-end walkthrough using a small fictional verification type. For a full real example, see `face-auth-verification-type-spec-v1_3.md`.

### 12.1 Sample Payload

```json
{
  "checkId":   "lc_abc123",
  "userEmail": "user@example.com",
  "performedAt": "2026-04-15T08:31:43.858Z",
  "result": {
    "outcome":     "PASS",
    "confidence":  0.92,
    "captureUrl":  "https://truuth-liveness.s3.ap-southeast-2.amazonaws.com/captures/abc123.jpg?X-Amz-..."
  },
  "metadata": {
    "deviceId": "ios-414"
  }
}
```

### 12.2 Verification Type Document

```json
{
  "id":             "vtype_liveness_check",
  "key":            "liveness_check",
  "name":           "Liveness Check",
  "description":    "Single-frame liveness detection capturing one face image and a confidence score.",
  "ingestion_mode": "single",

  "field_mappings": {
    "source_verification_id": { "source": "checkId" },
    "status":                 { "value":  "done" },
    "outcome": {
      "source":    "result.outcome",
      "transform": "enum",
      "enum_map": {
        "PASS":   "pass",
        "FAIL":   "fail",
        "REVIEW": "warning"
      }
    },
    "score": {
      "source":    "result.confidence",
      "transform": "round_clamp",
      "scale":     100
    },
    "agent":        null,
    "performed_at": { "source": "performedAt" }
  },

  "property_extractions": [
    { "property_type": "sys:email", "source_path": "userEmail", "required": true }
  ],

  "media_extractions": [
    { "source_path": "result.captureUrl", "content_type": "image/jpeg", "label": "Capture" }
  ],

  "payload_schema": {
    "type": "object",
    "properties": {
      "checkId":     { "type": "string" },
      "userEmail":   { "type": "string", "format": "email" },
      "performedAt": { "type": "string", "format": "date-time" },
      "result": {
        "type": "object",
        "properties": {
          "outcome":    { "type": "string", "enum": ["PASS", "FAIL", "REVIEW"] },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "captureUrl": { "type": "string", "format": "uri" }
        },
        "required": ["outcome", "confidence", "captureUrl"]
      },
      "metadata": {
        "type": "object",
        "additionalProperties": true
      }
    },
    "required": ["checkId", "userEmail", "performedAt", "result"]
  },

  "render_schema": {
    "version": 1,
    "fields": {
      "outcome": {
        "title":  "Result",
        "source": "result.outcome",
        "group":  "status",
        "order":  0,
        "type":   "string",
        "format": "label"
      },
      "confidence": {
        "title":  "Confidence",
        "source": "result.confidence",
        "group":  "score",
        "order":  0,
        "type":   "number",
        "format": "percentage"
      },
      "userEmail": {
        "title":  "Email",
        "source": "userEmail",
        "group":  "personal",
        "order":  0,
        "type":   "string"
      },
      "captureUrl": {
        "title":  "Capture",
        "source": "result.captureUrl",
        "group":  "general",
        "order":  0,
        "type":   "string",
        "format": "image"
      },
      "performedAt": {
        "title":  "Performed At",
        "source": "performedAt",
        "group":  "general",
        "order":  1,
        "type":   "string",
        "format": "date-time"
      }
    }
  },

  "status":     "active",
  "created_at": 1735689600,
  "updated_at": 1735689600
}
```

### 12.3 Ingestion Walkthrough

When a tenant submits the sample payload to `POST /v1/verifications/liveness_check/ingest`, the pipeline:

1. **Looks up** the `liveness_check` verification type in the platform DB. ✓ active.
2. **Field mappings** extract:
   - `source_verification_id` = `"lc_abc123"`
   - `status` = `"done"`
   - `outcome` = `"pass"` (from `PASS` via enum)
   - `score` = `92` (from `0.92` via `round_clamp` with `scale: 100`)
   - `agent` = `null`
   - `performed_at` = `"2026-04-15T08:31:43.858Z"`
3. **Property extractions** append `{ type: "sys:email", value: "user@example.com" }`.
4. **Tenant metadata promotion** scans `payload.metadata`. If the tenant has a property type with `key: "deviceId"`, it gets promoted; otherwise ignored.
5. **Validation** passes against `payload_schema`.
6. **Storage**: verification stored with all of the above. `media` array is empty.
7. **Entity matching** runs against the tenant's entity types (using `properties_present`, `verification_types`, etc.).
8. **Async media copy** downloads `result.captureUrl`, uploads to S3, appends a `media` entry pointing to `med_xxx.jpg`.

The dashboard then renders the verification using `render_schema`: a status pill for the result, a percentage bar for confidence, the email under "Personal Information", and the capture image under "Details".

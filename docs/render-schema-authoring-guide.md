# Render Schema Authoring Guide

**Version:** 1.0  
**Date:** April 2026  
**Audience:** truuth Development Team  

---

## 1. Overview

`render_schema` is the **dashboard layout configuration** for a verification type's payload. It tells the frontend:

- Which fields to show (it is an additive model — fields not listed are hidden from the structured UI)
- Where to read each field's value from in the payload (via a `source` path)
- How to group, order, format, and display each field
- How to lay out groups (column counts, titles, ordering)
- How to render structured cards (header / body / footer zones)

When `render_schema` is present on a verification type, it drives the entire structured layout. When it is absent or `null`, the dashboard shows the raw JSON payload.

### 1.1 Platform-Managed, Not Per-Tenant

Like the rest of the verification type document, `render_schema` lives in the **shared platform database**. **Any change applies to every tenant immediately** — there is no per-tenant override or staged rollout. Treat it the same as any other platform-wide change: review carefully and roll out during a controlled window.

Unlike the other parts of the verification type document (which are forward-only), `render_schema` changes are visible **immediately on all historical verifications** of that type, since rendering reads the stored payload at view time.

### 1.2 When to Author `render_schema`

| Situation | Recommendation |
|-----------|----------------|
| New verification type going live | Author a `render_schema`. The raw JSON fallback is usable but does not produce a dashboard-quality view. |
| Iterating on a new type and you want to see it in the dashboard quickly | Set `render_schema: null` initially; raw JSON is fine for early validation. Add `render_schema` once the payload shape is locked. |
| Existing custom React renderer (e.g. `idv`, `doc_fraud`) | The custom renderer wins — `render_schema` is ignored for those types. Custom renderers are reserved for cases where `render_schema` is genuinely insufficient. |

### 1.3 The Three-Tier Renderer Pipeline

For context, the dashboard picks a renderer in this order:

1. **Custom React renderer** (registered by verification type key) — used if one exists.
2. **`render_schema`-driven renderer** — used if `render_schema.version === 1`.
3. **Raw JSON viewer** — fallback when neither of the above applies.

For new verification types, **always prefer path 2**. Custom renderers exist for legacy types and should not be added unless `render_schema` genuinely cannot express what's needed.

---

## 2. Anatomy of `render_schema`

```json
{
  "version": 1,
  "fields": {
    "<field_key>": { /* RenderFieldDefinition */ }
  },
  "group_layout": {
    "<group_name>": { /* GroupLayout */ }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | integer | Yes | Always `1` for the current renderer. |
| `fields` | object | Yes | Map of arbitrary field keys to field definitions. The key is just an internal identifier; the visible label is `title`. |
| `group_layout` | object | No | Per-group layout overrides (column count, title, order). |

The `fields` map is **flat** — even nested object/array rendering is configured via the optional `fields` property *inside* a single `RenderFieldDefinition`, not via a deeper top-level structure.

---

## 3. Source Path Syntax (Frontend)

> **Important:** `render_schema` source paths use a **different syntax** than the backend extraction paths in `field_mappings` / `property_extractions` / `media_extractions`. The backend uses GJSON. The frontend uses a simpler custom resolver. Don't mix them up.

### 3.1 Three Path Patterns

| Pattern | Syntax | Example |
|---------|--------|---------|
| Dot notation | `a.b.c` | `result.overall_score` |
| Array index | `a[N].b` | `documents[0].front_image` |
| Array filter (first match) | `a[?key=value].b` | `checks[?type=identity].result` |

All three can combine in a single path:

```
results.proofingOutcomes[0].userBehaviourChecks[?type=liveness].score
```

### 3.2 Behaviour

- Returns `undefined` if any segment cannot be resolved.
- Array filter returns the **first** match where `key === value` (strict equality, compared as strings). If no match is found, returns `undefined`.
- There is no equivalent of GJSON's "match all" syntax (`#`) — render schema source paths always resolve to a single value (which can itself be an array or object).

### 3.3 When the Field Itself is an Array

If a field's `source` resolves to an array (and `type: "array"` or no type is set), the renderer handles iteration via the field's nested `fields` definition — not by extending the path. See §8 (Nested Fields).

---

## 4. RenderFieldDefinition

Each entry in `render_schema.fields` is a `RenderFieldDefinition`.

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `source` | string | Yes | — | Path into the payload (see §3). |
| `title` | string | Yes | — | Display label shown above the field. |
| `group` | string | Yes | — | Layout group. Well-known or custom. See §6. |
| `order` | number | No | `0` | Sort order within the group. Lower renders first. Stable sort within equal values. Negative allowed. |
| `type` | string | No | inferred | One of `string`, `number`, `boolean`, `array`, `object`. |
| `format` | string | No | — | Format hint controlling display. See §5. |
| `display` | string | No | auto | For arrays/objects: `table`, `cards`, or `inline`. |
| `sensitive` | boolean | No | `false` | If `true`, masks value with click-to-reveal. |
| `fields` | object | No | — | Nested field definitions for `object` and `array` types. See §8. |
| `card_layout` | object | No | — | Card zone mapping when `display: "cards"`. See §7. |
| `score_thresholds` | object | No | — | Color thresholds for `format: "percentage"`. See §5.10. |

---

## 5. Format Catalogue

`format` is the single most important display lever. It tells the renderer what kind of thing the value is, beyond its raw type.

| Format | Applies to | Renders as |
|--------|------------|------------|
| `image` | string (URL) or array of strings | Clickable thumbnail with lightbox preview |
| `pdf` | string (URL) or array of strings | Document icon card; click opens inline PDF viewer |
| `location` | object with `latitude`/`longitude` | Static map thumbnail; click expands to full map |
| `date` | string | Formatted date |
| `date-time` | string | Formatted date and time |
| `email` | string | Clickable `mailto:` link |
| `uri` | string | Clickable external link |
| `status` | string | Status badge (pass/fail/pending colouring) |
| `percentage` | number | Coloured pill (see §5.10 for thresholds) |
| `code` | string | Monospace styling |
| `label` | string | Converts `camelCase` / `snake_case` / `SCREAMING_SNAKE` to Title Case |

### 5.1 `image`

Single image:

```json
{
  "title":  "Front of Document",
  "source": "documents[0].frontImage",
  "group":  "document",
  "type":   "string",
  "format": "image"
}
```

Array of images (renders as a grid with lightbox):

```json
{
  "title":  "Document Photos",
  "source": "documents[0].photos",
  "group":  "document",
  "type":   "array",
  "format": "image"
}
```

### 5.2 `pdf`

Same single/array pattern as `image`, but renders document icon cards. Clicking opens the PDF inline in a near-fullscreen dialog with `<iframe>` preview.

```json
{
  "title":  "Verification Report",
  "source": "reports[0].pdfUrl",
  "group":  "document",
  "type":   "string",
  "format": "pdf"
}
```

### 5.3 `location`

Renders an interactive map (OpenStreetMap tiles, no API key required). The source must resolve to an object containing latitude and longitude properties.

```json
{
  "title":  "Capture Location",
  "source": "endpoint.location",
  "group":  "location",
  "type":   "object",
  "format": "location"
}
```

By default the renderer reads `latitude` and `longitude` from the resolved object. If your payload uses different keys (e.g. `lat`/`lng` or `coords.x`/`coords.y`), this is one of the few places where you may want a custom renderer — `render_schema` does not currently expose key overrides as a public field.

The object may also optionally include `label` (a place name) and `accuracy` (in metres), which are shown in the expanded dialog.

### 5.4 `date` and `date-time`

Format ISO 8601 strings into human-friendly date or date-time displays.

```json
{
  "title":  "Issued",
  "source": "documents[0].issuedAt",
  "type":   "string",
  "format": "date"
}
```

Use `date-time` when the time component matters (e.g. event timestamps); use `date` when only the day matters (e.g. document issue/expiry dates).

### 5.5 `email`

Renders the value as a `mailto:` link.

```json
{
  "title":  "Email",
  "source": "applicant.email",
  "group":  "personal",
  "type":   "string",
  "format": "email"
}
```

### 5.6 `uri`

Renders the value as an external link, opening in a new tab.

```json
{
  "title":  "Source URL",
  "source": "result.sourceUrl",
  "type":   "string",
  "format": "uri"
}
```

### 5.7 `status`

Renders a coloured status badge. Common upstream values like `pass`, `fail`, `verified`, `denied`, `match`, `no_match`, `pending`, `error` are recognised and coloured semantically; unknown values fall back to a neutral badge.

```json
{
  "title":  "Result",
  "source": "result.status",
  "group":  "status",
  "type":   "string",
  "format": "status"
}
```

### 5.8 `percentage`

Renders a coloured pill. Accepts both 0–100 numbers and 0–1 fractions — the renderer handles either.

```json
{
  "title":  "Similarity Score",
  "source": "metadata.similarity",
  "group":  "score",
  "type":   "number",
  "format": "percentage"
}
```

See §5.10 for `score_thresholds` to control colour breakpoints.

### 5.9 `code` and `label`

- `code`: monospace styling. Use for IDs, hashes, technical strings (e.g. session IDs, audit log IDs).
- `label`: converts `FACE_CHALLENGE_VERIFIED` → "Face Challenge Verified", `someValue` → "Some Value". Useful for rendering enum-ish strings without manually titlecasing them.

```json
{
  "title":  "Event Type",
  "source": "eventType",
  "group":  "status",
  "type":   "string",
  "format": "label"
}
```

### 5.10 `score_thresholds`

When `format` is `percentage`, you can specify colour thresholds:

```json
{
  "title":  "Match Score",
  "source": "match_score",
  "type":   "number",
  "format": "percentage",
  "score_thresholds": {
    "green": 90,
    "amber": 70
  }
}
```

| Threshold | Behaviour |
|-----------|-----------|
| `green` | Score ≥ this value renders green |
| `amber` | Score ≥ this value (but below `green`) renders amber. Below this renders red. |

Both fields are optional. If neither is set, the pill colour falls back to sibling `status` field detection, then to a score-based fallback (≥99% green, otherwise neutral grey).

### 5.11 `display` (Array and Object Layout)

For array and object fields:

| Display | Description |
|---------|-------------|
| `table` | Render array items as rows in a data table. |
| `cards` | Render array items as stacked cards. |
| `inline` | Render array items inline (comma-separated or tag list). |

If `display` is omitted, the renderer auto-detects based on item count and structure.

```json
{
  "title":   "Screening Hits",
  "source":  "result.screening_hits",
  "group":   "checks",
  "type":    "array",
  "display": "table",
  "fields": {
    "name":         { "title": "Name",   "source": "name",         "order": 1, "type": "string" },
    "match_score":  { "title": "Match",  "source": "match_score",  "order": 2, "type": "number", "format": "percentage" },
    "source_list":  { "title": "Source", "source": "source",       "order": 3, "type": "string" },
    "listed_date":  { "title": "Listed", "source": "listed_date",  "order": 4, "type": "string", "format": "date" }
  }
}
```

### 5.12 `sensitive`

Click-to-reveal masking. The value is shown as `--------` until the user clicks to reveal.

```json
{
  "title":  "Document Number",
  "source": "documents[0].number",
  "group":  "document",
  "type":   "string",
  "sensitive": true
}
```

Use for: document numbers, IP addresses, full names where appropriate, anything PII-adjacent. Sensitive fields are **not** masked in the raw JSON viewer (which is always available) — masking is purely a UX nudge against shoulder-surfing in the structured view.

---

## 6. Groups

Groups organise fields into visual sections on the dashboard. Each field's `group` property assigns it to a section.

### 6.1 Well-Known Groups

These have built-in titles, column counts, and ordering. Use them whenever the field genuinely fits.

| Group | Section Title | Default Columns | Default Order | Notes |
|-------|---------------|-----------------|---------------|-------|
| `status` | *(no header)* | 3 | 0 | Top of the page; combined visually with `score`. |
| `personal` | "Personal Information" | 3 | 1 | |
| `score` | *(no header)* | 3 | 2 | |
| `document` | "Document Information" | 3 | 3 | |
| `address` | "Address" | 2 | 4 | |
| `general` | "Details" | 3 | 5 | |
| `checks` | "Verification Checks" | 1 | 6 | Full-width; intended for cards. |

### 6.2 Custom Groups

Any string is a valid group name. Custom groups:

- Auto-generate a section title from the group name (e.g. `outcome` → "Outcome", `device` → "Device")
- Default to 3 columns
- Are appended after well-known groups, alphabetically by group name

You'll almost always want to override the title and ordering of custom groups via `group_layout` (§6.4).

### 6.3 Field-Level Order Within a Group

Within a group, fields render in ascending `order`. Fields with equal `order` retain their definition order in the `fields` map (stable sort).

```json
"fields": {
  "similarity":          { "title": "Similarity Score",     "source": "...", "group": "score", "order": 0, "format": "percentage" },
  "similarityThreshold": { "title": "Similarity Threshold", "source": "...", "group": "score", "order": 1, "format": "percentage" },
  "livenessScore":       { "title": "Liveness Score",       "source": "...", "group": "score", "order": 2, "format": "percentage" },
  "livenessThreshold":   { "title": "Liveness Threshold",   "source": "...", "group": "score", "order": 3, "format": "percentage" }
}
```

### 6.4 `group_layout` Overrides

Use the top-level `group_layout` map to customise how a group renders.

```json
"group_layout": {
  "device": {
    "title":   "Device & Network",
    "columns": 4,
    "order":   10
  },
  "location": {
    "title":   "Geolocation",
    "columns": 2,
    "order":   11
  },
  "checks": {
    "columns": 4
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `columns` | number | Override column count. Supported: 1, 2, 3, 4. |
| `title` | string \| null | Override the section title. Set to `null` to suppress the title entirely. |
| `order` | number | Override the rendering position. Interleaves with well-known groups. |

Supported column counts and their responsive behaviour:

| Columns | Mobile | Medium | Large |
|---------|--------|--------|-------|
| 1 | 1 | 1 | 1 |
| 2 | 1 | 2 | 2 |
| 3 | 1 | 2 | 3 |
| 4 | 1 | 2 | 4 |

### 6.5 Empty Groups

If no field in a group resolves to a value, the entire section (header included) is skipped. You don't need to defensively guard against this — just declare your fields and let unmatched paths fall through.

---

## 7. Card Layouts

When a field has `type: "array"` (or `type: "object"`) with `display: "cards"`, you can structure the resulting cards using `card_layout`.

### 7.1 Zones

| Zone | Purpose |
|------|---------|
| `header` | Top row of the card. The first header field's value drives the status icon next to the card title. |
| `body` | Plain text fields (no labels). Renders between header and footer. |
| `footer` | Labeled result lines. Each shows its `title` as an uppercase prefix (e.g. `RESULT: Pass`). |
| *rest* | Any field referenced in `fields` but not assigned to a slot renders normally between body and footer. |

The same field key can appear in multiple slots — for example, a `status` field can drive the header icon AND appear in the footer as a labelled result line.

### 7.2 Header Layout Variants

The header zone adapts to the number of header fields:

- **Single header field** (e.g. `header: ["status"]`): Status icon + card title. This is the compact "check card" pattern.
- **Multiple header fields** (e.g. `header: ["status", "score"]`): Card title on the left, header field values on the right. Useful for outcome cards showing `RESULT: WARNING  76%` next to the title.

### 7.3 Worked Example: Card Layout for a Check

```json
{
  "title":   "Annotation Check",
  "source":  "checkResults.annotationCheck",
  "type":    "object",
  "group":   "checks",
  "display": "cards",
  "card_layout": {
    "header": ["status"],
    "body":   ["message"],
    "footer": ["status"]
  },
  "fields": {
    "status": {
      "title":  "Result",
      "source": "result.status",
      "type":   "string",
      "format": "status"
    },
    "message": {
      "title":  "Message",
      "source": "result.message",
      "type":   "string"
    }
  }
}
```

This renders as:

```
+--------------------------------------------+
| [icon]  Annotation Check                   |   <- header
|                                            |
| The document annotations were verified     |   <- body (message, no label)
| against the reference dataset.             |
|                                            |
| RESULT:  [✓]  Pass                         |   <- footer (status as labelled line)
+--------------------------------------------+
```

### 7.4 Behaviour Rules

| Scenario | Behaviour |
|----------|-----------|
| `card_layout` present + `display: "cards"` | Structured card with header/body/footer zones. |
| `card_layout` present + `display` not `"cards"` | `card_layout` is ignored. Field renders normally. |
| `card_layout` absent + `display: "cards"` | Simple card with all nested fields in a flat grid. |
| Field key in `card_layout` not found in resolved data | Slot is silently skipped. |
| Same field key in multiple slots | Renders in each slot with context-appropriate formatting. |

---

## 8. Nested Fields (Objects and Arrays)

For object and array values, the `fields` property on a `RenderFieldDefinition` lets you control the inner layout — the same `RenderFieldDefinition` shape, recursively.

### 8.1 Object Fields

```json
{
  "title":  "Identity Document",
  "source": "identity_document",
  "group":  "document",
  "order":  1,
  "type":   "object",
  "fields": {
    "document_type":   { "title": "Type",   "source": "type",       "order": 1 },
    "document_number": { "title": "Number", "source": "number",     "order": 2, "sensitive": true },
    "front_image":     { "title": "Front",  "source": "front_url",  "order": 10, "format": "image" },
    "back_image":      { "title": "Back",   "source": "back_url",   "order": 11, "format": "image" }
  }
}
```

Note that `source` paths in nested `fields` are **relative to the parent's resolved object**. In the example above, `document_type`'s `source: "type"` reads `identity_document.type`, not the top-level `type`.

### 8.2 Array Fields

For arrays, the nested `fields` describe the shape of **each item**.

```json
{
  "title":   "Screening Hits",
  "source":  "result.screening_hits",
  "group":   "checks",
  "type":    "array",
  "display": "table",
  "fields": {
    "name":        { "title": "Name",   "source": "name",        "order": 1, "type": "string" },
    "match_score": { "title": "Match",  "source": "match_score", "order": 2, "type": "number", "format": "percentage" },
    "source_list": { "title": "Source", "source": "source",      "order": 3, "type": "string" },
    "listed_date": { "title": "Listed", "source": "listed_date", "order": 4, "type": "string", "format": "date" }
  }
}
```

Each `source` here is relative to one item of the array.

### 8.3 Display Selection

| Item shape | Recommended `display` |
|------------|----------------------|
| Tabular data (consistent fields per row) | `table` |
| Heterogeneous or rich content (status + message + score) | `cards` |
| Short list of primitives or simple objects | `inline` (or omit to auto-detect) |

---

## 9. Common Patterns

### 9.1 Simple Status + Score Layout

For verification types with a binary outcome and a single confidence score:

```json
{
  "version": 1,
  "fields": {
    "outcome": {
      "title": "Result", "source": "result.outcome",
      "group": "status", "order": 0,
      "type": "string", "format": "label"
    },
    "score": {
      "title": "Confidence", "source": "result.confidence",
      "group": "score", "order": 0,
      "type": "number", "format": "percentage"
    }
  }
}
```

### 9.2 Document-Heavy Layout

For verification types focused on identity documents:

```json
{
  "version": 1,
  "fields": {
    "documentType":   { "title": "Type",          "source": "document.type",       "group": "document", "order": 0, "format": "label" },
    "documentNumber": { "title": "Number",        "source": "document.number",     "group": "document", "order": 1, "sensitive": true },
    "frontImage":     { "title": "Front",         "source": "document.frontImage", "group": "document", "order": 10, "format": "image" },
    "backImage":      { "title": "Back",          "source": "document.backImage",  "group": "document", "order": 11, "format": "image" },
    "firstName":      { "title": "First Name",    "source": "applicant.firstName", "group": "personal", "order": 0 },
    "lastName":       { "title": "Last Name",     "source": "applicant.lastName",  "group": "personal", "order": 1 },
    "dateOfBirth":    { "title": "Date of Birth", "source": "applicant.dob",       "group": "personal", "order": 2, "format": "date" }
  }
}
```

### 9.3 Checks-Heavy Layout

For verification types that emit a series of independent sub-checks:

```json
{
  "version": 1,
  "fields": {
    "overallScore": {
      "title": "Overall Score", "source": "result.overall_score",
      "group": "score", "order": 0,
      "type": "number", "format": "percentage",
      "score_thresholds": { "green": 90, "amber": 70 }
    },
    "checks": {
      "title":   "Checks",
      "source":  "result.checks",
      "group":   "checks",
      "order":   0,
      "type":    "array",
      "display": "cards",
      "card_layout": {
        "header": ["status"],
        "body":   ["message"],
        "footer": ["status"]
      },
      "fields": {
        "status":  { "title": "Result",  "source": "status",  "type": "string", "format": "status" },
        "message": { "title": "Message", "source": "message", "type": "string" }
      }
    }
  },
  "group_layout": {
    "checks": { "columns": 1 }
  }
}
```

### 9.4 Device + Network + Location Layout

For verification types capturing device telemetry:

```json
{
  "version": 1,
  "fields": {
    "deviceVendor": { "title": "Device",  "source": "endpoint.device.vendor",  "group": "device", "order": 0 },
    "deviceModel":  { "title": "Model",   "source": "endpoint.device.model",   "group": "device", "order": 1 },
    "osName":       { "title": "OS",      "source": "endpoint.os.name",       "group": "device", "order": 2 },
    "browserName":  { "title": "Browser", "source": "endpoint.browser.name",  "group": "device", "order": 3 },
    "ipAddress":    { "title": "IP",      "source": "endpoint.ip",            "group": "device", "order": 4, "sensitive": true },
    "location":     {
      "title":  "Location",
      "source": "endpoint.location",
      "group":  "location",
      "order":  0,
      "type":   "object",
      "format": "location"
    }
  },
  "group_layout": {
    "device":   { "title": "Device & Network", "columns": 4, "order": 10 },
    "location": { "title": "Geolocation",      "columns": 2, "order": 11 }
  }
}
```

---

## 10. End-to-End Example

A compact `render_schema` for the fictional `liveness_check` type from `verification-type-authoring-guide.md` §12:

```json
{
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
      "format": "percentage",
      "score_thresholds": { "green": 90, "amber": 75 }
    },
    "userEmail": {
      "title":  "Email",
      "source": "userEmail",
      "group":  "personal",
      "order":  0,
      "type":   "string",
      "format": "email"
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
    },
    "deviceId": {
      "title":  "Device",
      "source": "metadata.deviceId",
      "group":  "general",
      "order":  2,
      "type":   "string",
      "format": "code"
    }
  }
}
```

This renders as (approximate):

```
+----------------------------------------------------------------+
|  (status group, no header)                                     |
|  [Pass]                                                        |
+----------------------------------------------------------------+
|  Personal Information                                          |
|  +---------------------+                                       |
|  | Email               |                                       |
|  | user@example.com    |                                       |
|  +---------------------+                                       |
+----------------------------------------------------------------+
|  (score group, no header)                                      |
|  +-----------------------+                                     |
|  | Confidence            |                                     |
|  | ████████████  92%     |                                     |
|  +-----------------------+                                     |
+----------------------------------------------------------------+
|  Details                                                       |
|  +---------------+ +-----------------+ +-----------------+    |
|  | Capture       | | Performed At    | | Device          |    |
|  | [thumbnail]   | | 2026-04-15 ...  | | ios-414         |    |
|  +---------------+ +-----------------+ +-----------------+    |
+----------------------------------------------------------------+
```

---

## 11. Authoring Checklist

**Source paths**

- [ ] Every `source` resolves to a real path in a representative payload
- [ ] No GJSON syntax accidentally used (`#`, `==`, modifiers — those are for the backend extraction paths only)
- [ ] Array filter expressions use the `[?key=value]` form

**Field definitions**

- [ ] Every field has `title`, `source`, `group`
- [ ] `type` set explicitly for primitives where it matters (helps with auto-detection edge cases)
- [ ] `format` set for anything that's not a plain string/number — images, PDFs, locations, percentages, dates, statuses
- [ ] `sensitive: true` on PII-adjacent fields (document numbers, IPs, full names where appropriate)

**Groups**

- [ ] Used well-known groups where they fit (`status`, `score`, `personal`, `document`, `address`, `general`, `checks`)
- [ ] Custom groups have `group_layout` entries setting `title`, `columns`, and `order`
- [ ] Field `order` values within each group are sensible

**Cards (if used)**

- [ ] `display: "cards"` and `card_layout` together
- [ ] Header/body/footer zones reference real field keys
- [ ] Single header field for compact cards, multiple for outcome-style cards

**Nested fields**

- [ ] `source` paths inside nested `fields` are **relative** to the parent
- [ ] Array `display` mode (`table`, `cards`, `inline`) is appropriate for the item shape

**End-to-end**

- [ ] Rendered against a real payload and visually verified
- [ ] Empty groups don't render (they shouldn't — but worth confirming)
- [ ] Sensitive fields mask correctly and reveal on click
- [ ] Images/PDFs load through the media proxy (not directly from upstream URLs)

---

## 12. Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| GJSON syntax in `source` | Field shows nothing | Use the frontend syntax (`a.b`, `a[0].b`, `a[?k=v].b`). GJSON is for the backend only. |
| Image field rendering as plain URL text | URL string in dashboard instead of thumbnail | Add `format: "image"`. There is no auto-detection by URL pattern or property name. |
| PDF rendering as plain URL text | Same — text instead of icon card | Add `format: "pdf"`. |
| Location not rendering as a map | Object dump in dashboard | Add `type: "object", format: "location"`. The source must resolve to an object with `latitude`/`longitude` (or compatible) properties. |
| Custom group appears at the bottom alphabetically | Sections in unexpected order | Add a `group_layout` entry with an explicit `order` to interleave with well-known groups. |
| Card layout zones empty in some payloads | Cards look blank or partial | Slots are silently skipped when source paths don't resolve. Either guarantee the source data, or accept the variation. |
| `card_layout` set but `display` missing | Card layout ignored | Card zones only apply when `display: "cards"`. Add it. |
| `sensitive` field still readable in raw JSON | Expected — masking is structured-view only | Raw JSON viewer is always available and is not masked. Use the click-to-reveal in the structured view as a UX nudge, not a security control. |
| Breaking layout changes after a payload format update | Fields show as undefined/null | `render_schema` source paths read from the stored payload. Historical payloads with the old shape will still render against the current `render_schema` — paths must be defensive against missing fields, or you need parallel coverage. |


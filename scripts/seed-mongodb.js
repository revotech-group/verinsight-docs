// ============================================================================
// VerInsight MongoDB Seed Script
// ============================================================================
// Run with: mongosh <connection-string> scripts/seed-mongodb.js
//
// This script seeds the config/settings collections derived from the
// dashboard mock data. 
// ============================================================================

const now = new Date().toISOString();

// ============================================================================
// 1. PROPERTY TYPES  (collection: property_types)
// Platform-managed — NO tenant_id
// ============================================================================

db.property_types.insertMany([
  {
    id: "ptype_email",
    key: "sys:email",
    name: "Email Address",
    description: "Email address for contact",
    validation_regex: "",
    status: "active",
    created_at: now,
    updated_at: now,
  },
  {
    id: "ptype_phone",
    key: "sys:phone",
    name: "Phone Number",
    description: "Phone number with country code",
    validation_regex: "",
    status: "active",
    created_at: now,
    updated_at: now,
  },
  {
    id: "ptype_given_name",
    key: "sys:given_name",
    name: "Given Name",
    description: "First / given name",
    validation_regex: "",
    status: "active",
    created_at: now,
    updated_at: now,
  },
  {
    id: "ptype_surname",
    key: "sys:surname",
    name: "Surname",
    description: "Last / family name",
    validation_regex: "",
    status: "active",
    created_at: now,
    updated_at: now,
  },
  {
    id: "ptype_dob",
    key: "sys:date_of_birth",
    name: "Date of Birth",
    description: "Date of birth",
    validation_regex: "",
    status: "active",
    created_at: now,
    updated_at: now,
  },
  {
    id: "ptype_invitee_email",
    key: "sys:invitee_email",
    name: "Invitee Email",
    description: "Invitee email",
    validation_regex: "",
    status: "active",
    created_at: now,
    updated_at: now,
  },
  {
    id: "ptype_invitee_given_name",
    key: "sys:invitee_given_name",
    name: "Invitee Given Name",
    description: "Invitee given name",
    validation_regex: "",
    status: "active",
    created_at: now,
    updated_at: now,
  },
  {
    id: "ptype_invitee_surname",
    key: "sys:invitee_surname",
    name: "Invitee Surname",
    description: "Invitee surname",
    validation_regex: "",
    status: "active",
    created_at: now,
    updated_at: now,
  },
  {
    id: "ptype_invitee_date_of_birth",
    key: "sys:invitee_date_of_birth",
    name: "Invitee Date of Birth",
    description: "Invitee date of birth",
    validation_regex: "",
    status: "active",
    created_at: now,
    updated_at: now,
  },
  {
    id: "ptype_document_id",
    key: "sys:document_id",
    name: "Document ID",
    description: "Document ID",
    validation_regex: "",
    status: "active",
    created_at: now,
    updated_at: now,
  },
  {
    id: "ptype_document_type",
    key: "sys:document_type",
    name: "Document Type",
    description: "Document type",
    validation_regex: "",
    status: "active",
    created_at: now,
    updated_at: now,
  },

]);

print("✓ Inserted 6 property types");


// ============================================================================
// 2. VERIFICATION TYPES  (collection: verification_types)
//    Platform-managed — NO tenant_id
// ============================================================================

// --- IDV payload schema ---
const idvPayloadSchema = {
  type: "object",
  properties: {
    verificationId: { type: "string", title: "Verification ID" },
    externalRefId: { type: "string", title: "External Reference ID" },
    status: { type: "string", title: "Status", enum: ["DONE", "IN_PROGRESS", "FAILED"] },
    createdAt: { type: "string", title: "Created At", format: "date-time" },
    identityOwner: {
      type: "object",
      title: "Identity Owner",
      properties: {
        givenName: { type: "string", title: "Given Name" },
        middleName: { type: "string", title: "Middle Name" },
        familyName: { type: "string", title: "Family Name" },
        dateOfBirth: { type: "string", title: "Date of Birth", format: "date" },
        gender: { type: "string", title: "Gender" },
        email: { type: "string", title: "Email", format: "email" },
        mobileNumber: { type: "string", title: "Mobile Number" },
      },
    },
    results: {
      type: "object",
      title: "Results",
      properties: {
        proofingOutcomes: {
          type: "array",
          title: "Proofing Outcomes",
          items: {
            type: "object",
            properties: {
              proofingStatus: { type: "string", title: "Proofing Status", enum: ["PASS", "FAIL", "REVIEW", "PENDING"] },
              proofingType: {
                type: "object",
                title: "Proofing Type",
                properties: {
                  code: { type: "string", title: "Code" },
                  name: { type: "string", title: "Name" },
                },
              },
              documents: {
                type: "array",
                title: "Documents",
                items: {
                  type: "object",
                  properties: {
                    countryCode: { type: "string", title: "Country Code" },
                    documentType: { type: "string", title: "Document Type" },
                    documentDisplayName: { type: "string", title: "Document Name" },
                    category: { type: "string", title: "Category" },
                    documentClassificationCode: { type: "string", title: "Classification Code" },
                    status: { type: "string", title: "Status", enum: ["PASS", "FAIL", "REVIEW"] },
                    proofingTag: { type: "array", title: "Proofing Tags", items: { type: "string" } },
                    images: { type: "array", title: "Document Images", items: { type: "string", format: "uri" } },
                    securityChecks: {
                      type: "array",
                      title: "Security Checks",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string", title: "Type" },
                          name: { type: "string", title: "Check Name" },
                          status: { type: "string", title: "Status", enum: ["PASS", "FAIL", "WARNING", "USER_UPDATE"] },
                          statusReason: { type: "string", title: "Reason" },
                          score: { type: "number", title: "Score", minimum: 0, maximum: 1 },
                          subChecks: {
                            type: "array",
                            title: "Sub-Checks",
                            items: {
                              type: "object",
                              properties: {
                                type: { type: "string", title: "Type" },
                                name: { type: "string", title: "Name" },
                                score: { type: "number", title: "Score", minimum: 0, maximum: 1 },
                              },
                            },
                          },
                          detail: {
                            type: "object",
                            title: "Detail",
                            properties: {
                              similarity: { type: "number", title: "Similarity", minimum: 0, maximum: 1 },
                            },
                          },
                        },
                      },
                    },
                    documentData: {
                      type: "array",
                      title: "Document Data",
                      items: {
                        type: "object",
                        properties: {
                          key: { type: "string", title: "Field" },
                          value: { type: "string", title: "Value" },
                          confidence: { type: "number", title: "Confidence", minimum: 0, maximum: 1 },
                        },
                      },
                    },
                  },
                },
              },
              userBehaviourChecks: {
                type: "array",
                title: "User Behaviour Checks",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", title: "Type" },
                    name: { type: "string", title: "Check Name" },
                    status: { type: "string", title: "Status", enum: ["PASS", "FAIL"] },
                    score: { type: "number", title: "Score", minimum: 0, maximum: 1 },
                  },
                },
              },
            },
          },
        },
        overallProofingChecks: { type: "array", title: "Overall Proofing Checks", items: { type: "object" } },
        otherCheckOutcomes: { type: "array", title: "Other Check Outcomes", items: { type: "object" } },
        faceImage: { type: "string", title: "Face Image", format: "uri" },
        reports: {
          type: "array",
          title: "Reports",
          items: {
            type: "object",
            properties: {
              name: { type: "string", title: "Report Name" },
              type: { type: "string", title: "Type" },
              reportUrl: { type: "string", title: "Report URL", format: "uri" },
              details: {
                type: "object",
                title: "Details",
                properties: { status: { type: "string", title: "Status" } },
              },
            },
          },
        },
      },
    },
  },
};

// --- IDV render schema ---
const idvRenderSchema = {
  version: 1,
  fields: {
    faceImage: { title: "Face Image", source: "results.faceImage", group: "score", order: 0, type: "string", format: "image" },
    livenessScore: { title: "Liveness Score", source: "results.proofingOutcomes[0].userBehaviourChecks[?type=liveness].score", group: "score", order: 1, type: "number", format: "percentage" },
    status: { title: "Status", source: "status", group: "status", order: 0, type: "string", format: "status" },
    verificationId: { title: "Verification ID", source: "verificationId", group: "status", order: 1, type: "string" },
    createdAt: { title: "Created At", source: "createdAt", group: "status", order: 2, type: "string", format: "date-time" },
    givenName: { title: "Given Name", source: "identityOwner.givenName", group: "personal", order: 0, type: "string" },
    middleName: { title: "Middle Name", source: "identityOwner.middleName", group: "personal", order: 1, type: "string" },
    familyName: { title: "Family Name", source: "identityOwner.familyName", group: "personal", order: 2, type: "string" },
    dateOfBirth: { title: "Date of Birth", source: "identityOwner.dateOfBirth", group: "personal", order: 3, type: "string", format: "date" },
    email: { title: "Email", source: "identityOwner.email", group: "personal", order: 4, type: "string", format: "email" },
    mobileNumber: { title: "Mobile Number", source: "identityOwner.mobileNumber", group: "personal", order: 5, type: "string" },
    documents: {
      title: "",
      source: "results.proofingOutcomes[0].documents",
      group: "document",
      order: 0,
      type: "array",
      display: "cards",
      fields: {
        documentName: { title: "Document", source: "documentDisplayName", group: "general", order: 0, type: "string" },
        country: { title: "Country", source: "countryCode", group: "general", order: 1, type: "string" },
        status: { title: "Status", source: "status", group: "general", order: 2, type: "string", format: "status" },
        images: { title: "Document Images", source: "images", group: "general", order: 3, type: "array", format: "image" },
        documentData: {
          title: "Document Data",
          source: "documentData",
          group: "general",
          order: 4,
          type: "array",
          display: "table",
          fields: {
            key: { title: "Field", source: "key", group: "general", order: 0, type: "string", format: "label" },
            value: { title: "Value", source: "value", group: "general", order: 1, type: "string" },
            confidence: { title: "Confidence", source: "confidence", group: "general", order: 2, type: "number", format: "percentage" },
          },
        },
        securityChecks: {
          title: "Security Checks",
          source: "securityChecks",
          group: "general",
          order: 5,
          type: "array",
          display: "table",
          fields: {
            name: { title: "Check Name", source: "name", group: "general", order: 0, type: "string" },
            status: { title: "Status", source: "status", group: "general", order: 1, type: "string", format: "status" },
            score: { title: "Score", source: "score", group: "general", order: 2, type: "number", format: "percentage" },
          },
        },
      },
    },
  },
};

// --- Doc Fraud check result sub-schema (reused) ---
const docFraudCheckResultSchema = {
  type: "object",
  properties: {
    completedAt: { type: "string", title: "Completed At" },
    name: { type: "string", title: "Check Name" },
    result: {
      type: "object",
      properties: {
        checkMetadata: { type: "object", title: "Check Metadata" },
        checkResponse: { type: "object", title: "Check Response" },
        message: { type: "string", title: "Message" },
        status: { type: "string", title: "Status", enum: ["PASS", "FAIL", "WARNING", "NOT_APPLICABLE"] },
      },
    },
  },
};

// --- Doc Fraud payload schema ---
const docFraudPayloadSchema = {
  type: "object",
  properties: {
    status: { type: "string", title: "Status", enum: ["DONE", "IN_PROGRESS", "FAILED"] },
    documentVerifyId: { type: "string", title: "Document Verify ID" },
    externalRefId: { type: "string", title: "External Reference ID" },
    createdAt: { type: "string", title: "Created At", format: "date-time" },
    updatedAt: { type: "string", title: "Updated At", format: "date-time" },
    tenantAlias: { type: "string", title: "Tenant Alias" },
    agentDetails: {
      type: "object",
      title: "Agent Detail",
      properties: {
        userId: { type: "string", title: "User ID" },
        givenName: { type: "string", title: "Given Name" },
        familyName: { type: "string", title: "Family Name" },
      },
    },
    batchRefId: { type: "string", title: "Batch Reference ID" },
    batchRefDescription: { type: "string", title: "Batch Reference Description" },
    document: {
      type: "object",
      title: "Document",
      properties: {
        countryCode: { type: "string", title: "Country Code" },
        documentId: { type: "string", title: "Document ID" },
        documentType: { type: "string", title: "Document Type" },
        url: { type: "string", title: "Document URL", format: "uri" },
      },
    },
    metadata: { type: "object", title: "Metadata" },
    outcomes: {
      type: "array",
      title: "Outcomes",
      items: {
        type: "object",
        properties: {
          name: { type: "string", title: "Check Name" },
          type: { type: "string", title: "Check Type" },
          status: { type: "string", title: "Status", enum: ["PASS", "FAIL", "WARNING"] },
          score: { type: "number", title: "Score", minimum: 0, maximum: 100 },
          message: { type: "string", title: "Message" },
        },
      },
    },
    checkResults: {
      type: "object",
      title: "Check Results",
      properties: {
        annotationCheck: docFraudCheckResultSchema,
        c2paCheck: docFraudCheckResultSchema,
        compressionHeatmapCheck: docFraudCheckResultSchema,
        deepFakeCheck: docFraudCheckResultSchema,
        deepFake2Check: docFraudCheckResultSchema,
        deepFake3Check: docFraudCheckResultSchema,
        deepFake4Check: docFraudCheckResultSchema,
        deepFake5Check: docFraudCheckResultSchema,
        deepFake6Check: docFraudCheckResultSchema,
        deepFake7Check: docFraudCheckResultSchema,
        eofCountCheck: docFraudCheckResultSchema,
        handwritingCheck: docFraudCheckResultSchema,
        invoiceDateAnomalyCheck: docFraudCheckResultSchema,
        invoiceTotalAnomalyCheck: docFraudCheckResultSchema,
        screenshotCheck: docFraudCheckResultSchema,
        softwareEditorCheck: docFraudCheckResultSchema,
        softwareFingerPrintCheck: docFraudCheckResultSchema,
        timeStampCheck: docFraudCheckResultSchema,
        vendorMissingFieldsCheck: docFraudCheckResultSchema,
        vendorValidationCheck: docFraudCheckResultSchema,
        visualAnomalyCheck: docFraudCheckResultSchema,
        watermarkCheck: docFraudCheckResultSchema,
      },
    },
  },
};

// --- Doc Fraud render schema ---
const docFraudCheckField = (title, source, order) => ({
  title,
  source,
  group: "checks",
  order,
  type: "object",
  display: "cards",
  card_layout: { header: ["status"], body: ["message"], footer: ["status"], expandable: ["metadata"] },
  fields: {
    status: { title: "Result", source: "result.status", group: "general", order: 0, type: "string", format: "status" },
    message: { title: "", source: "result.message", group: "general", order: 1, type: "string" },
    metadata: { title: "Metadata", source: "result.checkMetadata", group: "general", order: 10, type: "object" },
  },
});

const docFraudRenderSchema = {
  version: 1,
  group_layout: {
    image: { title: "Submitted Document", order: 4 },
    outcome: { title: null, order: 5 },
    checks: { columns: 4, order: 6 },
  },
  fields: {
    status: { title: "Status", source: "status", group: "status", order: 0, type: "string", format: "status" },
    documentVerifyId: { title: "Document Verify ID", source: "documentVerifyId", group: "status", order: 1, type: "string" },
    externalRefId: { title: "External Reference ID", source: "externalRefId", group: "status", order: 2, type: "string" },
    createdAt: { title: "Created At", source: "createdAt", group: "status", order: 3, type: "string", format: "date-time" },
    documentType: { title: "Document Type", source: "document.documentType", group: "document", order: 0, type: "string" },
    countryCode: { title: "Country Code", source: "document.countryCode", group: "document", order: 1, type: "string" },
    documentId: { title: "Document ID", source: "document.documentId", group: "document", order: 2, type: "string" },
    batchRefId: { title: "Batch Reference", source: "batchRefId", group: "document", order: 3, type: "string" },
    batchRefDescription: { title: "Batch Description", source: "batchRefDescription", group: "document", order: 4, type: "string" },
    submittedDocument: { title: "", source: "document.url", group: "image", order: 0, type: "string", format: "document" },
    outcomes: {
      title: "Document Fraud Check Outcome",
      source: "outcomes[0]",
      group: "outcome",
      order: 0,
      type: "object",
      display: "cards",
      card_layout: { header: ["status", "score"], body: ["message"] },
      fields: {
        status: { title: "Result", source: "status", group: "general", order: 0, type: "string", format: "status" },
        message: { title: "", source: "message", group: "general", order: 1, type: "string" },
        score: { title: "Score", source: "score", group: "general", order: 2, type: "number", format: "percentage" },
      },
    },
    annotationCheck: docFraudCheckField("Annotation Check", "checkResults.annotationCheck", 1),
    c2paCheck: docFraudCheckField("C2PA Check", "checkResults.c2paCheck", 2),
    deepFakeCheck: {
      ...docFraudCheckField("Deepfake Check", "checkResults.deepFakeCheck", 3),
      fields: {
        status: { title: "Result", source: "result.status", group: "general", order: 0, type: "string", format: "status" },
        score: { title: "Score", source: "result.checkResponse.score", group: "general", order: 1, type: "number", format: "percentage" },
        message: { title: "", source: "result.message", group: "general", order: 2, type: "string" },
        metadata: { title: "Metadata", source: "result.checkMetadata", group: "general", order: 10, type: "object" },
      },
    },
    eofCountCheck: docFraudCheckField("EOF Count Check", "checkResults.eofCountCheck", 4),
    handwritingCheck: docFraudCheckField("Handwriting Check", "checkResults.handwritingCheck", 5),
    screenshotCheck: docFraudCheckField("Screenshot Check", "checkResults.screenshotCheck", 6),
    softwareEditorCheck: docFraudCheckField("Software Editor Check", "checkResults.softwareEditorCheck", 7),
    softwareFingerPrintCheck: docFraudCheckField("Software Fingerprint Check", "checkResults.softwareFingerPrintCheck", 8),
    visualAnomalyCheck: docFraudCheckField("Visual Anomaly Check", "checkResults.visualAnomalyCheck", 9),
    watermarkCheck: docFraudCheckField("Watermark Check", "checkResults.watermarkCheck", 10),
    invoiceDateAnomalyCheck: docFraudCheckField("Invoice Date Anomaly Check", "checkResults.invoiceDateAnomalyCheck", 11),
    invoiceTotalAnomalyCheck: docFraudCheckField("Invoice Total Anomaly Check", "checkResults.invoiceTotalAnomalyCheck", 12),
    vendorMissingFieldsCheck: docFraudCheckField("Vendor Missing Fields Check", "checkResults.vendorMissingFieldsCheck", 13),
    vendorValidationCheck: docFraudCheckField("Vendor Validation Check", "checkResults.vendorValidationCheck", 14),
    compressionHeatmapCheck: docFraudCheckField("Compression Heatmap Check", "checkResults.compressionHeatmapCheck", 15),
    timeStampCheck: docFraudCheckField("Timestamp Check", "checkResults.timeStampCheck", 16),
  },
};

// --- Face Auth payload schema ---
const faceAuthPayloadSchema = {
  type: "object",
  properties: {
    eventId: { type: "string" },
    eventType: { type: "string", enum: ["FACE_CHALLENGE_VERIFIED", "FACE_CHALLENGE_DENIED", "FRAUD"] },
    tenantAlias: { type: "string" },
    sessionId: { type: "string", format: "uuid" },
    userId: { type: "string" },
    username: { type: "string", format: "email" },
    clientId: { type: "string" },
    clientName: { type: "string" },
    projectId: { type: "string" },
    similarity: { type: "number", minimum: 0, maximum: 100 },
    similarityThreshold: { type: "number", minimum: 0, maximum: 100 },
    livenessScore: { type: "number", minimum: 0, maximum: 100 },
    livenessThreshold: { type: "number", minimum: 0, maximum: 100 },
    timestamp: { type: "string", format: "date-time" },
    endpoint: {
      type: "object",
      properties: {
        userAgent: { type: "string" },
        ip: { type: "string" },
        browser: {
          type: "object",
          properties: {
            name: { type: "string" },
            version: { type: "string" },
            major: { type: "string" },
          },
        },
        os: {
          type: "object",
          properties: {
            name: { type: "string" },
            version: { type: "string" },
          },
        },
        device: {
          type: "object",
          properties: {
            vendor: { type: "string" },
            model: { type: "string" },
            type: { type: "string" },
          },
        },
        cpu: { type: "object" },
        location: {
          type: "object",
          properties: {
            locality: { type: "string" },
            countryCode: { type: "string" },
            country: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            administrativeArea: { type: "string" },
            postalCode: { type: "string" },
          },
          required: ["latitude", "longitude"],
        },
      },
    },
  },
  required: ["eventId", "tenantAlias", "sessionId", "userId", "username", "clientId", "clientName", "projectId", "timestamp", "eventType", "similarity", "similarityThreshold", "livenessScore", "livenessThreshold"],
};

// --- Face Auth render schema ---
const faceAuthRenderSchema = {
  version: 1,
  fields: {
    eventType: { title: "Result", source: "eventType", group: "status", order: 0, type: "string", format: "label" },
    similarity: { title: "Similarity Score", source: "similarity", group: "score", order: 0, type: "number", format: "percentage" },
    similarityThreshold: { title: "Similarity Threshold", source: "similarityThreshold", group: "score", order: 1, type: "number", format: "percentage" },
    livenessScore: { title: "Liveness Score", source: "livenessScore", group: "score", order: 2, type: "number", format: "percentage" },
    livenessThreshold: { title: "Liveness Threshold", source: "livenessThreshold", group: "score", order: 3, type: "number", format: "percentage" },
    username: { title: "Email", source: "username", group: "personal", order: 0, type: "string" },
    clientName: { title: "Client", source: "clientName", group: "general", order: 0, type: "string" },
    timestamp: { title: "Timestamp", source: "timestamp", group: "general", order: 2, type: "string", format: "date-time" },
    deviceVendor: { title: "Device", source: "endpoint.device.vendor", group: "device", order: 0, type: "string" },
    deviceModel: { title: "Model", source: "endpoint.device.model", group: "device", order: 1, type: "string" },
    deviceType: { title: "Type", source: "endpoint.device.type", group: "device", order: 2, type: "string", format: "label" },
    osName: { title: "OS", source: "endpoint.os.name", group: "device", order: 3, type: "string" },
    osVersion: { title: "OS Version", source: "endpoint.os.version", group: "device", order: 4, type: "string" },
    browserName: { title: "Browser", source: "endpoint.browser.name", group: "device", order: 5, type: "string" },
    browserVersion: { title: "Browser Version", source: "endpoint.browser.version", group: "device", order: 6, type: "string" },
    ip: { title: "IP Address", source: "endpoint.ip", group: "device", order: 7, type: "string", sensitive: true },
    location: { title: "Location", source: "endpoint.location", group: "location", order: 0, type: "object", format: "location", location_keys: { lat: "latitude", lng: "longitude" } },
    country: { title: "Country", source: "endpoint.location.country", group: "location", order: 1, type: "string" },
    administrativeArea: { title: "State / Region", source: "endpoint.location.administrativeArea", group: "location", order: 2, type: "string" },
    postalCode: { title: "Postal Code", source: "endpoint.location.postalCode", group: "location", order: 3, type: "string" },
  },
  group_layout: {
    device: { title: "Device & Network", columns: 4, order: 10 },
    location: { title: "Geolocation", columns: 2, order: 11 },
  },
};

// --- Repeat Image Check payload schema ---
const ricPayloadSchema = {
  type: "object",
  properties: {
    transactionId: { type: "string", title: "Transaction ID" },
    outcome: {
      type: "object",
      title: "Outcome",
      properties: {
        status: { type: "string", title: "Status", enum: ["PASS", "FAIL", "WARNING", "ERROR"] },
        similarity: { type: "number", title: "Similarity", minimum: 0, maximum: 1 },
      },
    },
    externalAttributes: {
      type: "object",
      title: "External Attributes",
      properties: {
        externalRefId: { type: "string", title: "External Reference ID" },
      },
    },
    agentDetails: {
      type: "object",
      title: "Agent Detail",
      properties: {
        userId: { type: "string", title: "User ID" },
        givenName: { type: "string", title: "Given Name" },
        familyName: { type: "string", title: "Family Name" },
      },
    },
    image: {
      type: "object",
      title: "Submitted Image",
      properties: {
        url: { type: "string", title: "Image URL", format: "uri" },
      },
    },
    matchedImages: {
      type: "array",
      title: "Matched Images",
      items: {
        type: "object",
        properties: {
          instanceId: { type: "string", title: "Instance ID" },
          imageId: { type: "string", title: "Image ID" },
          externalAttributes: {
            type: "object",
            title: "External Attributes",
            properties: {
              externalRefId: { type: "string", title: "External Reference ID" },
            },
          },
          document: {
            type: "object",
            title: "Document",
            properties: {
              image: {
                type: "object",
                title: "Document Image",
                properties: {
                  url: { type: "string", title: "Image URL", format: "uri" },
                },
              },
            },
          },
          createdAt: { type: "string", title: "Created At", format: "date-time" },
          similarity: { type: "number", title: "Similarity", minimum: 0, maximum: 1 },
          status: { type: "string", title: "Match Status", enum: ["MATCH", "NOT_MATCH"] },
          overlays: {
            type: "object",
            title: "Overlays",
            properties: {
              delta: {
                type: "object",
                title: "Delta Overlay",
                properties: {
                  url: { type: "string", title: "Delta Image URL", format: "uri" },
                },
              },
              negative: {
                type: "object",
                title: "Negative Overlay",
                properties: {
                  url: { type: "string", title: "Negative Image URL", format: "uri" },
                },
              },
            },
          },
        },
      },
    },
  },
};

// --- Repeat Image Check render schema ---
const ricRenderSchema = {
  version: 1,
  fields: {
    status: { title: "Status", source: "status", group: "status", order: 0, type: "string", format: "status" },
    transactionId: { title: "Transaction ID", source: "transactionId", group: "status", order: 1, type: "string" },
    externalRefId: { title: "External Reference ID", source: "externalAttributes.externalRefId", group: "status", order: 2, type: "string" },
    submittedImage: { title: "", source: "document.image.url", group: "image", order: 0, type: "string", format: "image" },
    matchedImages: {
      title: "",
      source: "matchedImages",
      group: "matches",
      order: 0,
      type: "array",
      display: "cards",
      fields: {
        status: { title: "Match Status", source: "status", group: "general", order: 0, type: "string", format: "status" },
        similarity: { title: "Similarity", source: "similarity", group: "general", order: 1, type: "number", format: "percentage" },
        externalRefId: { title: "External Ref", source: "externalAttributes.externalRefId", group: "general", order: 2, type: "string" },
        createdAt: { title: "Created At", source: "createdAt", group: "general", order: 3, type: "string", format: "date-time" },
        matchedImage: { title: "Matched Image", source: "document.image.url", group: "images", order: 0, type: "string", format: "image" },
        deltaOverlay: { title: "Delta Overlay", source: "overlays.delta.url", group: "images", order: 1, type: "string", format: "image" },
        negativeOverlay: { title: "Negative Overlay", source: "overlays.negative.url", group: "images", order: 2, type: "string", format: "image" },
      },
    },
  },
  group_layout: {
    status: { title: null, order: 0 },
    image: { title: "Submitted Image", order: 1 },
    matches: { title: "Matched Images", order: 2 },
  },
};

// --- Repeat Text Check payload schema ---
const rtcPayloadSchema = {
  type: "object",
  properties: {
    transactionId: { type: "string", title: "Transaction ID" },
    outcome: {
      type: "object",
      title: "Outcome",
      properties: {
        status: { type: "string", title: "Status", enum: ["PASS", "FAIL", "WARNING", "ERROR"] },
        similarity: { type: "number", title: "Similarity", minimum: 0, maximum: 1 },
      },
    },
    externalAttributes: {
      type: "object",
      title: "External Attributes",
      properties: {
        externalRefId: { type: "string", title: "External Reference ID" },
      },
    },
    agentDetails: {
      type: "object",
      title: "Agent Detail",
      properties: {
        userId: { type: "string", title: "User ID" },
        givenName: { type: "string", title: "Given Name" },
        familyName: { type: "string", title: "Family Name" },
      },
    },
    image: {
      type: "object",
      title: "Submitted Image",
      properties: {
        url: { type: "string", title: "Image URL", format: "uri" },
      },
    },
    matchedDocuments: {
      type: "array",
      title: "Matched Documents",
      items: {
        type: "object",
        properties: {
          instanceId: { type: "string", title: "Instance ID" },
          documentId: { type: "string", title: "Document ID" },
          externalAttributes: {
            type: "object",
            title: "External Attributes",
            properties: {
              externalRefId: { type: "string", title: "External Reference ID" },
            },
          },
          document: {
            type: "object",
            title: "Document",
            properties: {
              image: {
                type: "object",
                title: "Document Image",
                properties: {
                  url: { type: "string", title: "Image URL", format: "uri" },
                },
              },
            },
          },
          matchedTexts: {
            type: "array",
            title: "Matched Texts",
            items: {
              type: "object",
              properties: {
                documentId: { type: "string", title: "Document ID" },
                textId: { type: "string", title: "Text ID" },
                segmentNumber: { type: "integer", title: "Segment Number" },
                similarity: { type: "number", title: "Similarity", minimum: 0, maximum: 1 },
                status: { type: "string", title: "Match Status", enum: ["MATCH", "NOT_MATCH"] },
              },
            },
          },
          similarity: { type: "number", title: "Similarity", minimum: 0, maximum: 1 },
          status: { type: "string", title: "Match Status", enum: ["MATCH", "NOT_MATCH"] },
          createdAt: { type: "string", title: "Created At", format: "date-time" },
          overlays: {
            type: "object",
            title: "Overlays",
            properties: {
              delta: {
                type: "object",
                title: "Delta Overlay",
                properties: {
                  url: { type: "string", title: "Delta Image URL", format: "uri" },
                },
              },
              negative: {
                type: "object",
                title: "Negative Overlay",
                properties: {
                  url: { type: "string", title: "Negative Image URL", format: "uri" },
                },
              },
            },
          },
        },
      },
    },
  },
};

// --- Repeat Text Check render schema ---
const rtcRenderSchema = {
  version: 1,
  fields: {
    status: { title: "Status", source: "status", group: "status", order: 0, type: "string", format: "status" },
    transactionId: { title: "Transaction ID", source: "transactionId", group: "status", order: 1, type: "string" },
    externalRefId: { title: "External Reference ID", source: "externalAttributes.externalRefId", group: "status", order: 2, type: "string" },
    submittedImage: { title: "", source: "document.image.url", group: "image", order: 0, type: "string", format: "image" },
    matchedDocuments: {
      title: "",
      source: "matchedDocuments",
      group: "matches",
      order: 0,
      type: "array",
      display: "cards",
      fields: {
        status: { title: "Match Status", source: "status", group: "general", order: 0, type: "string", format: "status" },
        similarity: { title: "Similarity", source: "similarity", group: "general", order: 1, type: "number", format: "percentage" },
        externalRefId: { title: "External Ref", source: "externalAttributes.externalRefId", group: "general", order: 2, type: "string" },
        createdAt: { title: "Created At", source: "createdAt", group: "general", order: 3, type: "string", format: "date-time" },
        matchedImage: { title: "Document Image", source: "document.image.url", group: "images", order: 0, type: "string", format: "image" },
        deltaOverlay: { title: "Delta Overlay", source: "overlays.delta.url", group: "images", order: 1, type: "string", format: "image" },
        negativeOverlay: { title: "Negative Overlay", source: "overlays.negative.url", group: "images", order: 2, type: "string", format: "image" },
        matchedTexts: {
          title: "Matched Text Segments",
          source: "matchedTexts",
          group: "texts",
          order: 0,
          type: "array",
          display: "table",
          fields: {
            segmentNumber: { title: "Segment", source: "segmentNumber", group: "general", order: 0, type: "integer" },
            similarity: { title: "Similarity", source: "similarity", group: "general", order: 1, type: "number", format: "percentage" },
            status: { title: "Status", source: "status", group: "general", order: 2, type: "string", format: "status" },
          },
        },
      },
    },
  },
  group_layout: {
    status: { title: null, order: 0 },
    image: { title: "Submitted Image", order: 1 },
    matches: { title: "Matched Documents", order: 2 },
  },
};

// --- Insert verification types ---
db.verification_types.insertMany([
  {
    id: "vtype_idv",
    key: "idv",
    name: "IDV Check",
    description: "Identity verification",
    ingestion_mode: "single",
    field_mappings: {
      source_verification_id: { source: "verificationId" },
      external_id: { source: "externalRefId" },
      status: {
        source: "status",
        transform: "enum",
        enum_map: {
          DONE: "done",
        },
      },
      outcome: {
        source: "results.proofingOutcomes.#(proofingType.code==\"IDENTITY_PROOFING\").proofingStatus",
        transform: "enum",
        enum_map: {
          PASS: "pass",
          FAIL: "fail",
          WARNING: "warning",
          ERROR: "error",
          PENDING: "pending",
        },
      },
      score: null,
      agent: { source: "[agentDetails.givenName,agentDetails.familyName]|@concat" },
      performed_at: { source: "completedAt" },
    },
    property_extractions: [
      { property_type: "sys:email", source_path: "identityOwner.email", required: false },
      { property_type: "sys:given_name", source_path: "identityOwner.givenName", required: false },
      { property_type: "sys:surname", source_path: "identityOwner.familyName", required: false },
      { property_type: "sys:date_of_birth", source_path: "identityOwner.dateOfBirth", required: false },
      { property_type: "sys:invitee_email", source_path: "inviteeDetails.email", required: false },
      { property_type: "sys:invitee_given_name", source_path: "inviteeDetails.givenName", required: false },
      { property_type: "sys:invitee_surname", source_path: "inviteeDetails.familyName", required: false },
      { property_type: "sys:invitee_date_of_birth", source_path: "inviteeDetails.dateOfBirth", required: false },
      { property_type: "sys:document_id", source_path: "results.proofingOutcomes.#(proofingType.code==\"IDENTITY_PROOFING\").documents.#.documentId", required: false },
      { property_type: "sys:document_type", source_path: "results.proofingOutcomes.#(proofingType.code==\"IDENTITY_PROOFING\").documents.#.documentType", required: false },
    ],
    media_extractions: [
      { source_path: "results.faceImage", content_types: ["image/*"], label: "Face Image" },
      { source_path: "results.proofingOutcomes.#.documents.#.images|@flatten|@flatten", content_types: ["image/*"], label: "Document Image" },
    ],
    payload_schema: idvPayloadSchema,
    render_schema: idvRenderSchema,
    status: "active",
    created_at: now,
    updated_at: now,
  },
  {
    id: "vtype_doc_fraud",
    key: "doc_fraud",
    name: "Document Fraud Check",
    description: "Document authenticity verification",
    ingestion_mode: "single",
    field_mappings: {
      source_verification_id: { source: "documentVerifyId" },
      external_id: { source: "externalRefId" },
      status: {
        source: "status",
        transform: "enum",
        enum_map: {
          DONE: "done",
        },
      },
      outcome: {
        source: "outcomes.#(type==\"DOCUMENT_FRAUD_CHECK\").status",
        transform: "enum",
        enum_map: {
          PASS: "pass",
          FAIL: "fail",
          WARNING: "warning",
          ERROR: "error",
          PENDING: "pending",
        },
      },
      score: {
        source: "outcomes.#(type==\"DOCUMENT_FRAUD_CHECK\").score",
        transform: "round_clamp",
      },
      agent: { source: "[agentDetails.givenName,agentDetails.familyName]|@concat" },
      performed_at: { source: "updatedAt" },
    },
    property_extractions: [
      { property_type: "sys:document_id", source_path: "document.documentId", required: false },
      { property_type: "sys:document_type", source_path: "document.documentType", required: false },
    ],
    media_extractions: [
      { source_path: "document.url", content_types: ["image/*", "application/pdf"], label: "Submitted Document Image" },
    ],
    payload_schema: docFraudPayloadSchema,
    render_schema: docFraudRenderSchema,
    status: "active",
    created_at: now,
    updated_at: now,
  },
  {
    id: "vtype_face_auth",
    key: "face_auth",
    name: "Face Authentication",
    description: "Facial recognition authentication challenge for login events. Evaluates similarity and liveness scores against configurable thresholds.",
    ingestion_mode: "single",
    field_mappings: {
      source_verification_id: { source: "eventId" },
      external_id: null,
      status: { value: "done" },
      outcome: {
        source: "eventType",
        transform: "enum",
        enum_map: {
          FACE_CHALLENGE_VERIFIED: "pass",
          FACE_CHALLENGE_DENIED: "fail",
          FRAUD: "fail",
        },
      },
      score: { source: "similarity", transform: "round_clamp" },
      agent: null,
      performed_at: { source: "timestamp" },
    },
    property_extractions: [
      { property_type: "sys:email", source_path: "username", required: true },
    ],
    media_extractions: [],
    payload_schema: faceAuthPayloadSchema,
    render_schema: faceAuthRenderSchema,
    status: "active",
    created_at: now,
    updated_at: now,
  },
  {
    id: "vtype_repeat_image",
    key: "repeat_image",
    name: "Repeat Image Check",
    description: "Checks whether a submitted image has been seen before by comparing against previously stored images and returning similarity scores.",
    ingestion_mode: "single",
    field_mappings: {
      source_verification_id: { source: "transactionId" },
      external_id: { source: "externalAttributes.externalRefId" },
      status: {
        source: "status",
        transform: "enum",
        enum_map: {
          COMPLETE: "done",
          DONE: "done",
        },
      },
      outcome: {
        source: "outcome.status",
        transform: "enum",
        enum_map: {
          PASS: "pass",
          FAIL: "fail",
          WARNING: "warning",
          ERROR: "error",
        },
      },
      score: {
        source: "outcome.similarity",
        transform: "round_clamp",
        scale: 100,
      },
      agent: { source: "[agentDetails.givenName,agentDetails.familyName]|@concat" },
      performed_at: { source: "updatedAt" },
    },
    property_extractions: [
      { property_type: "sys:document_id", source_path: "document.documentId", required: false },
      { property_type: "sys:document_type", source_path: "document.documentType", required: false },
    ],
    media_extractions: [
      { source_path: "document.image.url", content_types: ["image/*"], label: "Submitted Image" },
      { source_path: "matchedImages.#.document.image.url", content_types: ["image/*"], label: "Matched Image" },
      { source_path: "matchedImages.#.overlays.delta.url", content_types: ["image/*"], label: "Delta Overlay" },
      { source_path: "matchedImages.#.overlays.negative.url", content_types: ["image/*"], label: "Negative Overlay" },
    ],
    payload_schema: ricPayloadSchema,
    render_schema: ricRenderSchema,
    status: "active",
    created_at: now,
    updated_at: now,
  },
  {
    id: "vtype_repeat_text",
    key: "repeat_text",
    name: "Repeat Text Check",
    description: "Checks whether submitted text content has been seen before by comparing against previously stored documents and returning per-segment similarity scores.",
    ingestion_mode: "single",
    field_mappings: {
      source_verification_id: { source: "transactionId" },
      external_id: { source: "externalAttributes.externalRefId" },
      status: {
        source: "status",
        transform: "enum",
        enum_map: {
          COMPLETE: "done",
          DONE: "done",
        },
      },
      outcome: {
        source: "outcome.status",
        transform: "enum",
        enum_map: {
          PASS: "pass",
          FAIL: "fail",
          WARNING: "warning",
          ERROR: "error",
        },
      },
      score: {
        source: "outcome.similarity",
        transform: "round_clamp",
        scale: 100,
      },
      agent: { source: "[agentDetails.givenName,agentDetails.familyName]|@concat" },
      performed_at: { source: "updatedAt" },
    },
    property_extractions: [
      { property_type: "sys:document_id", source_path: "document.documentId", required: false },
      { property_type: "sys:document_type", source_path: "document.documentType", required: false },
    ],
    media_extractions: [
      { source_path: "document.image.url", content_types: ["image/*"], label: "Submitted Image" },
      { source_path: "matchedDocuments.#.document.image.url", content_types: ["image/*"], label: "Matched Document Image" },
      { source_path: "matchedDocuments.#.overlays.delta.url", content_types: ["image/*"], label: "Delta Overlay" },
      { source_path: "matchedDocuments.#.overlays.negative.url", content_types: ["image/*"], label: "Negative Overlay" },
    ],
    payload_schema: rtcPayloadSchema,
    render_schema: rtcRenderSchema,
    status: "active",
    created_at: now,
    updated_at: now,
  },
]);

print("✓ Inserted 5 verification types");

// ============================================================================
// Summary
// ============================================================================

print("\n=== Seed complete ===");
print("  property_types: " + db.property_types.countDocuments());
print("  verification_types: " + db.verification_types.countDocuments());

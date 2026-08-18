const express = require("express");
const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { generateApiKey } = require("./apiKeys");
const { getUsage } = require("./usage");
const { calculateBill } = require("./billing");

// Mirrors functions/index.js's requireAuth (Firebase ID token via Authorization: Bearer),
// duplicated rather than imported/exported from index.js — index.js's module.exports
// namespace is scanned by `firebase deploy --only functions` for deployable Cloud Functions,
// so mixing a plain helper export into that same namespace isn't worth the risk for an
// 8-line, extremely stable check. This is the internal-Webilo-user counterpart to
// auth.js's requireApiKey: creating/revoking projects and keys is something a signed-in
// Webilo user does, not something an existing API key can do to itself — deliberately a
// different auth scheme from every /v1 route, same reasoning as auth.js's own x-api-key note.
async function requireFirebaseAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentication required." });
  try {
    req.user = await admin.auth().verifyIdToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid authentication token." });
  }
}

const MAX_NAME_LENGTH = 80;
// Abuse guard, not a plan/billing limit — same spirit as Locus Plane's own
// MAX_ACTIVE_KEYS_PER_USER, a sane ceiling rather than an unbounded collection.
const MAX_ACTIVE_KEYS_PER_PROJECT = 10;

function cleanName(value) {
  const name = typeof value === "string" ? value.trim() : "";
  return name.slice(0, MAX_NAME_LENGTH);
}

function toIso(timestamp) {
  return timestamp?.toDate ? timestamp.toDate().toISOString() : null;
}

function serializeProject(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    businessId: data.businessId || null,
    status: data.status,
    createdAt: toIso(data.createdAt),
  };
}

// Never returns keyHash or the raw key — only the display prefix, matching how
// scripts/provisionDeveloperProject.js already treats the raw key as shown-once.
function serializeApiKey(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    keyPrefix: data.keyPrefix,
    environment: data.environment,
    status: data.status,
    createdAt: toIso(data.createdAt),
    lastUsedAt: toIso(data.lastUsedAt),
    revokedAt: toIso(data.revokedAt),
  };
}

async function ownedProject(db, uid, projectId) {
  const snapshot = await db.collection("projects").doc(projectId).get();
  if (!snapshot.exists || snapshot.data().ownerUid !== uid) {
    const error = new Error("Project not found.");
    error.statusCode = 404;
    throw error;
  }
  return snapshot;
}

const router = express.Router();
router.use(requireFirebaseAuth);

// GET /developer/projects — every project this user owns.
router.get("/projects", async (req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection("projects").where("ownerUid", "==", req.user.uid).get();
    return res.json({ data: snapshot.docs.map(serializeProject) });
  } catch (error) {
    console.error("GET /developer/projects failed", error);
    return res.status(500).json({ error: "Could not list projects." });
  }
});

// POST /developer/projects — { name, businessId? }. businessId is optional and, if given,
// must be a business this same user already owns (reuses the same ownership check
// functions/index.js's ownedBusiness() does, inlined here rather than imported for the same
// module-boundary reason requireFirebaseAuth is duplicated above).
router.post("/projects", async (req, res) => {
  try {
    const name = cleanName(req.body?.name);
    if (!name) {
      return res.status(400).json({ error: "A project name is required.", code: "MISSING_NAME" });
    }
    const db = getFirestore();
    let businessId = null;
    if (req.body?.businessId) {
      const businessSnapshot = await db.collection("businesses").doc(String(req.body.businessId)).get();
      if (!businessSnapshot.exists || businessSnapshot.data().ownerId !== req.user.uid) {
        return res.status(404).json({ error: "Business not found.", code: "BUSINESS_NOT_FOUND" });
      }
      businessId = businessSnapshot.id;
    }

    const now = FieldValue.serverTimestamp();
    const projectRef = db.collection("projects").doc();
    await projectRef.set({ ownerUid: req.user.uid, businessId, name, status: "active", createdAt: now, updatedAt: now });
    const created = await projectRef.get();
    return res.status(201).json(serializeProject(created));
  } catch (error) {
    console.error("POST /developer/projects failed", error);
    return res.status(500).json({ error: "Could not create this project." });
  }
});

// GET /developer/projects/:projectId/usage?period=YYYY-MM — the dashboard's counterpart to
// GET /v1/usage, which is API-key gated and unusable for a signed-in user browsing their own
// project (no key in hand yet, or doesn't want to expose one to their own browser). Reuses
// usage.js's getUsage() directly — same data, different auth scheme.
router.get("/projects/:projectId/usage", async (req, res) => {
  try {
    const db = getFirestore();
    await ownedProject(db, req.user.uid, req.params.projectId);
    const requestedPeriod = req.query.period;
    if (requestedPeriod && !/^\d{4}-\d{2}$/.test(String(requestedPeriod))) {
      return res.status(400).json({ error: "`period` must be in YYYY-MM format.", code: "INVALID_PERIOD" });
    }
    const usage = await getUsage(req.params.projectId, requestedPeriod);
    return res.json(usage);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error("GET /developer/projects/:projectId/usage failed", error);
    return res.status(500).json({ error: "Could not look up usage." });
  }
});

// GET /developer/projects/:projectId/billing?period=YYYY-MM — what this project would owe
// for the period, computed from the same usage getUsage() already reads. Estimate only:
// nothing here charges anyone (see billing.js's header comment for why the actual charge is
// a deliberately separate, unbuilt piece).
router.get("/projects/:projectId/billing", async (req, res) => {
  try {
    const db = getFirestore();
    await ownedProject(db, req.user.uid, req.params.projectId);
    const requestedPeriod = req.query.period;
    if (requestedPeriod && !/^\d{4}-\d{2}$/.test(String(requestedPeriod))) {
      return res.status(400).json({ error: "`period` must be in YYYY-MM format.", code: "INVALID_PERIOD" });
    }
    const usage = await getUsage(req.params.projectId, requestedPeriod);
    const bill = calculateBill(usage);
    return res.json({ period: usage.period, ...bill });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error("GET /developer/projects/:projectId/billing failed", error);
    return res.status(500).json({ error: "Could not calculate billing." });
  }
});

// GET /developer/projects/:projectId/api-keys
router.get("/projects/:projectId/api-keys", async (req, res) => {
  try {
    const db = getFirestore();
    await ownedProject(db, req.user.uid, req.params.projectId);
    const snapshot = await db.collection("apiKeys").where("projectId", "==", req.params.projectId).get();
    return res.json({ data: snapshot.docs.map(serializeApiKey) });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error("GET /developer/projects/:projectId/api-keys failed", error);
    return res.status(500).json({ error: "Could not list API keys." });
  }
});

// POST /developer/projects/:projectId/api-keys — { name?, environment } -> the new key, its
// raw value included exactly this once (`key`). Matches Locus Plane's own apiKeys.js: no
// "view key again" path by design.
router.post("/projects/:projectId/api-keys", async (req, res) => {
  try {
    const db = getFirestore();
    const projectSnapshot = await ownedProject(db, req.user.uid, req.params.projectId);
    const environment = req.body?.environment === "live" ? "live" : "test";

    // A single equality-filter query (no orderBy), so no composite index needed — the active
    // count is computed in application code rather than adding a second .where() clause whose
    // index requirements aren't as certain to verify from here.
    const keysSnapshot = await db.collection("apiKeys").where("projectId", "==", req.params.projectId).get();
    const activeCount = keysSnapshot.docs.filter((doc) => doc.data().status === "active").length;
    if (activeCount >= MAX_ACTIVE_KEYS_PER_PROJECT) {
      return res.status(400).json({
        error: "This project already has the maximum number of active keys.",
        code: "TOO_MANY_ACTIVE_KEYS",
      });
    }

    const name = cleanName(req.body?.name) || `${projectSnapshot.data().name} (${environment})`;
    const { rawKey, keyHash, keyPrefix } = generateApiKey(environment);
    const keyRef = db.collection("apiKeys").doc(keyHash);
    await keyRef.set({
      projectId: req.params.projectId,
      keyPrefix,
      name,
      environment,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      lastUsedAt: null,
    });
    const created = await keyRef.get();
    return res.status(201).json({ ...serializeApiKey(created), key: rawKey });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error("POST /developer/projects/:projectId/api-keys failed", error);
    return res.status(500).json({ error: "Could not create an API key." });
  }
});

// DELETE /developer/projects/:projectId/api-keys/:keyId — revokes, doesn't erase (matches
// scripts/revokeApiKey.js) — an in-flight request using this key gets a clean, auditable
// "Invalid API key" from requireApiKey.js rather than the key silently vanishing, and history
// stays visible.
router.delete("/projects/:projectId/api-keys/:keyId", async (req, res) => {
  try {
    const db = getFirestore();
    await ownedProject(db, req.user.uid, req.params.projectId);
    const keyRef = db.collection("apiKeys").doc(req.params.keyId);
    const keySnapshot = await keyRef.get();
    if (!keySnapshot.exists || keySnapshot.data().projectId !== req.params.projectId) {
      return res.status(404).json({ error: "API key not found." });
    }
    await keyRef.set({ status: "revoked", revokedAt: FieldValue.serverTimestamp() }, { merge: true });
    const updated = await keyRef.get();
    return res.json(serializeApiKey(updated));
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error("DELETE /developer/projects/:projectId/api-keys/:keyId failed", error);
    return res.status(500).json({ error: "Could not revoke this API key." });
  }
});

module.exports = router;

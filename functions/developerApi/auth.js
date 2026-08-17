const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { hashApiKey } = require("./apiKeys");

// Router-wide middleware for everything under /v1 — the developer API is
// authenticated by API key only and never depends on Firebase user auth
// (see functions/index.js's `requireAuth`, which is for the internal app).
async function requireApiKey(req, res, next) {
  const header = req.headers.authorization || "";
  const rawKey = header.replace(/^Bearer\s+/i, "").trim();
  if (!rawKey) {
    return res.status(401).json({ error: "An API key is required.", code: "API_KEY_MISSING" });
  }

  try {
    const db = getFirestore();
    const keyRef = db.collection("apiKeys").doc(hashApiKey(rawKey));
    const keySnapshot = await keyRef.get();
    if (!keySnapshot.exists || keySnapshot.data().status !== "active") {
      return res.status(401).json({ error: "Invalid API key.", code: "API_KEY_INVALID" });
    }
    const keyData = keySnapshot.data();

    const projectSnapshot = await db.collection("projects").doc(keyData.projectId).get();
    if (!projectSnapshot.exists || projectSnapshot.data().status !== "active") {
      return res.status(401).json({ error: "This project is not active.", code: "PROJECT_INACTIVE" });
    }
    const projectData = projectSnapshot.data();

    req.developerProject = {
      projectId: projectSnapshot.id,
      ownerUid: projectData.ownerUid,
      businessId: projectData.businessId || null,
    };

    keyRef.update({ lastUsedAt: Timestamp.now() }).catch((error) => {
      console.error("Failed to update API key lastUsedAt", { keyPrefix: keyData.keyPrefix, message: error.message });
    });

    return next();
  } catch (error) {
    console.error("API key authentication failed", error);
    return res.status(500).json({ error: "Could not authenticate this request." });
  }
}

module.exports = { requireApiKey };

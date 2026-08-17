const express = require("express");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { RESEND_WEBHOOK_SECRET } = require("../env");
const { verifySvixSignature } = require("./svix");

// Resend's delivery-status events, mapped to the status vocabulary messages.js already
// writes (queued/accepted/sent/delivered/failed/bounced). Event types this map doesn't
// recognize (opened, clicked, complained, delivery_delayed, ...) are acknowledged with 200
// but otherwise ignored — not part of the status vocabulary this API tracks.
const STATUS_BY_RESEND_EVENT = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.bounced": "bounced",
};

const router = express.Router();

// Mounted at /webhooks on the existing exports.api app (see functions/index.js) —
// deliberately outside /v1, since this is inbound from Resend's servers, not an
// API-key-authenticated developer request. Requires req.commerceRawBody (populated by the
// express.json() verify hook already wired app-wide in functions/index.js) because Svix's
// HMAC is computed over the exact raw bytes, not the re-serialized JSON body.
router.post("/resend", async (req, res) => {
  const verified = verifySvixSignature({
    secret: RESEND_WEBHOOK_SECRET.value(),
    svixId: req.headers["svix-id"],
    svixTimestamp: req.headers["svix-timestamp"],
    svixSignature: req.headers["svix-signature"],
    rawBody: req.commerceRawBody,
  });
  if (!verified) {
    return res.status(401).json({ error: "Invalid webhook signature." });
  }

  const event = req.body || {};
  const status = STATUS_BY_RESEND_EVENT[event.type];
  const emailId = event.data?.email_id;
  if (!status || !emailId) {
    return res.sendStatus(200);
  }

  try {
    const db = getFirestore();
    // Messages are nested per-project (projects/{projectId}/messages/{id}); the webhook only
    // gives us Resend's own email id, so a collection-group query is the only way to find the
    // matching doc without knowing which project sent it. Requires the COLLECTION_GROUP index
    // on providerMessageId declared in firestore.indexes.json.
    const snapshot = await db
      .collectionGroup("messages")
      .where("providerMessageId", "==", emailId)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({ status, completedAt: Timestamp.now() });
    }
    return res.sendStatus(200);
  } catch (error) {
    console.error("Resend webhook processing failed", error);
    return res.status(500).send("Webhook processing failed");
  }
});

module.exports = router;

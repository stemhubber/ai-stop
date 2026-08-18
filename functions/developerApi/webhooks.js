const express = require("express");
const twilio = require("twilio");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { RESEND_WEBHOOK_SECRET, TWILIO_TOKEN } = require("../env");
const { verifySvixSignature } = require("./svix");

// Same hardcoded-URL convention CLAUDE.md documents for src/services/apiConfig.js's deployed
// API base — update this if the API is ever redeployed under a different project/region,
// rather than inventing a new env-specific URL mechanism for just this one route.
const DEPLOYED_API_BASE_URL = "https://us-central1-smart-shop-bb140.cloudfunctions.net/api";

function twilioStatusCallbackUrl() {
  return `${DEPLOYED_API_BASE_URL}/webhooks/twilio-status`;
}

// Resend's delivery-status events, mapped to the status vocabulary messages.js already
// writes (queued/accepted/sent/delivered/failed/bounced). Event types this map doesn't
// recognize (opened, clicked, complained, delivery_delayed, ...) are acknowledged with 200
// but otherwise ignored — not part of the status vocabulary this API tracks.
const STATUS_BY_RESEND_EVENT = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.bounced": "bounced",
};

// Twilio's message statuses collapsed onto the same vocabulary. "queued"/"sending"/"receiving"
// aren't forwarded — a message is already recorded as "accepted" at send time (messages.js),
// so an intermediate in-flight status wouldn't tell the caller anything new.
const STATUS_BY_TWILIO_STATUS = {
  sent: "sent",
  delivered: "delivered",
  failed: "failed",
  undelivered: "failed",
};

// Messages are nested per-project (projects/{projectId}/messages/{id}); a provider webhook
// only ever gives us the provider's own message id, so a collection-group query is the only
// way to find the matching doc without knowing which project sent it. Requires the
// COLLECTION_GROUP index on providerMessageId declared in firestore.indexes.json.
async function updateMessageStatusByProviderMessageId(providerMessageId, status) {
  const db = getFirestore();
  const snapshot = await db
    .collectionGroup("messages")
    .where("providerMessageId", "==", providerMessageId)
    .limit(1)
    .get();
  if (!snapshot.empty) {
    await snapshot.docs[0].ref.update({ status, completedAt: Timestamp.now() });
  }
}

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
    await updateMessageStatusByProviderMessageId(emailId, status);
    return res.sendStatus(200);
  } catch (error) {
    console.error("Resend webhook processing failed", error);
    return res.status(500).send("Webhook processing failed");
  }
});

// Twilio has no single webhook config — a statusCallback URL is passed per-send instead
// (twilioSender.js's sendSMS/sendWhatsApp, wired from /v1/sms). Twilio POSTs
// application/x-www-form-urlencoded, which the app-wide express.json() middleware doesn't
// parse (it skips non-matching content types), so this route parses its own body rather than
// changing global body-parsing behavior for every other route. Signature verification uses
// the twilio package's own validateRequest — already a dependency, no need to reimplement
// Twilio's HMAC-SHA1 scheme by hand the way svix.js does for Resend.
router.post("/twilio-status", express.urlencoded({ extended: false }), async (req, res) => {
  const verified = twilio.validateRequest(
    TWILIO_TOKEN.value(),
    req.headers["x-twilio-signature"],
    twilioStatusCallbackUrl(),
    req.body
  );
  if (!verified) {
    return res.status(401).send("Invalid signature");
  }

  const status = STATUS_BY_TWILIO_STATUS[String(req.body.MessageStatus || "").toLowerCase()];
  const messageSid = req.body.MessageSid;
  if (!status || !messageSid) {
    return res.sendStatus(200);
  }

  try {
    await updateMessageStatusByProviderMessageId(messageSid, status);
    return res.sendStatus(200);
  } catch (error) {
    console.error("Twilio status callback processing failed", error);
    return res.status(500).send("Webhook processing failed");
  }
});

module.exports = router;
module.exports.twilioStatusCallbackUrl = twilioStatusCallbackUrl;

const express = require("express");
const { requireApiKey } = require("./auth");
const { recordMessage } = require("./messages");
const { respondToProviderError } = require("./providerErrors");
const { getMessagingProvider } = require("../providers/messaging");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mounted at /v1 on the existing `exports.api` Express app (see functions/index.js).
// Every /v1 route is API-key authenticated and terminates at the same
// getMessagingProvider() Webilo's own /messages/send route already uses —
// no second Resend/Twilio implementation.
const router = express.Router();
router.use(requireApiKey);

router.post("/email", async (req, res) => {
  try {
    const { to, subject, text, html } = req.body || {};
    const recipient = String(to || "").trim().toLowerCase();
    if (!EMAIL_PATTERN.test(recipient)) {
      return res.status(400).json({ error: "Enter a valid recipient email address.", code: "INVALID_RECIPIENT" });
    }
    if (!String(text || "").trim() && !String(html || "").trim()) {
      return res.status(400).json({ error: "Provide `text` or `html` content.", code: "MISSING_CONTENT" });
    }

    const provider = getMessagingProvider();
    const result = await provider.sendEmail({ to: recipient, subject, body: text, html });

    const id = await recordMessage({
      projectId: req.developerProject.projectId,
      type: "email",
      destination: recipient,
      provider: "resend",
      status: "accepted",
      idempotencyKey: req.headers["idempotency-key"] || null,
      providerMessageId: result?.id || null,
    });

    return res.status(202).json({ id, status: "accepted" });
  } catch (err) {
    return respondToProviderError(res, "email", err);
  }
});

router.post("/sms", async (req, res) => {
  try {
    const { to, text } = req.body || {};
    if (!String(text || "").trim()) {
      return res.status(400).json({ error: "Provide `text` content.", code: "MISSING_CONTENT" });
    }

    const provider = getMessagingProvider();
    let result;
    try {
      result = await provider.sendSms({ to, body: text });
    } catch (err) {
      // e164() in twilioSender.js throws a plain Error (no .code) for a malformed
      // recipient; anything with a .code is a real provider/config failure.
      if (!err.code) {
        return res.status(400).json({ error: err.message, code: "INVALID_RECIPIENT" });
      }
      throw err;
    }

    const id = await recordMessage({
      projectId: req.developerProject.projectId,
      type: "sms",
      destination: to,
      provider: "twilio",
      status: "accepted",
      idempotencyKey: req.headers["idempotency-key"] || null,
      providerMessageId: result?.sid || null,
    });

    return res.status(202).json({ id, status: "accepted" });
  } catch (err) {
    return respondToProviderError(res, "sms", err);
  }
});

module.exports = router;

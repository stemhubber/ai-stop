const express = require("express");
const { requireApiKey } = require("./auth");
const { recordMessage } = require("./messages");
const { respondToProviderError } = require("./providerErrors");
const { withIdempotency } = require("./idempotency");
const { requireRateLimit } = require("./rateLimit");
const { recordUsage } = require("./usage");
const { getMessagingProvider } = require("../providers/messaging");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mounted at /v1 on the existing `exports.api` Express app (see functions/index.js).
// Every /v1 route is API-key authenticated and terminates at the same
// getMessagingProvider() Webilo's own /messages/send route already uses —
// no second Resend/Twilio implementation.
const router = express.Router();
router.use(requireApiKey);
router.use(requireRateLimit);

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

    const idempotencyKey = req.headers["idempotency-key"] || null;
    const { replayed, response } = await withIdempotency({
      projectId: req.developerProject.projectId,
      idempotencyKey,
      handler: async () => {
        const provider = getMessagingProvider();
        const result = await provider.sendEmail({ to: recipient, subject, body: text, html });
        const id = await recordMessage({
          projectId: req.developerProject.projectId,
          type: "email",
          destination: recipient,
          provider: "resend",
          status: "accepted",
          idempotencyKey,
          providerMessageId: result?.id || null,
        });
        await recordUsage(req.developerProject.projectId, "emails");
        return { id, status: "accepted" };
      },
    });

    return res.status(replayed ? 200 : 202).json(response);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    return respondToProviderError(res, "email", err);
  }
});

router.post("/sms", async (req, res) => {
  try {
    const { to, text } = req.body || {};
    if (!String(text || "").trim()) {
      return res.status(400).json({ error: "Provide `text` content.", code: "MISSING_CONTENT" });
    }

    const idempotencyKey = req.headers["idempotency-key"] || null;
    const { replayed, response } = await withIdempotency({
      projectId: req.developerProject.projectId,
      idempotencyKey,
      handler: async () => {
        const provider = getMessagingProvider();
        let result;
        try {
          result = await provider.sendSms({ to, body: text });
        } catch (err) {
          // e164() in twilioSender.js throws a plain Error (no .code) for a malformed
          // recipient; anything with a .code is a real provider/config failure.
          if (!err.code) {
            const validationError = new Error(err.message);
            validationError.code = "INVALID_RECIPIENT";
            validationError.statusCode = 400;
            throw validationError;
          }
          throw err;
        }

        const id = await recordMessage({
          projectId: req.developerProject.projectId,
          type: "sms",
          destination: to,
          provider: "twilio",
          status: "accepted",
          idempotencyKey,
          providerMessageId: result?.sid || null,
        });
        await recordUsage(req.developerProject.projectId, "sms");
        return { id, status: "accepted" };
      },
    });

    return res.status(replayed ? 200 : 202).json(response);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    return respondToProviderError(res, "sms", err);
  }
});

module.exports = router;

const express = require("express");
const { requireApiKey } = require("./auth");
const { recordMessage, getMessage, listMessages } = require("./messages");
const { respondToProviderError } = require("./providerErrors");
const { withIdempotency } = require("./idempotency");
const { requireRateLimit } = require("./rateLimit");
const { recordUsage, getUsage } = require("./usage");
const { getMessagingProvider } = require("../providers/messaging");
const { twilioStatusCallbackUrl } = require("./webhooks");

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

// Shared by /sms and /whatsapp — identical shape once you account for which provider method
// to call and what to label the message/usage record as. Factored out here (rather than in
// email's handler too) specifically because both Twilio channels go through the same
// e164()-validation-error/statusCallback/recordMessage/recordUsage sequence; email's is
// different enough (its own recipient pattern, no statusCallback) that sharing it would cost
// more in indirection than it'd save.
function createTwilioSendHandler({ channel, providerMethod }) {
  return async (req, res) => {
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
            result = await provider[providerMethod]({ to, body: text, statusCallback: twilioStatusCallbackUrl() });
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
            type: channel,
            destination: to,
            provider: "twilio",
            status: "accepted",
            idempotencyKey,
            providerMessageId: result?.sid || null,
          });
          await recordUsage(req.developerProject.projectId, channel);
          return { id, status: "accepted" };
        },
      });

      return res.status(replayed ? 200 : 202).json(response);
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message, code: err.code });
      }
      return respondToProviderError(res, channel, err);
    }
  };
}

router.post("/sms", createTwilioSendHandler({ channel: "sms", providerMethod: "sendSms" }));
router.post("/whatsapp", createTwilioSendHandler({ channel: "whatsapp", providerMethod: "sendWhatsApp" }));

router.get("/usage", async (req, res) => {
  try {
    const requestedPeriod = req.query.period;
    if (requestedPeriod && !/^\d{4}-\d{2}$/.test(String(requestedPeriod))) {
      return res.status(400).json({ error: "`period` must be in YYYY-MM format.", code: "INVALID_PERIOD" });
    }
    const usage = await getUsage(req.developerProject.projectId, requestedPeriod);
    return res.json(usage);
  } catch (err) {
    console.error("GET /v1/usage failed", err);
    return res.status(500).json({ error: "Could not look up usage." });
  }
});

router.get("/messages", async (req, res) => {
  try {
    const result = await listMessages({
      projectId: req.developerProject.projectId,
      limit: req.query.limit,
      cursorId: req.query.cursor,
    });
    return res.json(result);
  } catch (err) {
    console.error("GET /v1/messages failed", err);
    return res.status(500).json({ error: "Could not list messages." });
  }
});

router.get("/messages/:id", async (req, res) => {
  try {
    const message = await getMessage(req.developerProject.projectId, req.params.id);
    if (!message) {
      return res.status(404).json({ error: "Message not found.", code: "MESSAGE_NOT_FOUND" });
    }
    return res.json(message);
  } catch (err) {
    console.error("GET /v1/messages/:id failed", err);
    return res.status(500).json({ error: "Could not look up this message." });
  }
});

module.exports = router;

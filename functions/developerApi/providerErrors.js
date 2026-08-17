// Maps errors surfaced by the messaging provider layer (functions/providers/messaging)
// to a public-facing status/message for /v1/*. Kept separate from the equivalent map
// in functions/index.js's /messages/send — the two surfaces are free to word errors
// differently without one being a copy that has to stay in sync with the other.
const ERROR_RESPONSES = {
  TWILIO_INVALID_SID: [503, "SMS is not configured correctly."],
  TWILIO_MISSING_TOKEN: [503, "SMS is not configured correctly."],
  TWILIO_INVALID_API_KEY: [503, "SMS is not configured correctly."],
  21608: [403, "This Twilio trial account can only message verified recipient numbers."],
  21610: [400, "This recipient has opted out of SMS messages."],
  21614: [400, "The recipient number cannot receive SMS messages."],
  RESEND_MISSING_KEY: [503, "Email is not configured yet."],
  RESEND_MISSING_FROM: [503, "Email is not configured yet."],
  RESEND_INVALID_KEY: [503, "The email provider rejected the configured API key."],
  RESEND_SENDER_REJECTED: [503, "The email provider rejected the sender."],
  RESEND_INVALID_EMAIL: [400, "Enter a valid recipient and sender email address."],
  RESEND_RATE_LIMIT: [429, "The email provider is busy. Wait briefly and try again."],
};

function respondToProviderError(res, channel, err) {
  console.error(`/v1/${channel} send failed`, { code: err.code || null, message: err.message });
  const fallback = channel === "email"
    ? [500, "The email provider could not send this message. Try again shortly."]
    : [500, "The SMS provider could not send this message. Try again shortly."];
  const [status, message] = ERROR_RESPONSES[err.code] || fallback;
  return res.status(status).json({ error: message, code: err.code ? String(err.code) : "MESSAGE_SEND_FAILED" });
}

module.exports = { respondToProviderError };

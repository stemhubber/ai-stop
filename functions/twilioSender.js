const twilio = require("twilio");
const { TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM, TWILIO_WHATSAPP_FROM } = require("./env");

function createTwilioClient() {
  const accountSid = TWILIO_SID.value();
  const authToken = TWILIO_TOKEN.value();
  if (!/^AC[0-9a-f]{32}$/i.test(accountSid || "") || !authToken) {
    throw new Error("Twilio credentials are not configured.");
  }
  return twilio(accountSid, authToken);
}

function e164(value, label) {
  const normalized = String(value || "").trim().replace(/^whatsapp:/i, "");
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error(`${label} must be a valid E.164 phone number.`);
  }
  return normalized;
}

async function sendSMS(to, message) {
  const body = String(message || "").trim();
  if (!body || body.length > 1600) {
    throw new Error("Enter an SMS message under 1600 characters.");
  }
  const client = createTwilioClient();
  return client.messages.create({
    to: e164(to, "SMS recipient"),
    from: e164(TWILIO_FROM.value(), "Twilio SMS sender"),
    body,
  });
}

async function sendWhatsApp(to, message) {
  const body = String(message || "").trim();
  if (!body || body.length > 4096) {
    throw new Error("Enter a WhatsApp message under 4096 characters.");
  }
  const client = createTwilioClient();
  return client.messages.create({
    to: `whatsapp:${e164(to, "WhatsApp recipient")}`,
    from: `whatsapp:${e164(TWILIO_WHATSAPP_FROM.value(), "Twilio WhatsApp sender")}`,
    body,
  });
}

module.exports = { sendSMS, sendWhatsApp };

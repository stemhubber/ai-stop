const twilio = require("twilio");
const {
  TWILIO_SID,
  TWILIO_TOKEN,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_FROM,
  TWILIO_WHATSAPP_FROM,
} = require("./env");

function resolveTwilioCredentials({ accountSid, authToken, apiKey, apiSecret }) {
  if (!/^AC[0-9a-f]{32}$/i.test(accountSid)) {
    const error = new Error("The Twilio Account SID is invalid. Update the TWILIO_SID Firebase secret.");
    error.code = "TWILIO_INVALID_SID";
    throw error;
  }
  if (apiKey || apiSecret) {
    if (!/^SK[0-9a-f]{32}$/i.test(apiKey) || !apiSecret) {
      const error = new Error("The Twilio API key credentials are incomplete.");
      error.code = "TWILIO_INVALID_API_KEY";
      throw error;
    }
    return { mode: "apiKey", accountSid, username: apiKey, password: apiSecret };
  }
  if (!authToken) {
    const error = new Error("The Twilio Auth Token is missing. Update the TWILIO_TOKEN Firebase secret.");
    error.code = "TWILIO_MISSING_TOKEN";
    throw error;
  }
  return { mode: "authToken", accountSid, username: accountSid, password: authToken };
}

function createTwilioClient() {
  const credentials = resolveTwilioCredentials({
    accountSid: String(TWILIO_SID.value() || "").trim(),
    authToken: String(TWILIO_TOKEN.value() || "").trim(),
    apiKey: String(TWILIO_API_KEY.value() || "").trim(),
    apiSecret: String(TWILIO_API_SECRET.value() || "").trim(),
  });
  return credentials.mode === "apiKey"
    ? twilio(credentials.username, credentials.password, { accountSid: credentials.accountSid })
    : twilio(credentials.username, credentials.password);
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

module.exports = { resolveTwilioCredentials, sendSMS, sendWhatsApp };

const axios = require("axios");
const { EMAIL_FROM, RESEND_API_KEY } = require("../../env");

function configuredValue(secret, code, message) {
  const value = String(secret.value() || "").trim();
  if (!value) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }
  return value;
}

function buildEmailPayload({ from, to, subject, body, html, replyTo }) {
  return {
    from,
    to: [to],
    subject: subject || "Message from Webilo",
    text: body,
    ...(html ? { html } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
  };
}

async function sendEmail({ to, subject, body, html, replyTo }) {
  const apiKey = configuredValue(
    RESEND_API_KEY,
    "RESEND_MISSING_KEY",
    "Resend is not configured. Add the RESEND_API_KEY Firebase secret."
  );
  const from = configuredValue(
    EMAIL_FROM,
    "RESEND_MISSING_FROM",
    "Email sending is not configured. Add the EMAIL_FROM Firebase secret."
  );

  try {
    const response = await axios.post(
      "https://api.resend.com/emails",
      buildEmailPayload({
        from,
        to,
        subject,
        body,
        html,
        replyTo,
      }),
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "Webilo/1.0",
        },
        timeout: 30000,
      }
    );
    return response.data;
  } catch (error) {
    const providerMessage = error.response?.data?.message;
    const wrapped = new Error(providerMessage || "Resend could not send this email.");
    wrapped.status = error.response?.status;
    wrapped.code = {
      401: "RESEND_INVALID_KEY",
      403: "RESEND_SENDER_REJECTED",
      422: "RESEND_INVALID_EMAIL",
      429: "RESEND_RATE_LIMIT",
    }[wrapped.status] || "RESEND_SEND_FAILED";
    throw wrapped;
  }
}

module.exports = { buildEmailPayload, sendEmail };

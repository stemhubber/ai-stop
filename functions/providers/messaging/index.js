const axios = require("axios");
const { sendSMS, sendWhatsApp } = require("../../twilioSender");
const { SENDGRID_API_KEY, EMAIL_FROM } = require("../../env");

const providers = {
  twilio: {
    sendSms: ({ to, body }) => sendSMS(to, body),
    sendWhatsApp: ({ to, body }) => sendWhatsApp(to, body),
    sendEmail: ({ to, subject, body }) => axios.post(
      "https://api.sendgrid.com/v3/mail/send",
      {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: EMAIL_FROM.value() },
        subject: subject || "Message from Webilo",
        content: [{ type: "text/plain", value: body }],
      },
      { headers: { Authorization: `Bearer ${SENDGRID_API_KEY.value()}` } }
    ),
  },
};

function getMessagingProvider(name = process.env.MESSAGING_PROVIDER || "twilio") {
  const provider = providers[name];
  if (!provider) throw new Error(`Unsupported messaging provider: ${name}`);
  return provider;
}

module.exports = { getMessagingProvider };

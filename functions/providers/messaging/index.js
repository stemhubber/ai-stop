const { sendSMS, sendWhatsApp } = require("../../twilioSender");
const resend = require("./resend");

const providers = {
  twilio: {
    sendSms: ({ to, body, statusCallback }) => sendSMS(to, body, { statusCallback }),
    sendWhatsApp: ({ to, body, statusCallback }) => sendWhatsApp(to, body, { statusCallback }),
    sendEmail: resend.sendEmail,
  },
};

function getMessagingProvider(name = process.env.MESSAGING_PROVIDER || "twilio") {
  const provider = providers[name];
  if (!provider) throw new Error(`Unsupported messaging provider: ${name}`);
  return provider;
}

module.exports = { getMessagingProvider };

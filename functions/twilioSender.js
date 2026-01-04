const twilio = require("twilio");
const { TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM } = require("./env");

function createTwilioClient() {
  return twilio(
    TWILIO_SID.value(),  // now accessed at runtime
    TWILIO_TOKEN.value()
  );
}

async function sendSMS(to, message) {
  const client = createTwilioClient();
  return client.messages.create({
    to,
    from: TWILIO_FROM.value(),
    body: message,
  });
}

module.exports = { sendSMS };

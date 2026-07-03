const { defineSecret } = require("firebase-functions/params");

exports.TWILIO_SID = defineSecret("TWILIO_SID");
exports.TWILIO_TOKEN = defineSecret("TWILIO_TOKEN");
exports.TWILIO_FROM = defineSecret("TWILIO_FROM");
exports.TWILIO_WHATSAPP_FROM = defineSecret("TWILIO_WHATSAPP_FROM");
exports.SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");
exports.EMAIL_FROM = defineSecret("EMAIL_FROM");


// Paystack
exports.PAYSTACK_SECRET = defineSecret("PAYSTACK_SECRET");
exports.OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

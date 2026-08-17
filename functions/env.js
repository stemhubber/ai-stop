const { defineSecret } = require("firebase-functions/params");

exports.TWILIO_SID = defineSecret("TWILIO_SID");
exports.TWILIO_TOKEN = defineSecret("TWILIO_TOKEN");
exports.TWILIO_API_KEY = defineSecret("TWILIO_API_KEY");
exports.TWILIO_API_SECRET = defineSecret("TWILIO_API_SECRET");
exports.TWILIO_FROM = defineSecret("TWILIO_FROM");
exports.TWILIO_WHATSAPP_FROM = defineSecret("TWILIO_WHATSAPP_FROM");
exports.RESEND_API_KEY = defineSecret("RESEND_API_KEY");
exports.EMAIL_FROM = defineSecret("EMAIL_FROM");
exports.RESEND_WEBHOOK_SECRET = defineSecret("RESEND_WEBHOOK_SECRET");


// Paystack
exports.PAYSTACK_SECRET = defineSecret("PAYSTACK_SECRET");
exports.OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

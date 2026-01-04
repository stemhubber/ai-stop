const { defineSecret } = require("firebase-functions/params");

exports.TWILIO_SID = defineSecret("TWILIO_SID");
exports.TWILIO_TOKEN = defineSecret("TWILIO_TOKEN");
exports.TWILIO_FROM = defineSecret("TWILIO_FROM");


// Paystack
exports.PAYSTACK_SECRET = defineSecret("PAYSTACK_SECRET");
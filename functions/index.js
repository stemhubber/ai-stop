const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM, PAYSTACK_SECRET } = require("./env");
const { sendSMS } = require("./twilioSender");

admin.initializeApp();
const db = getFirestore();

async function sendMessage(to, message) {
  console.log(`Sending message to ${formatSANumber(to)}: ${message}`);
  await sendSMS(formatSANumber(to), message);
  return true;
}

/**
 * Format South African phone numbers to E.164 for Twilio.
 * Examples:
 *   "0825551234" => "+27825551234"
 *   "071 234 5678" => "+27712345678"
 *   "+27825551234" => "+27825551234" (already formatted)
 */
function formatSANumber(number) {
  if (!number) return null;

  // Remove spaces, dashes, parentheses
  let clean = number.replace(/[\s()-]/g, "");

  // Already in E.164 format
  if (clean.startsWith("+27")) return clean;

  // If starts with 0, replace with +27
  if (clean.startsWith("0")) return "+27" + clean.slice(1);

  // If starts with 27 (without +), add +
  if (clean.startsWith("27")) return "+" + clean;

  // Unknown format
  return null;
}

exports.followUpScheduler = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Africa/Johannesburg",
    secrets: [TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM],
  },
  async () => {
    const now = Timestamp.now();

    const snap = await db
      .collection("followups")
      .where("status", "==", "pending")
      .where("scheduledAt", "<=", now)
      .get();

    if (snap.empty) {
      console.log("No pending follow-ups");
      return;
    }

    for (const doc of snap.docs) {
      const followup = doc.data();

      if (!followup.contact?.id) {
        await doc.ref.update({ status: "failed" });
        continue;
      }

      const contactSnap = await db
        .collection("contacts")
        .doc(followup.contact.id)
        .get();

      if (!contactSnap.exists) {
        await doc.ref.update({ status: "failed" });
        continue;
      }

      const contact = contactSnap.data();

      try {
        await sendMessage(contact.phone, followup.message);
        await doc.ref.update({
          status: "sent",
          sentAt: Timestamp.now(),
        });
      } catch (err) {
        console.error("Send failed", err);
        await doc.ref.update({ status: "failed" });
      }
    }
  }
);


const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const { initializePayment, verifyPayment } = require("./paystack");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post("/paystack/init", async (req, res) => {
  try {
    const data = await initializePayment(req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/paystack/verify/:ref", async (req, res) => {
  try {
    const data = await verifyPayment(req.params.ref);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/paystack/health", async (req, res) => {
  try {
    const data = {"value":"shopop!"};
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

exports.api = functions.https.onRequest({secrets:[PAYSTACK_SECRET]}, app);

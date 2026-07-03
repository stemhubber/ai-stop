const { PAYSTACK_SECRET } = require("./env");
const axios = require("axios");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

async function initializePayment({ email, amount, userId, metadata = {}, callbackUrl }) {
  const appUrl = process.env.PUBLIC_APP_URL || "https://webilo.co.za";
  const safeCallbackUrl = callbackUrl?.startsWith(appUrl)
    ? callbackUrl
    : `${appUrl}/payment-complete`;
  // 🔑 Must await getSecret
  const secret = PAYSTACK_SECRET.value();

  const response = await axios.post(
    "https://api.paystack.co/transaction/initialize",
    {
      email,
      amount: Number(amount) * 100,
      metadata,
      callback_url: safeCallbackUrl
    },
    {
      headers: {
        Authorization: `Bearer ${secret}`, // 🔑 Use secret here
      },
    }
  );

  const data = response.data.data;

  await db.collection("payments").doc(data.reference).set({
    userId,
    email,
    amount,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return data;
}

async function verifyPayment(reference, userId) {
  const paymentRef = db.collection("payments").doc(reference);
  const existing = await paymentRef.get();
  if (!existing.exists || existing.data().userId !== userId) {
    throw new Error("Payment not found.");
  }
  const secret = PAYSTACK_SECRET.value();

  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
    }
  );

  const payment = response.data.data;

  if (payment.status === "success") {
    await paymentRef.update({
      status: "success",
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      channel: payment.channel,
    });
  }

  return payment;
}

module.exports = { initializePayment, verifyPayment };

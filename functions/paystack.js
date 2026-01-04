const { PAYSTACK_SECRET } = require("./env");
const axios = require("axios");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

async function initializePayment({ email, amount, userId, metadata = {} }) {
  // 🔑 Must await getSecret
  const secret = PAYSTACK_SECRET.value();

  const response = await axios.post(
    "https://api.paystack.co/transaction/initialize",
    {
      email,
      amount: Number(amount) * 100,
      metadata,
      callback_url: "http://127.0.0.1:3000/payment-complete"
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

async function verifyPayment(reference) {
  const secret = PAYSTACK_SECRET.value();

  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
    }
  );

  const payment = response.data.data;

  if (payment.status === "success") {
    await db.collection("payments").doc(reference).update({
      status: "success",
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      channel: payment.channel,
    });
  }

  return payment;
}

module.exports = { initializePayment, verifyPayment };

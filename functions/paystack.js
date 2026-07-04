const { PAYSTACK_SECRET } = require("./env");
const axios = require("axios");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

async function initializePayment({ email, amount, userId, metadata = {}, callbackUrl }) {
  const appUrl = process.env.PUBLIC_APP_URL || "https://webilo.co.za";
  const allowedCallbacks = [
    appUrl,
    "https://smart-shop-bb140.web.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
  const safeCallbackUrl = allowedCallbacks.some((origin) => callbackUrl?.startsWith(origin))
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
    metadata,
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
    await db.runTransaction(async (transaction) => {
      const latestPayment = await transaction.get(paymentRef);
      const storedPayment = latestPayment.data() || {};
      if (storedPayment.status === "success") return;
      const activatesPro =
        storedPayment.metadata?.purchaseType === "plan" &&
        storedPayment.metadata?.planId === "pro";
      const userRef = activatesPro ? db.collection("users").doc(userId) : null;
      const userSnapshot = userRef ? await transaction.get(userRef) : null;

      transaction.update(paymentRef, {
        status: "success",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        channel: payment.channel,
      });

      if (activatesPro) {
        const currentExpiry = userSnapshot.data()?.planExpiresAt?.toMillis?.() || 0;
        const startsAt = Math.max(Date.now(), currentExpiry);
        const periodDays = Number(storedPayment.metadata.periodDays || 30);
        transaction.set(userRef, {
          plan: "pro",
          planStatus: "active",
          planStartedAt: admin.firestore.FieldValue.serverTimestamp(),
          planExpiresAt: admin.firestore.Timestamp.fromMillis(
            startsAt + periodDays * 24 * 60 * 60 * 1000
          ),
          planPaymentReference: reference,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    });
  }

  return payment;
}

module.exports = { initializePayment, verifyPayment };

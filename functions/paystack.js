const crypto = require("crypto");
const axios = require("axios");
const admin = require("firebase-admin");
const { PAYSTACK_SECRET } = require("./env");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();
const PAYSTACK_API = "https://api.paystack.co";

function paystackSecret() {
  const secret = PAYSTACK_SECRET.value();
  if (!secret) {
    const error = new Error("Paystack is not configured.");
    error.code = "PAYSTACK_MISSING_SECRET";
    throw error;
  }
  return secret;
}

function safeCallback(callbackUrl, fallbackPath = "/payment-complete") {
  const appUrl = process.env.PUBLIC_APP_URL || "https://webilo.co.za";
  const allowedOrigins = new Set([
    new URL(appUrl).origin,
    "https://smart-shop-bb140.web.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);
  try {
    const parsed = new URL(callbackUrl);
    return allowedOrigins.has(parsed.origin)
      ? parsed.toString()
      : `${appUrl}${fallbackPath}`;
  } catch {
    return `${appUrl}${fallbackPath}`;
  }
}

async function initializeTransaction({
  email,
  amountMinor,
  metadata = {},
  callbackUrl,
  reference,
  subaccountCode,
}) {
  const amount = Math.round(Number(amountMinor));
  if (!Number.isSafeInteger(amount) || amount < 1) {
    const error = new Error("A valid transaction amount is required.");
    error.statusCode = 400;
    throw error;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""))) {
    const error = new Error("A valid customer email is required.");
    error.statusCode = 400;
    throw error;
  }
  const response = await axios.post(
    `${PAYSTACK_API}/transaction/initialize`,
    {
      email: String(email).trim().toLowerCase(),
      amount: String(amount),
      currency: "ZAR",
      reference,
      metadata: JSON.stringify(metadata),
      callback_url: safeCallback(callbackUrl, "/checkout-complete"),
      ...(subaccountCode ? { subaccount: subaccountCode, bearer: "subaccount" } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${paystackSecret()}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    }
  );
  if (!response.data?.status || !response.data?.data?.authorization_url) {
    throw new Error(response.data?.message || "Paystack could not initialize checkout.");
  }
  return response.data.data;
}

async function fetchSubaccount(code) {
  if (!/^ACCT_[A-Za-z0-9]+$/.test(String(code || ""))) {
    const error = new Error("Enter a valid Paystack subaccount code.");
    error.statusCode = 400;
    throw error;
  }
  const response = await axios.get(
    `${PAYSTACK_API}/subaccount/${encodeURIComponent(code)}`,
    {
      headers: { Authorization: `Bearer ${paystackSecret()}` },
      timeout: 20000,
    }
  );
  if (!response.data?.status || !response.data?.data) {
    throw new Error("Paystack could not verify this settlement account.");
  }
  return response.data.data;
}

async function verifyTransaction(reference) {
  const response = await axios.get(
    `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${paystackSecret()}` },
      timeout: 20000,
    }
  );
  return response.data?.data;
}

function verifyWebhookSignature(rawBody, signature, secret = paystackSecret()) {
  if (!signature || !rawBody) return false;
  const expected = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");
  const supplied = String(signature);
  if (expected.length !== supplied.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

async function initializePayment({ email, amount, userId, metadata = {}, callbackUrl }) {
  const amountMinor = Math.round(Number(amount) * 100);
  const data = await initializeTransaction({
    email,
    amountMinor,
    metadata,
    callbackUrl: safeCallback(callbackUrl),
  });

  await db.collection("payments").doc(data.reference).set({
    userId,
    email,
    amount,
    amountMinor,
    currency: "ZAR",
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
  const payment = await verifyTransaction(reference);
  const expectedAmount = Number(existing.data().amountMinor || Number(existing.data().amount) * 100);
  if (
    payment?.status === "success" &&
    (Number(payment.amount) !== expectedAmount || payment.currency !== "ZAR")
  ) {
    const error = new Error("Paystack returned an unexpected payment amount.");
    error.code = "PAYMENT_AMOUNT_MISMATCH";
    throw error;
  }

  if (payment?.status === "success") {
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

module.exports = {
  fetchSubaccount,
  initializePayment,
  initializeTransaction,
  safeCallback,
  verifyPayment,
  verifyTransaction,
  verifyWebhookSignature,
};

const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const RETENTION_MS = 24 * 60 * 60 * 1000; // 24h — matches the `expireAt` TTL policy noted in firestore.rules

class IdempotencyConflictError extends Error {
  constructor() {
    super("A request with this idempotency key is already being processed.");
    this.code = "IDEMPOTENCY_KEY_IN_PROGRESS";
    this.statusCode = 409;
  }
}

// Runs `handler` at most once per (projectId, idempotencyKey) pair — a repeated request with the
// same key returns the first attempt's stored response instead of sending again. No key means no
// dedup; `handler` always runs. A failed `handler` clears the reservation so a retry with the same
// key gets a clean attempt (idempotency guards duplicate *successful* sends, not retries after a
// failure).
//
// The reservation itself is a Firestore transaction (same pattern as functions/plans.js's
// reserveUsage), so two concurrent requests with the same key can't both win the "reserve" step.
async function withIdempotency({ projectId, idempotencyKey, handler }) {
  if (!idempotencyKey) {
    return { replayed: false, response: await handler() };
  }

  const db = getFirestore();
  const ref = db.collection("projects").doc(projectId).collection("idempotency").doc(idempotencyKey);

  const reservation = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists) {
      return { status: snapshot.data().status, response: snapshot.data().response };
    }
    transaction.set(ref, {
      status: "pending",
      response: null,
      messageId: null,
      createdAt: Timestamp.now(),
      expireAt: Timestamp.fromMillis(Date.now() + RETENTION_MS),
    });
    return { status: "reserved" };
  });

  if (reservation.status === "completed") {
    return { replayed: true, response: reservation.response };
  }
  if (reservation.status === "pending") {
    throw new IdempotencyConflictError();
  }

  try {
    const response = await handler();
    await ref.set({ status: "completed", response, messageId: response?.id || null }, { merge: true });
    return { replayed: false, response };
  } catch (error) {
    await ref.delete().catch((cleanupError) => {
      console.error("Failed to clear a pending idempotency record after a failed send", {
        projectId,
        idempotencyKey,
        message: cleanupError.message,
      });
    });
    throw error;
  }
}

module.exports = { withIdempotency, IdempotencyConflictError };

const { getFirestore, Timestamp } = require("firebase-admin/firestore");

async function recordMessage({ projectId, type, destination, provider, status, idempotencyKey, providerMessageId }) {
  const db = getFirestore();
  const now = Timestamp.now();
  const ref = db.collection("projects").doc(projectId).collection("messages").doc();
  await ref.set({
    type,
    destination,
    provider,
    status,
    idempotencyKey: idempotencyKey || null,
    providerMessageId: providerMessageId || null,
    createdAt: now,
    completedAt: now,
  });
  return ref.id;
}

module.exports = { recordMessage };

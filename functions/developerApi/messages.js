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

function serializeMessage(id, data) {
  const toIso = (timestamp) => (timestamp?.toDate ? timestamp.toDate().toISOString() : null);
  return {
    id,
    type: data.type,
    destination: data.destination,
    provider: data.provider,
    status: data.status,
    providerMessageId: data.providerMessageId || null,
    createdAt: toIso(data.createdAt),
    completedAt: toIso(data.completedAt),
  };
}

// Scoped to the caller's own project — projectId comes from req.developerProject (the
// authenticated API key), never from the request body/params, so a project can only ever
// read its own messages regardless of what id another project's message happens to have.
async function getMessage(projectId, messageId) {
  const db = getFirestore();
  const snapshot = await db.collection("projects").doc(projectId).collection("messages").doc(messageId).get();
  if (!snapshot.exists) return null;
  return serializeMessage(snapshot.id, snapshot.data());
}

module.exports = { recordMessage, getMessage };

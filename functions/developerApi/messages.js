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

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

// No type/status filtering yet — that would need a composite index per filter field
// (equality filter + orderBy on a different field isn't covered by Firestore's automatic
// single-field indexing) declared in firestore.indexes.json and actually deployed, which
// isn't verifiable from here. Plain createdAt-ordered pagination needs no such index.
//
// cursorId is simply the `id` of the last message already returned — the caller doesn't need
// to construct or parse an opaque cursor. Passing a DocumentSnapshot to startAfter() makes
// Firestore implicitly tie-break on document id too, so same-millisecond createdAt values
// (unlikely at nanosecond Timestamp precision, but not impossible) can't cause a skipped or
// duplicated row at a page boundary.
async function listMessages({ projectId, limit, cursorId }) {
  const db = getFirestore();
  const boundedLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIST_LIMIT, 1), MAX_LIST_LIMIT);
  const collectionRef = db.collection("projects").doc(projectId).collection("messages");
  let query = collectionRef.orderBy("createdAt", "desc");

  if (cursorId) {
    const cursorSnapshot = await collectionRef.doc(String(cursorId)).get();
    if (cursorSnapshot.exists) {
      query = query.startAfter(cursorSnapshot);
    }
  }

  const snapshot = await query.limit(boundedLimit).get();
  const data = snapshot.docs.map((doc) => serializeMessage(doc.id, doc.data()));
  // A full page might just happen to end exactly at the last message — the client finds out
  // for certain by making one more request and getting an empty page back, same tradeoff most
  // cursor-paginated REST APIs make rather than doing an extra count query up front.
  return { data, nextCursor: data.length === boundedLimit ? data[data.length - 1].id : null };
}

module.exports = { recordMessage, getMessage, listMessages };

const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");

function usagePeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Monthly rollup for display/future billing (projects/{projectId}/usage/{period}) — distinct
// from rateLimit.js's short fixed-window abuse guard. FieldValue.increment() is Firestore's
// own atomic counter primitive, so this doesn't need a transaction the way rateLimit.js's
// check-then-act does: there's no limit to enforce here, just a count to add to.
async function recordUsage(projectId, metric) {
  const db = getFirestore();
  const ref = db.collection("projects").doc(projectId).collection("usage").doc(usagePeriod());
  await ref.set(
    {
      requests: FieldValue.increment(1),
      [metric]: FieldValue.increment(1),
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

const PERIOD_PATTERN = /^\d{4}-\d{2}$/;

async function getUsage(projectId, period) {
  const targetPeriod = period && PERIOD_PATTERN.test(period) ? period : usagePeriod();
  const db = getFirestore();
  const snapshot = await db.collection("projects").doc(projectId).collection("usage").doc(targetPeriod).get();
  const data = snapshot.data() || {};
  return {
    period: targetPeriod,
    requests: data.requests || 0,
    emails: data.emails || 0,
    sms: data.sms || 0,
    whatsapp: data.whatsapp || 0,
  };
}

module.exports = { recordUsage, usagePeriod, getUsage, PERIOD_PATTERN };

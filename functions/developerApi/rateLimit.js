const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const WINDOW_MS = 60 * 1000; // fixed 1-minute window
// requests/minute per project+environment. Placeholder values — the plan calls these
// configurable per project later; not built until a real project needs something different.
const LIMITS = { live: 100, test: 10 };

class RateLimitedError extends Error {
  constructor(limit) {
    super("Too many requests. Wait a minute and try again.");
    this.code = "RATE_LIMITED";
    this.statusCode = 429;
    this.limit = limit;
  }
}

// Firestore-transaction fixed-window counter — Cloud Functions instances are stateless and
// horizontally scaled, so an in-memory counter would not actually be per-project. Same pattern
// as functions/index.js's enforceAiRateLimit/enforcePublicRequestRateLimit and
// functions/plans.js's reserveUsage: throwing inside the transaction aborts it immediately
// (Firestore only retries on its own contention errors, not on an application throw).
//
// Keyed by projectId + environment, not projectId alone, so a project's live and test keys
// don't share one limit — a developer hammering their test key can't starve production traffic.
async function enforceRateLimit({ projectId, environment }) {
  const limit = LIMITS[environment] || LIMITS.test;
  const db = getFirestore();
  const ref = db.collection("developerApiRateLimits").doc(`${projectId}:${environment}`);
  const now = Date.now();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() || {};
    const windowStartedAt = data.windowStartedAt?.toMillis?.() || 0;
    const withinWindow = now - windowStartedAt < WINDOW_MS;
    const count = withinWindow ? Number(data.count || 0) : 0;
    if (withinWindow && count >= limit) {
      throw new RateLimitedError(limit);
    }
    transaction.set(ref, {
      count: count + 1,
      windowStartedAt: withinWindow ? data.windowStartedAt : Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
}

// Router-wide middleware, mounted after requireApiKey (rateLimit.js needs
// req.developerProject.projectId/environment, which auth.js attaches).
async function requireRateLimit(req, res, next) {
  try {
    await enforceRateLimit(req.developerProject);
    return next();
  } catch (error) {
    if (error instanceof RateLimitedError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    console.error("Rate limit check failed", error);
    return res.status(500).json({ error: "Could not process this request.", code: "RATE_LIMIT_CHECK_FAILED" });
  }
}

module.exports = { enforceRateLimit, requireRateLimit, RateLimitedError };

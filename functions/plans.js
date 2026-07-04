const { FieldValue, Timestamp } = require("firebase-admin/firestore");

const PLAN_CATALOG = {
  core: {
    id: "core",
    limits: {
      aiRequests: 30,
      aiTokens: 150000,
      transcriptions: 20,
      messages: 25,
    },
  },
  pro: {
    id: "pro",
    price: 299,
    periodDays: 30,
    limits: {
      aiRequests: 500,
      aiTokens: 2000000,
      transcriptions: 300,
      messages: 1000,
    },
  },
};

function usagePeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function effectivePlan(account = {}) {
  if (account.plan !== "pro") return PLAN_CATALOG.core;
  if (account.planStatus && account.planStatus !== "active") return PLAN_CATALOG.core;
  const expiresAt = account.planExpiresAt?.toMillis?.() || (
    account.planExpiresAt ? new Date(account.planExpiresAt).getTime() : null
  );
  return !expiresAt || expiresAt > Date.now()
    ? PLAN_CATALOG.pro
    : PLAN_CATALOG.core;
}

async function reserveUsage(db, userId, metric, amount = 1) {
  const period = usagePeriod();
  const accountRef = db.collection("users").doc(userId);
  const usageRef = accountRef.collection("usage").doc(period);

  return db.runTransaction(async (transaction) => {
    const [accountSnapshot, usageSnapshot] = await Promise.all([
      transaction.get(accountRef),
      transaction.get(usageRef),
    ]);
    const plan = effectivePlan(accountSnapshot.data());
    const usage = usageSnapshot.data() || {};
    const limitKey = metric === "inputTokens" || metric === "outputTokens"
      ? "aiTokens"
      : metric;
    const used = limitKey === "aiTokens"
      ? Number(usage.inputTokens || 0) + Number(usage.outputTokens || 0)
      : Number(usage[metric] || 0);
    const maximum = plan.limits[limitKey];

    if (metric === "aiRequests") {
      const tokenUse = Number(usage.inputTokens || 0) + Number(usage.outputTokens || 0);
      const tokenLimit = plan.limits.aiTokens;
      if (tokenLimit != null && tokenUse >= tokenLimit) {
        const error = new Error(
          `${plan.id === "pro" ? "Pro" : "Core"} AI token fair-use limit reached for this month.`
        );
        error.statusCode = 429;
        error.code = "FAIR_USE_LIMIT";
        error.metric = "aiTokens";
        error.plan = plan.id;
        error.limit = tokenLimit;
        error.used = tokenUse;
        throw error;
      }
    }

    if (maximum != null && used + amount > maximum) {
      const error = new Error(
        `${plan.id === "pro" ? "Pro" : "Core"} ${limitKey} fair-use limit reached for this month.`
      );
      error.statusCode = 429;
      error.code = "FAIR_USE_LIMIT";
      error.metric = limitKey;
      error.plan = plan.id;
      error.limit = maximum;
      error.used = used;
      throw error;
    }

    transaction.set(usageRef, {
      [metric]: used + amount,
      period,
      planAtUse: plan.id,
      updatedAt: Timestamp.now(),
    }, { merge: true });
    return { plan: plan.id, limit: maximum, used: used + amount };
  });
}

async function recordUsage(db, userId, values = {}) {
  const entries = Object.entries(values)
    .filter(([, value]) => Number.isFinite(Number(value)) && Number(value) > 0);
  if (!entries.length) return;
  const payload = {
    period: usagePeriod(),
    updatedAt: Timestamp.now(),
  };
  entries.forEach(([metric, value]) => {
    payload[metric] = FieldValue.increment(Number(value));
  });
  await db.collection("users").doc(userId)
    .collection("usage").doc(usagePeriod())
    .set(payload, { merge: true });
}

module.exports = {
  PLAN_CATALOG,
  effectivePlan,
  recordUsage,
  reserveUsage,
  usagePeriod,
};

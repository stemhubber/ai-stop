const { cleanText } = require("./commerce");

// Rejects public order/checkout creation when the owner has paused ordering.
// A `pausedUntil` in the past auto-reopens (the pause window elapsed).
// Mirrored client-side in src/features/commerce/ordering.js.
function assertAcceptingOrders(business) {
  const ordering = business?.ordering || {};
  if (ordering.acceptingOrders !== false) return;
  const until = ordering.pausedUntil?.toMillis?.()
    || (ordering.pausedUntil ? Date.parse(ordering.pausedUntil) : 0);
  if (until && until <= Date.now()) return;
  const error = new Error(
    cleanText(ordering.pausedReason, 300) || "This business is not accepting orders right now."
  );
  error.statusCode = 409;
  error.code = "ORDERING_PAUSED";
  throw error;
}

module.exports = { assertAcceptingOrders };

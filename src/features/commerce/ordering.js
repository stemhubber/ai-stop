// Client mirror of the server's assertAcceptingOrders guard (functions/index.js).
// Returns null when the business is accepting orders, or { reason, until } when
// ordering is paused. A `pausedUntil` in the past auto-reopens.
export function orderingPaused(business) {
  const ordering = business?.ordering || {};
  if (ordering.acceptingOrders !== false) return null;
  const until = ordering.pausedUntil ? Date.parse(ordering.pausedUntil) : 0;
  if (until && until <= Date.now()) return null;
  return {
    reason: ordering.pausedReason || "This business is not accepting orders right now.",
    until: until || null,
  };
}

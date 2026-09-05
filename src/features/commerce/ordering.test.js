import { orderingPaused } from "./ordering";

test("returns null when a business is accepting orders", () => {
  expect(orderingPaused(undefined)).toBeNull();
  expect(orderingPaused({})).toBeNull();
  expect(orderingPaused({ ordering: { acceptingOrders: true } })).toBeNull();
});

test("reports a paused business with its reason", () => {
  const result = orderingPaused({
    ordering: { acceptingOrders: false, pausedReason: "Closed for a private event" },
  });
  expect(result).toEqual({ reason: "Closed for a private event", until: null });
});

test("falls back to a default reason", () => {
  expect(orderingPaused({ ordering: { acceptingOrders: false } }).reason)
    .toMatch(/not accepting orders/i);
});

test("auto-reopens once pausedUntil is in the past", () => {
  const past = new Date(Date.now() - 60_000).toISOString();
  const future = new Date(Date.now() + 60_000).toISOString();
  expect(orderingPaused({ ordering: { acceptingOrders: false, pausedUntil: past } })).toBeNull();
  expect(orderingPaused({ ordering: { acceptingOrders: false, pausedUntil: future } }))
    .toMatchObject({ until: expect.any(Number) });
});

import {
  currentUsagePeriod,
  normalizePlanId,
  PLAN_CATALOG,
} from "./plans";

test("keeps current business tools in Core and gates advanced Pro capabilities", () => {
  expect(PLAN_CATALOG.core.entitlements.orders).toBe(true);
  expect(PLAN_CATALOG.core.entitlements.bookings).toBe(true);
  expect(PLAN_CATALOG.core.entitlements.aiAssist).toBe(true);
  expect(PLAN_CATALOG.core.entitlements.advancedAnalytics).toBe(false);
  expect(PLAN_CATALOG.pro.entitlements.advancedAnalytics).toBe(true);
  expect(PLAN_CATALOG.pro.limits.aiRequests).toBeGreaterThan(PLAN_CATALOG.core.limits.aiRequests);
});

test("normalizes legacy plans and creates a stable monthly usage period", () => {
  expect(normalizePlanId("free")).toBe("core");
  expect(normalizePlanId("pro")).toBe("pro");
  expect(currentUsagePeriod(new Date("2026-07-03T12:00:00Z"))).toBe("2026-07");
});

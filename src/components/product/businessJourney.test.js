import { buildLaunchPath } from "./businessJourney";

const business = {
  id: "business-1",
  name: "Neighbourhood Bakery",
  description: "Fresh bread and celebration cakes made daily for local families.",
  audience: "Families nearby",
  goal: "Increase weekly orders",
  phone: "0712345678",
};

test("derives launch progress from connected business records", () => {
  const steps = buildLaunchPath(
    business,
    [
      { moduleId: "commerce", enabled: true },
      { moduleId: "orders", enabled: true },
    ],
    {
      products: [{ id: "product-1" }],
      services: [],
      customers: [{ id: "customer-1" }],
      orders: [],
      bookings: [],
    },
    [{ id: "site-1", status: "published", settings: { businessId: "business-1" } }]
  );

  expect(steps).toHaveLength(6);
  expect(steps.every((step) => step.complete)).toBe(true);
});

test("routes missing offers to modules when commerce is disabled", () => {
  const steps = buildLaunchPath(business, [], {}, []);

  expect(steps[1]).toMatchObject({ complete: false, target: "modules" });
  expect(steps[3]).toMatchObject({ complete: false, target: "createWebsite" });
});

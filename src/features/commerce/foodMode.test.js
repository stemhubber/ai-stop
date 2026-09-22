import { isFoodBusiness, resolveWorkspaceProfile } from "./foodMode";

test("recognises food businesses by category", () => {
  expect(isFoodBusiness({ category: "restaurant" })).toBe(true);
  expect(isFoodBusiness({ category: "Takeaway" })).toBe(true);
  expect(isFoodBusiness({ category: " Cafe " })).toBe(true);
  expect(isFoodBusiness({ category: "retail" })).toBe(false);
  expect(isFoodBusiness({})).toBe(false);
  expect(isFoodBusiness(null)).toBe(false);
});

test("the foodOrdering flag overrides a non-food category", () => {
  expect(isFoodBusiness({ category: "other", foodOrdering: true })).toBe(true);
  expect(isFoodBusiness({ category: "restaurant", foodOrdering: false })).toBe(true);
});

test("resolveWorkspaceProfile classifies food businesses", () => {
  expect(resolveWorkspaceProfile({ category: "restaurant" })).toEqual({
    kind: "food",
    offersLabel: "Menu",
    showKitchen: true,
  });
  expect(resolveWorkspaceProfile({ category: "other", foodOrdering: true }).kind).toBe("food");
});

test("resolveWorkspaceProfile classifies retail businesses", () => {
  expect(resolveWorkspaceProfile({ category: "retail" })).toEqual({
    kind: "retail",
    offersLabel: "Catalog",
    showKitchen: false,
  });
  expect(resolveWorkspaceProfile({ category: "Retail" }).kind).toBe("retail");
});

test("resolveWorkspaceProfile falls back to general, matching today's isFoodBusiness fallback", () => {
  expect(resolveWorkspaceProfile({ category: "salon" })).toEqual({
    kind: "general",
    offersLabel: "Offers",
    showKitchen: false,
  });
  expect(resolveWorkspaceProfile({})).toEqual({
    kind: "general",
    offersLabel: "Offers",
    showKitchen: false,
  });
  expect(resolveWorkspaceProfile(null).kind).toBe("general");
});

test("isFoodBusiness stays in agreement with resolveWorkspaceProfile for existing data shapes", () => {
  const businesses = [
    { category: "restaurant" },
    { category: "retail" },
    { category: "salon" },
    { category: "other", foodOrdering: true },
    {},
    null,
  ];
  for (const business of businesses) {
    expect(isFoodBusiness(business)).toBe(resolveWorkspaceProfile(business).kind === "food");
  }
});

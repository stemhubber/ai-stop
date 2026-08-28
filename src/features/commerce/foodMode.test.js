import { isFoodBusiness } from "./foodMode";

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

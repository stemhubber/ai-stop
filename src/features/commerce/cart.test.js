import { checkoutEligible, commonFulfilment } from "./cart";

test("only fixed positive non-booking offers can enter paid checkout", () => {
  expect(checkoutEligible({ pricingMode: "fixed", price: 1000, fulfilmentMethods: ["pickup"] })).toBe(true);
  expect(checkoutEligible({ pricingMode: "quote", price: 1000, fulfilmentMethods: ["quote"] })).toBe(false);
  expect(checkoutEligible({ pricingMode: "fixed", price: 1000, fulfilmentMethods: ["booking"] })).toBe(false);
});

test("sold-out offers cannot enter paid checkout", () => {
  expect(checkoutEligible({ pricingMode: "fixed", price: 1000, fulfilmentMethods: ["pickup"], available: false })).toBe(false);
});

test("offers with variants or required modifiers stay request-only until the cart supports them", () => {
  expect(checkoutEligible({
    pricingMode: "fixed", price: 1000, fulfilmentMethods: ["pickup"],
    variants: [{ label: "Large", priceDeltaCents: 500 }],
  })).toBe(false);
  expect(checkoutEligible({
    pricingMode: "fixed", price: 1000, fulfilmentMethods: ["pickup"],
    modifierGroups: [{ name: "Extras", min: 1, max: 1, options: [{ label: "Cheese", priceCents: 500 }] }],
  })).toBe(false);
  // Optional (min: 0) modifier groups don't block the simple cart flow.
  expect(checkoutEligible({
    pricingMode: "fixed", price: 1000, fulfilmentMethods: ["pickup"],
    modifierGroups: [{ name: "Extras", min: 0, max: 1, options: [{ label: "Cheese", priceCents: 500 }] }],
  })).toBe(true);
});

test("finds fulfilment methods shared by every cart item", () => {
  expect(commonFulfilment([
    { fulfilmentMethods: ["pickup", "delivery"] },
    { fulfilmentMethods: ["pickup"] },
  ])).toEqual(["pickup"]);
});

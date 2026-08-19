import { checkoutEligible, commonFulfilment } from "./cart";

test("only fixed positive non-booking offers can enter paid checkout", () => {
  expect(checkoutEligible({ pricingMode: "fixed", price: 1000, fulfilmentMethods: ["pickup"] })).toBe(true);
  expect(checkoutEligible({ pricingMode: "quote", price: 1000, fulfilmentMethods: ["quote"] })).toBe(false);
  expect(checkoutEligible({ pricingMode: "fixed", price: 1000, fulfilmentMethods: ["booking"] })).toBe(false);
});

test("finds fulfilment methods shared by every cart item", () => {
  expect(commonFulfilment([
    { fulfilmentMethods: ["pickup", "delivery"] },
    { fulfilmentMethods: ["pickup"] },
  ])).toEqual(["pickup"]);
});

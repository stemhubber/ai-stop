const test = require("node:test");
const assert = require("node:assert/strict");
const { offerSnapshot } = require("./commerce");
const {
  buildCheckoutOrder,
  checkoutSecret,
  hashCheckoutSecret,
  normalizeCheckoutSelections,
  validCommercePayment,
  validIdempotencyKey,
} = require("./commerceCheckout");

test("normalizes duplicate cart selections without trusting client prices", () => {
  const selections = normalizeCheckoutSelections([
    { resource: "offers", id: "meal", quantity: 1, price: 1 },
    { resource: "offers", id: "meal", quantity: 2, price: 999999 },
  ]);
  assert.deepEqual(selections, [{
    resource: "offers",
    id: "meal",
    quantity: 3,
    selectedOptions: { variant: "", modifiers: [] },
  }]);
});

test("keeps distinct variant selections of the same offer as separate cart lines", () => {
  const selections = normalizeCheckoutSelections([
    { resource: "offers", id: "meal", quantity: 1, selectedOptions: { variant: "Large" } },
    { resource: "offers", id: "meal", quantity: 2, selectedOptions: { variant: "Small" } },
    { resource: "offers", id: "meal", quantity: 1, selectedOptions: { variant: "Large" } },
  ]);
  assert.equal(selections.length, 2);
  const large = selections.find((entry) => entry.selectedOptions.variant === "Large");
  const small = selections.find((entry) => entry.selectedOptions.variant === "Small");
  assert.equal(large.quantity, 2);
  assert.equal(small.quantity, 2);
});

test("builds a pending multi-item checkout from stored offer snapshots", () => {
  const selections = normalizeCheckoutSelections([
    { resource: "offers", id: "meal", quantity: 2 },
    { resource: "products", id: "drink", quantity: 1 },
  ]);
  const order = buildCheckoutOrder({
    businessId: "business-1",
    customerId: "customer-1",
    customer: { name: "Customer", email: "customer@example.com", phone: "0712345678" },
    selections,
    offers: [
      offerSnapshot("offers", "meal", {
        name: "Meal",
        price: 12000,
        fulfilmentMethods: ["pickup", "delivery"],
      }),
      offerSnapshot("products", "drink", {
        name: "Drink",
        price: 2500,
        fulfilmentMethods: ["pickup"],
      }),
    ],
    fulfilmentMethod: "pickup",
    orderId: "abcdefgh1234",
    now: "now",
  });

  assert.equal(order.status, "awaiting_payment");
  assert.equal(order.paymentStatus, "pending");
  assert.equal(order.items.length, 2);
  assert.equal(order.total, 26500);
  assert.equal(order.publicReference, "WEB-ABCDEFGH");
});

test("prices a variant and modifier choice server-side in paid checkout", () => {
  const selections = normalizeCheckoutSelections([
    { resource: "offers", id: "burger", quantity: 2, selectedOptions: { variant: "Large", modifiers: ["Cheese"] } },
  ]);
  const order = buildCheckoutOrder({
    businessId: "business-1",
    customerId: "customer-1",
    customer: { name: "Customer", email: "customer@example.com", phone: "0712345678" },
    selections,
    offers: [offerSnapshot("offers", "burger", {
      name: "Burger",
      price: 8000,
      fulfilmentMethods: ["pickup"],
      variants: [{ label: "Regular", priceDeltaCents: 0 }, { label: "Large", priceDeltaCents: 2000 }],
      modifierGroups: [{ name: "Extras", min: 0, max: 1, options: [{ label: "Cheese", priceCents: 1000 }] }],
    })],
    fulfilmentMethod: "pickup",
    orderId: "abcdefgh1234",
    now: "now",
  });

  assert.equal(order.items[0].unitPrice, 11000);
  assert.equal(order.total, 22000);
  assert.equal(order.items[0].selectedOptions.length, 2);
});

test("rejects a checkout that omits a required variant", () => {
  const selections = normalizeCheckoutSelections([
    { resource: "offers", id: "burger", quantity: 1 },
  ]);
  assert.throws(() => buildCheckoutOrder({
    businessId: "business-1",
    customerId: "customer-1",
    customer: { name: "Customer", email: "customer@example.com", phone: "0712345678" },
    selections,
    offers: [offerSnapshot("offers", "burger", {
      name: "Burger",
      price: 8000,
      fulfilmentMethods: ["pickup"],
      variants: [{ label: "Regular", priceDeltaCents: 0 }, { label: "Large", priceDeltaCents: 2000 }],
    })],
    fulfilmentMethod: "pickup",
    orderId: "abcdefgh1234",
    now: "now",
  }), /Choose an option/);
});

test("rejects quote-based items from paid checkout", () => {
  const selections = normalizeCheckoutSelections([
    { resource: "offers", id: "custom", quantity: 1 },
  ]);
  assert.throws(() => buildCheckoutOrder({
    businessId: "business-1",
    customerId: "customer-1",
    customer: { name: "Customer", email: "customer@example.com", phone: "0712345678" },
    selections,
    offers: [offerSnapshot("offers", "custom", {
      name: "Custom work",
      pricingMode: "quote",
      fulfilmentMethods: ["quote"],
    })],
    fulfilmentMethod: "quote",
    orderId: "order-1",
    now: "now",
  }), /not available for online checkout/);
});

test("checkout client secrets can be compared by hash", () => {
  const secret = checkoutSecret();
  assert.equal(secret.length >= 24, true);
  assert.equal(hashCheckoutSecret(secret), hashCheckoutSecret(secret));
  assert.notEqual(hashCheckoutSecret(secret), hashCheckoutSecret("wrong"));
  assert.equal(validIdempotencyKey("checkout_1234567890"), true);
  assert.equal(validIdempotencyKey("short"), false);
});

test("accepts only successful Paystack events matching the stored amount and reference", () => {
  const session = { paymentReference: "WCO-order", amount: 26500, currency: "ZAR" };
  const order = { payment: { reference: "WCO-order" } };
  assert.equal(validCommercePayment({
    status: "success",
    reference: "WCO-order",
    amount: 26500,
    currency: "ZAR",
  }, session, order), true);
  assert.equal(validCommercePayment({
    status: "success",
    reference: "WCO-order",
    amount: 1,
    currency: "ZAR",
  }, session, order), false);
});

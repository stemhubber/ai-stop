const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildOrder,
  normalizeCustomer,
  normalizeSelection,
  offerSnapshot,
  requestFingerprint,
  resolveSelectedOptions,
} = require("./commerce");

test("buildOrder creates an immutable pricing snapshot from a legacy product", () => {
  const offer = offerSnapshot("products", "product-1", {
    name: "Coffee beans",
    price: 12500,
    currency: "ZAR",
  });
  const order = buildOrder({
    businessId: "business-1",
    customerId: "customer-1",
    customer: normalizeCustomer({ name: "Amahle", phone: "0735534588" }),
    selection: normalizeSelection({ resource: "products", id: "product-1", quantity: 2 }),
    offer,
    fulfilmentMethod: "pickup",
    orderId: "abcdefgh1234",
    now: "now",
  });

  assert.equal(order.schemaVersion, 2);
  assert.equal(order.publicReference, "WEB-ABCDEFGH");
  assert.equal(order.items[0].lineTotal, 25000);
  assert.equal(order.pricingSnapshot.total, 25000);
  assert.equal(order.status, "requested");
  assert.equal(order.payment.status, "not_required");
  assert.ok(!("clientTokenHash" in order), "no tracker token unless one is supplied");
});

test("buildOrder stores a supplied client token hash and nothing else", () => {
  const offer = offerSnapshot("products", "product-1", { name: "Tea", price: 5000, currency: "ZAR" });
  const withToken = buildOrder({
    businessId: "business-1",
    customerId: "customer-1",
    customer: normalizeCustomer({ name: "Amahle", phone: "0735534588" }),
    selection: normalizeSelection({ resource: "products", id: "product-1", quantity: 1 }),
    offer,
    fulfilmentMethod: "pickup",
    orderId: "abcdefgh1234",
    now: "now",
    clientTokenHash: "deadbeef",
  });
  assert.equal(withToken.clientTokenHash, "deadbeef");
});

test("quote offers produce a quote request without trusting a client total", () => {
  const offer = offerSnapshot("offers", "offer-1", {
    name: "Custom catering",
    offerType: "package",
    pricingMode: "quote",
    price: 999999,
    fulfilmentMethods: ["quote"],
  });
  const order = buildOrder({
    businessId: "business-1",
    customerId: "customer-1",
    customer: normalizeCustomer({ name: "Client", phone: "0712345678" }),
    selection: normalizeSelection({ resource: "offers", id: "offer-1", quantity: 1 }),
    offer,
    fulfilmentMethod: "quote",
    orderId: "quote123",
    now: "now",
  });

  assert.equal(order.orderType, "quote_request");
  assert.equal(order.total, 0);
  assert.equal(order.pricingSnapshot.status, "quote_required");
});

test("booking offers require a requested time", () => {
  const offer = offerSnapshot("services", "service-1", {
    name: "Consultation",
    price: 50000,
  });
  assert.throws(() => buildOrder({
    businessId: "business-1",
    customerId: "customer-1",
    customer: normalizeCustomer({ name: "Client", phone: "0712345678" }),
    selection: normalizeSelection({ resource: "services", id: "service-1", quantity: 1 }),
    offer,
    fulfilmentMethod: "booking",
    orderId: "booking1",
    now: "now",
  }), /preferred booking date/);
});

test("offerSnapshot sanitizes the food catalogue fields", () => {
  const offer = offerSnapshot("offers", "burger", {
    name: "Burger",
    price: 8000,
    category: "  Mains  ",
    prepMinutes: "12.9",
    available: false,
    stockCount: "7",
    variants: [
      { label: "Regular", priceDeltaCents: 0 },
      { label: "Large", priceDeltaCents: 2000 },
      { label: "" }, // dropped: no label
    ],
    modifierGroups: [
      {
        name: "Extras",
        min: 0,
        max: 2,
        options: [
          { label: "Cheese", priceCents: 1000 },
          { label: "Bacon", priceCents: 1500 },
        ],
      },
      { name: "Empty group", options: [] }, // dropped: no options
    ],
  });

  assert.equal(offer.category, "Mains");
  assert.equal(offer.prepMinutes, 13);
  assert.equal(offer.available, false);
  assert.equal(offer.stockCount, 7);
  assert.equal(offer.variants.length, 2);
  assert.deepEqual(offer.variants[1], { label: "Large", priceDeltaCents: 2000 });
  assert.equal(offer.modifierGroups.length, 1);
  assert.equal(offer.modifierGroups[0].options.length, 2);
});

test("offerSnapshot defaults stockCount to null and available to true", () => {
  const offer = offerSnapshot("products", "p1", { name: "Tea", price: 1000 });
  assert.equal(offer.stockCount, null);
  assert.equal(offer.available, true);
  assert.deepEqual(offer.variants, []);
  assert.deepEqual(offer.modifierGroups, []);
});

test("resolveSelectedOptions prices a variant and modifiers server-side", () => {
  const offer = offerSnapshot("offers", "burger", {
    name: "Burger",
    price: 8000,
    variants: [{ label: "Regular", priceDeltaCents: 0 }, { label: "Large", priceDeltaCents: 2000 }],
    modifierGroups: [{
      name: "Extras",
      min: 0,
      max: 2,
      options: [{ label: "Cheese", priceCents: 1000 }, { label: "Bacon", priceCents: 1500 }],
    }],
  });
  const { selectedOptions, deltaCents } = resolveSelectedOptions(offer, {
    variant: "Large",
    modifiers: ["Cheese", "Bacon"],
  });
  assert.equal(deltaCents, 2000 + 1000 + 1500);
  assert.equal(selectedOptions.length, 3);
  assert.deepEqual(selectedOptions[0], { type: "variant", label: "Large", priceCents: 2000 });
});

test("resolveSelectedOptions rejects a missing required variant", () => {
  const offer = offerSnapshot("offers", "burger", {
    name: "Burger",
    price: 8000,
    variants: [{ label: "Regular", priceDeltaCents: 0 }],
  });
  assert.throws(() => resolveSelectedOptions(offer, {}), /Choose an option/);
});

test("resolveSelectedOptions rejects a modifier that violates the group's min/max", () => {
  const offer = offerSnapshot("offers", "burger", {
    name: "Burger",
    price: 8000,
    modifierGroups: [{
      name: "Extras",
      min: 1,
      max: 1,
      options: [{ label: "Cheese", priceCents: 1000 }, { label: "Bacon", priceCents: 1500 }],
    }],
  });
  assert.throws(() => resolveSelectedOptions(offer, { modifiers: [] }), /Choose 1 option/);
  assert.throws(
    () => resolveSelectedOptions(offer, { modifiers: ["Cheese", "Bacon"] }),
    /Choose 1 option/
  );
});

test("resolveSelectedOptions rejects an unknown modifier label", () => {
  const offer = offerSnapshot("offers", "burger", {
    name: "Burger",
    price: 8000,
    modifierGroups: [{ name: "Extras", min: 0, max: 1, options: [{ label: "Cheese", priceCents: 1000 }] }],
  });
  assert.throws(
    () => resolveSelectedOptions(offer, { modifiers: ["Not a real option"] }),
    /only add-ons/
  );
});

test("buildOrder prices a variant and modifier choice into the order total", () => {
  const offer = offerSnapshot("offers", "burger", {
    name: "Burger",
    price: 8000,
    fulfilmentMethods: ["pickup"],
    variants: [{ label: "Regular", priceDeltaCents: 0 }, { label: "Large", priceDeltaCents: 2000 }],
    modifierGroups: [{ name: "Extras", min: 0, max: 1, options: [{ label: "Cheese", priceCents: 1000 }] }],
  });
  const order = buildOrder({
    businessId: "business-1",
    customerId: "customer-1",
    customer: normalizeCustomer({ name: "Client", phone: "0712345678" }),
    selection: normalizeSelection({
      resource: "offers",
      id: "burger",
      quantity: 2,
      selectedOptions: { variant: "Large", modifiers: ["Cheese"] },
    }),
    offer,
    fulfilmentMethod: "pickup",
    orderId: "abcdefgh1234",
    now: "now",
  });

  // (8000 base + 2000 variant + 1000 modifier) * 2 units
  assert.equal(order.items[0].unitPrice, 11000);
  assert.equal(order.items[0].lineTotal, 22000);
  assert.equal(order.total, 22000);
  assert.equal(order.items[0].selectedOptions.length, 2);
});

test("request fingerprints are stable without exposing the source address", () => {
  const first = requestFingerprint("127.0.0.1", "browser");
  const second = requestFingerprint("127.0.0.1", "browser");
  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.doesNotMatch(first, /127\.0\.0\.1/);
});

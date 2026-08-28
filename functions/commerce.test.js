const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildOrder,
  normalizeCustomer,
  normalizeSelection,
  offerSnapshot,
  requestFingerprint,
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

test("request fingerprints are stable without exposing the source address", () => {
  const first = requestFingerprint("127.0.0.1", "browser");
  const second = requestFingerprint("127.0.0.1", "browser");
  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.doesNotMatch(first, /127\.0\.0\.1/);
});

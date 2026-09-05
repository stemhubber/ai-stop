const test = require("node:test");
const assert = require("node:assert/strict");
const { assertAcceptingOrders } = require("./ordering");

test("accepts orders by default", () => {
  assert.doesNotThrow(() => assertAcceptingOrders(undefined));
  assert.doesNotThrow(() => assertAcceptingOrders({}));
  assert.doesNotThrow(() => assertAcceptingOrders({ ordering: { acceptingOrders: true } }));
});

test("rejects with 409 ORDERING_PAUSED when paused", () => {
  try {
    assertAcceptingOrders({ ordering: { acceptingOrders: false, pausedReason: "Closed today" } });
    assert.fail("should have thrown");
  } catch (error) {
    assert.equal(error.statusCode, 409);
    assert.equal(error.code, "ORDERING_PAUSED");
    assert.equal(error.message, "Closed today");
  }
});

test("auto-reopens once pausedUntil has passed", () => {
  const past = new Date(Date.now() - 60000).toISOString();
  const future = new Date(Date.now() + 60000).toISOString();
  assert.doesNotThrow(() => assertAcceptingOrders({ ordering: { acceptingOrders: false, pausedUntil: past } }));
  assert.throws(() => assertAcceptingOrders({ ordering: { acceptingOrders: false, pausedUntil: future } }));
});

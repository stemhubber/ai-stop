const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { safeCallback, verifyWebhookSignature } = require("./paystack");

test("accepts only exact configured callback origins", () => {
  assert.match(
    safeCallback("https://smart-shop-bb140.web.app/checkout-complete?session=one"),
    /^https:\/\/smart-shop-bb140\.web\.app\/checkout-complete/
  );
  assert.doesNotMatch(
    safeCallback("https://smart-shop-bb140.web.app.attacker.example/steal"),
    /attacker/
  );
});

test("verifies Paystack webhook signatures with HMAC SHA512", () => {
  const secret = "test_secret";
  const rawBody = Buffer.from(JSON.stringify({ event: "charge.success", data: { id: 1 } }));
  const signature = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  assert.equal(verifyWebhookSignature(rawBody, signature, secret), true);
  assert.equal(verifyWebhookSignature(rawBody, `${signature.slice(0, -1)}0`, secret), false);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildEmailPayload } = require("./resend");

test("builds a plain-text Resend email payload", () => {
  assert.deepEqual(buildEmailPayload({
    from: "Webilo <hello@example.com>",
    to: "customer@example.com",
    subject: "Booking confirmed",
    body: "Your booking is confirmed.",
  }), {
    from: "Webilo <hello@example.com>",
    to: ["customer@example.com"],
    subject: "Booking confirmed",
    text: "Your booking is confirmed.",
  });
});

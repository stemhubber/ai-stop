const test = require("node:test");
const assert = require("node:assert/strict");
const {
  bookingCreatedEmails,
  orderCreatedEmails,
  orderStatusEmail,
  welcomeEmail,
} = require("./notifications");

test("builds a welcome email once an account has an address", () => {
  const email = welcomeEmail({ email: "owner@example.com" });
  assert.equal(email.to, "owner@example.com");
  assert.match(email.subject, /Welcome/);
});

test("builds owner and customer order confirmations", () => {
  const emails = orderCreatedEmails(
    { name: "Corner Bakery", email: "owner@example.com" },
    {
      customerName: "Naledi",
      customerEmail: "naledi@example.com",
      total: 15000,
      items: [{ name: "Cake", quantity: 2 }],
    }
  );
  assert.match(emails.owner.subject, /New order/);
  assert.equal(emails.customer.to, "naledi@example.com");
  assert.match(emails.customer.body, /R\s?150/);
});

test("uses status-specific order copy", () => {
  const email = orderStatusEmail(
    { name: "Corner Bakery", email: "owner@example.com" },
    { customerEmail: "naledi@example.com", status: "confirmed", total: 15000 }
  );
  assert.match(email.body, /accepted/);
});

test("makes booking requests clear that they are not confirmed", () => {
  const emails = bookingCreatedEmails(
    { name: "Studio", email: "owner@example.com" },
    { customerEmail: "client@example.com", serviceName: "Consultation" }
  );
  assert.match(emails.customer.body, /not a confirmed appointment/);
});

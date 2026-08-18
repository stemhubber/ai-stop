const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateBill, PRICING, CURRENCY } = require("./billing");

test("usage entirely within the free allowance bills nothing", () => {
  const bill = calculateBill({ emails: 500, sms: 100, whatsapp: 50 });
  assert.equal(bill.totalCents, 0);
  bill.lineItems.forEach((item) => {
    assert.equal(item.billable, 0);
    assert.equal(item.amountCents, 0);
  });
});

test("usage beyond the free allowance is billed per unit", () => {
  const bill = calculateBill({
    emails: PRICING.emails.freeAllowance + 100,
    sms: PRICING.sms.freeAllowance + 10,
    whatsapp: PRICING.whatsapp.freeAllowance,
  });
  const emailLine = bill.lineItems.find((item) => item.metric === "emails");
  const smsLine = bill.lineItems.find((item) => item.metric === "sms");
  const whatsappLine = bill.lineItems.find((item) => item.metric === "whatsapp");

  assert.equal(emailLine.billable, 100);
  assert.equal(emailLine.amountCents, 100 * PRICING.emails.pricePerUnitCents);
  assert.equal(smsLine.billable, 10);
  assert.equal(smsLine.amountCents, 10 * PRICING.sms.pricePerUnitCents);
  assert.equal(whatsappLine.billable, 0);
  assert.equal(whatsappLine.amountCents, 0);

  assert.equal(bill.totalCents, emailLine.amountCents + smsLine.amountCents);
});

test("missing usage fields are treated as zero, not an error", () => {
  const bill = calculateBill({});
  assert.equal(bill.totalCents, 0);
  assert.equal(bill.lineItems.length, Object.keys(PRICING).length);
});

test("reports the configured currency", () => {
  const bill = calculateBill({});
  assert.equal(bill.currency, CURRENCY);
});

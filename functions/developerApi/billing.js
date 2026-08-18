// Pricing for the Communications API: a free monthly allowance per metric, then a per-unit
// price for anything beyond it. Placeholder numbers — adjust before this becomes a real
// charge rather than just a display. Amounts are in ZAR minor units (cents), matching how the
// rest of this codebase handles money (see paystack.js / commerceCheckout.js's `amountMinor`
// convention), to avoid floating-point currency bugs.
//
// This module only computes what a project *would* owe — nothing here charges anyone.
// Automatically charging a saved card on a schedule is a separate, deliberately unbuilt piece:
// it needs a payment-method-on-file flow (Paystack authorization reuse) and a scheduled job,
// both of which carry real consent/compliance weight that a pricing calculator doesn't.
const CURRENCY = "ZAR";

const PRICING = {
  emails: { label: "Emails", freeAllowance: 1000, pricePerUnitCents: 10 },
  sms: { label: "SMS", freeAllowance: 200, pricePerUnitCents: 35 },
  whatsapp: { label: "WhatsApp", freeAllowance: 200, pricePerUnitCents: 30 },
};

function calculateBill(usage = {}) {
  const lineItems = Object.entries(PRICING).map(([metric, config]) => {
    const used = Number(usage[metric] || 0);
    const billable = Math.max(0, used - config.freeAllowance);
    return {
      metric,
      label: config.label,
      used,
      freeAllowance: config.freeAllowance,
      billable,
      pricePerUnitCents: config.pricePerUnitCents,
      amountCents: billable * config.pricePerUnitCents,
    };
  });
  const totalCents = lineItems.reduce((sum, item) => sum + item.amountCents, 0);
  return { currency: CURRENCY, lineItems, totalCents };
}

module.exports = { PRICING, CURRENCY, calculateBill };

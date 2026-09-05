const crypto = require("crypto");
const {
  cleanText,
  normalizeCustomer,
  normalizeSelection,
  resolveSelectedOptions,
} = require("./commerce");

const MAX_CART_ITEMS = 20;
const MAX_CHECKOUT_TOTAL = 10000000;

// Two lines for the same offer with different variant/modifier picks are
// distinct cart lines — group by offer id *and* the requested options, not
// just the offer id, or a "Large" and a "Small" would merge into one line.
function selectionGroupKey(selection) {
  const { variant, modifiers } = selection.selectedOptions;
  return `${selection.resource}:${selection.id}:${variant}:${[...modifiers].sort().join(",")}`;
}

function normalizeCheckoutSelections(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CART_ITEMS) {
    const error = new Error(`Choose between 1 and ${MAX_CART_ITEMS} cart items.`);
    error.statusCode = 400;
    throw error;
  }
  const grouped = new Map();
  value.forEach((item) => {
    const selection = normalizeSelection(item);
    const key = selectionGroupKey(selection);
    const current = grouped.get(key);
    const quantity = (current?.quantity || 0) + selection.quantity;
    if (quantity > 99) {
      const error = new Error("A cart item cannot have more than 99 units.");
      error.statusCode = 400;
      throw error;
    }
    grouped.set(key, { ...selection, quantity });
  });
  return [...grouped.values()];
}

function buildCheckoutOrder({
  businessId,
  customerId,
  customer: customerInput,
  selections,
  offers,
  fulfilmentMethod,
  notes,
  orderId,
  now,
  clientTokenHash,
}) {
  const customer = normalizeCustomer(customerInput);
  if (!customer.email) {
    const error = new Error("Enter an email address to pay online.");
    error.statusCode = 400;
    throw error;
  }
  if (!Array.isArray(offers) || offers.length !== selections.length) {
    const error = new Error("One or more cart items are unavailable.");
    error.statusCode = 409;
    throw error;
  }
  const method = cleanText(fulfilmentMethod, 30);
  const currencies = new Set(offers.map((offer) => offer.currency));
  if (currencies.size !== 1) {
    const error = new Error("All cart items must use the same currency.");
    error.statusCode = 400;
    throw error;
  }

  const items = offers.map((offer, index) => {
    const selection = selections[index];
    if (offer.pricingMode !== "fixed" || offer.unitPrice <= 0) {
      const error = new Error(`${offer.name || "An offer"} is not available for online checkout.`);
      error.statusCode = 409;
      throw error;
    }
    if (!offer.fulfilmentMethods.includes(method)) {
      const error = new Error("Choose a fulfilment method available for every cart item.");
      error.statusCode = 400;
      throw error;
    }
    const { selectedOptions, deltaCents } = resolveSelectedOptions(offer, selection.selectedOptions);
    const unitPrice = offer.unitPrice + deltaCents;
    return {
      offerId: offer.offerId,
      sourceResource: offer.sourceResource,
      sourceId: offer.sourceId,
      offerType: offer.offerType,
      name: offer.name,
      quantity: selection.quantity,
      selectedOptions,
      pricingMode: offer.pricingMode,
      unitPrice,
      lineTotal: unitPrice * selection.quantity,
      currency: offer.currency,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  if (subtotal < 1 || subtotal > MAX_CHECKOUT_TOTAL) {
    const error = new Error("The cart total is outside the supported checkout range.");
    error.statusCode = 400;
    throw error;
  }
  const currency = offers[0].currency;

  return {
    schemaVersion: 2,
    businessId,
    customerId,
    // sha256 of the customer's order-tracker token (the checkout clientSecret is
    // reused as that token). The raw token is never stored.
    ...(clientTokenHash ? { clientTokenHash: String(clientTokenHash) } : {}),
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    publicReference: `WEB-${String(orderId).slice(0, 8).toUpperCase()}`,
    orderType: "paid_order",
    items,
    pricingSnapshot: {
      status: "calculated",
      subtotal,
      fees: [],
      total: subtotal,
      currency,
    },
    total: subtotal,
    currency,
    fulfilment: {
      method,
      status: "requested",
      requestedStartTime: "",
    },
    payment: {
      status: "pending",
      provider: "paystack",
      amount: subtotal,
      currency,
      reference: null,
    },
    paymentStatus: "pending",
    status: "awaiting_payment",
    notes: cleanText(notes, 1500),
    source: "website",
    notificationMode: "order",
    createdAt: now,
    updatedAt: now,
  };
}

function checkoutSecret() {
  return crypto.randomBytes(24).toString("base64url");
}

function hashCheckoutSecret(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function validIdempotencyKey(value) {
  return /^[A-Za-z0-9_-]{16,80}$/.test(String(value || ""));
}

function validCommercePayment(data = {}, session = {}, order = {}) {
  return (
    data.status === "success" &&
    String(data.reference || "") === session.paymentReference &&
    String(data.reference || "") === order.payment?.reference &&
    Number(data.amount) === Number(session.amount) &&
    data.currency === session.currency
  );
}

module.exports = {
  MAX_CART_ITEMS,
  MAX_CHECKOUT_TOTAL,
  buildCheckoutOrder,
  checkoutSecret,
  hashCheckoutSecret,
  normalizeCheckoutSelections,
  validCommercePayment,
  validIdempotencyKey,
};

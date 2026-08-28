const crypto = require("crypto");

const OFFER_RESOURCES = new Set(["offers", "products", "services"]);
const FULFILMENT_METHODS = new Set(["pickup", "delivery", "booking", "digital", "quote"]);
const PRICING_MODES = new Set(["fixed", "starting_from", "quote", "free"]);

function cleanText(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeQuantity(value) {
  const quantity = Number(value || 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    const error = new Error("Choose a quantity between 1 and 99.");
    error.statusCode = 400;
    throw error;
  }
  return quantity;
}

function normalizeCustomer(value = {}) {
  const customer = {
    name: cleanText(value.name, 120),
    email: cleanText(value.email, 254).toLowerCase(),
    phone: cleanText(value.phone, 40),
  };
  if (!customer.name || !customer.phone) {
    const error = new Error("Enter your name and phone number.");
    error.statusCode = 400;
    throw error;
  }
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    const error = new Error("Enter a valid email address.");
    error.statusCode = 400;
    throw error;
  }
  return customer;
}

function normalizeSelection(value = {}) {
  const resource = cleanText(value.resource, 20);
  const id = cleanText(value.id, 160);
  if (!OFFER_RESOURCES.has(resource) || !id) {
    const error = new Error("Choose an available offer.");
    error.statusCode = 400;
    throw error;
  }
  return { resource, id, quantity: normalizeQuantity(value.quantity) };
}

function offerSnapshot(resource, id, data = {}) {
  const offerType = cleanText(
    data.offerType || (resource === "services" ? "service" : "product"),
    30
  );
  const pricingMode = PRICING_MODES.has(data.pricingMode)
    ? data.pricingMode
    : "fixed";
  const unitPrice = pricingMode === "free" || pricingMode === "quote"
    ? 0
    : Math.max(0, Math.round(Number(data.price || 0)));
  const fulfilmentMethods = Array.isArray(data.fulfilmentMethods)
    ? data.fulfilmentMethods.filter((method) => FULFILMENT_METHODS.has(method))
    : [];
  const fallbackMethod = offerType === "service" ? "booking" : "pickup";

  return {
    offerId: resource === "offers" ? id : null,
    sourceResource: resource,
    sourceId: id,
    offerType,
    name: cleanText(data.name, 160),
    description: cleanText(data.description, 500),
    pricingMode,
    unitPrice,
    currency: cleanText(data.currency || "ZAR", 3).toUpperCase(),
    fulfilmentMethods: fulfilmentMethods.length ? fulfilmentMethods : [fallbackMethod],
    durationMinutes: Math.max(0, Math.round(Number(data.durationMinutes || 0))),
  };
}

function buildOrder({
  businessId,
  customerId,
  customer,
  selection,
  offer,
  fulfilmentMethod,
  requestedStartTime,
  notes,
  orderId,
  now,
  clientTokenHash,
}) {
  if (!offer.name) {
    const error = new Error("This offer is unavailable.");
    error.statusCode = 409;
    throw error;
  }
  const method = FULFILMENT_METHODS.has(fulfilmentMethod)
    ? fulfilmentMethod
    : offer.fulfilmentMethods[0];
  if (!offer.fulfilmentMethods.includes(method)) {
    const error = new Error("Choose an available fulfilment method.");
    error.statusCode = 400;
    throw error;
  }
  if (method === "booking" && !cleanText(requestedStartTime, 80)) {
    const error = new Error("Choose a preferred booking date and time.");
    error.statusCode = 400;
    throw error;
  }

  const lineTotal = offer.unitPrice * selection.quantity;
  const quoteRequired = offer.pricingMode === "quote";
  const orderType = method === "booking"
    ? "booking_request"
    : quoteRequired || method === "quote"
      ? "quote_request"
      : "order_request";
  const publicReference = `WEB-${String(orderId).slice(0, 8).toUpperCase()}`;

  return {
    schemaVersion: 2,
    businessId,
    customerId,
    // sha256 of the customer's order-tracker token. Absent for orders created
    // without a tracker (e.g. manual captures). The raw token is never stored.
    ...(clientTokenHash ? { clientTokenHash: String(clientTokenHash) } : {}),
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    publicReference,
    orderType,
    items: [{
      offerId: offer.offerId,
      sourceResource: offer.sourceResource,
      sourceId: offer.sourceId,
      offerType: offer.offerType,
      name: offer.name,
      quantity: selection.quantity,
      selectedOptions: [],
      pricingMode: offer.pricingMode,
      unitPrice: offer.unitPrice,
      lineTotal,
      currency: offer.currency,
    }],
    pricingSnapshot: {
      status: quoteRequired ? "quote_required" : "calculated",
      subtotal: lineTotal,
      fees: [],
      total: lineTotal,
      currency: offer.currency,
    },
    total: lineTotal,
    currency: offer.currency,
    fulfilment: {
      method,
      status: "requested",
      requestedStartTime: cleanText(requestedStartTime, 80),
    },
    payment: {
      status: "not_required",
      provider: null,
      amount: 0,
      currency: offer.currency,
    },
    paymentStatus: "not_required",
    status: "requested",
    notes: cleanText(notes, 1500),
    source: "website",
    createdAt: now,
    updatedAt: now,
  };
}

function requestFingerprint(ip, userAgent = "") {
  return crypto
    .createHash("sha256")
    .update(`${cleanText(ip, 120)}|${cleanText(userAgent, 300)}`)
    .digest("hex");
}

module.exports = {
  OFFER_RESOURCES,
  buildOrder,
  cleanText,
  normalizeCustomer,
  normalizeQuantity,
  normalizeSelection,
  offerSnapshot,
  requestFingerprint,
};

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

// Client-declared choices, before they're checked against the offer. Shape:
// { variant?: string, modifiers?: string[] }. Resolved into priced entries by
// resolveSelectedOptions() once the authoritative offer is loaded.
function normalizeRawSelectedOptions(value = {}) {
  return {
    variant: typeof value?.variant === "string" ? cleanText(value.variant, 60) : "",
    modifiers: Array.isArray(value?.modifiers)
      ? [...new Set(value.modifiers.slice(0, 20).map((label) => cleanText(label, 60)).filter(Boolean))]
      : [],
  };
}

function normalizeSelection(value = {}) {
  const resource = cleanText(value.resource, 20);
  const id = cleanText(value.id, 160);
  if (!OFFER_RESOURCES.has(resource) || !id) {
    const error = new Error("Choose an available offer.");
    error.statusCode = 400;
    throw error;
  }
  return {
    resource,
    id,
    quantity: normalizeQuantity(value.quantity),
    selectedOptions: normalizeRawSelectedOptions(value.selectedOptions),
  };
}

function sanitizeVariants(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => entry && cleanText(entry.label, 60))
    .slice(0, 12)
    .map((entry) => ({
      label: cleanText(entry.label, 60),
      priceDeltaCents: Math.round(Number(entry.priceDeltaCents || 0)),
    }));
}

function sanitizeModifierGroups(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((group) => group && cleanText(group.name, 60))
    .slice(0, 8)
    .map((group) => {
      const options = Array.isArray(group.options)
        ? group.options
          .filter((option) => option && cleanText(option.label, 60))
          .slice(0, 20)
          .map((option) => ({
            label: cleanText(option.label, 60),
            priceCents: Math.max(0, Math.round(Number(option.priceCents || 0))),
          }))
        : [];
      const min = Math.max(0, Math.round(Number(group.min || 0)));
      const max = Math.min(options.length, Math.max(min, Math.round(Number(group.max || options.length))));
      return { name: cleanText(group.name, 60), min, max, options };
    })
    .filter((group) => group.options.length > 0);
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
  const stockCount = Number.isFinite(Number(data.stockCount))
    ? Math.max(0, Math.round(Number(data.stockCount)))
    : null;

  return {
    offerId: resource === "offers" ? id : null,
    sourceResource: resource,
    sourceId: id,
    offerType,
    name: cleanText(data.name, 160),
    description: cleanText(data.description, 500),
    category: cleanText(data.category, 60) || null,
    pricingMode,
    unitPrice,
    currency: cleanText(data.currency || "ZAR", 3).toUpperCase(),
    fulfilmentMethods: fulfilmentMethods.length ? fulfilmentMethods : [fallbackMethod],
    durationMinutes: Math.max(0, Math.round(Number(data.durationMinutes || 0))),
    variants: sanitizeVariants(data.variants),
    modifierGroups: sanitizeModifierGroups(data.modifierGroups),
    prepMinutes: Math.max(0, Math.round(Number(data.prepMinutes || 0))) || null,
    available: data.available !== false,
    stockCount,
  };
}

// Resolves a customer's raw variant/modifier picks against the authoritative
// offer, pricing each choice server-side. The browser only ever sends labels
// — never prices — and unknown labels or min/max violations are rejected.
function resolveSelectedOptions(offer, rawSelection = {}) {
  const { variant: variantLabel, modifiers: modifierLabels } = normalizeRawSelectedOptions(rawSelection);
  const chosen = [];
  let deltaCents = 0;

  if (offer.variants.length > 0) {
    if (!variantLabel) {
      const error = new Error(`Choose an option for ${offer.name || "this item"}.`);
      error.statusCode = 400;
      throw error;
    }
    const variant = offer.variants.find((entry) => entry.label === variantLabel);
    if (!variant) {
      const error = new Error("Choose an available option.");
      error.statusCode = 400;
      throw error;
    }
    chosen.push({ type: "variant", label: variant.label, priceCents: variant.priceDeltaCents });
    deltaCents += variant.priceDeltaCents;
  } else if (variantLabel) {
    const error = new Error("This item does not have size or variant options.");
    error.statusCode = 400;
    throw error;
  }

  const claimed = new Set();
  offer.modifierGroups.forEach((group) => {
    const groupLabels = new Set(group.options.map((option) => option.label));
    const picked = modifierLabels.filter((label) => groupLabels.has(label));
    picked.forEach((label) => claimed.add(label));
    if (picked.length < group.min || picked.length > group.max) {
      const error = new Error(
        group.min === group.max
          ? `Choose ${group.min} option${group.min === 1 ? "" : "s"} for ${group.name}.`
          : `Choose between ${group.min} and ${group.max} options for ${group.name}.`
      );
      error.statusCode = 400;
      throw error;
    }
    picked.forEach((label) => {
      const option = group.options.find((entry) => entry.label === label);
      chosen.push({ type: "modifier", groupName: group.name, label: option.label, priceCents: option.priceCents });
      deltaCents += option.priceCents;
    });
  });

  const unknown = modifierLabels.filter((label) => !claimed.has(label));
  if (unknown.length > 0) {
    const error = new Error("Choose only add-ons this item actually offers.");
    error.statusCode = 400;
    throw error;
  }

  return { selectedOptions: chosen, deltaCents };
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

  const { selectedOptions, deltaCents } = resolveSelectedOptions(offer, selection.selectedOptions);
  const unitPrice = offer.unitPrice + deltaCents;
  const lineTotal = unitPrice * selection.quantity;
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
      selectedOptions,
      pricingMode: offer.pricingMode,
      unitPrice,
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
  resolveSelectedOptions,
};

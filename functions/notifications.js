function money(cents) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(Number(cents || 0) / 100);
}

function clean(value, fallback = "") {
  return String(value || fallback).trim();
}

function welcomeEmail(account = {}) {
  return {
    subject: "Welcome to Webilo",
    body: [
      "Welcome to Webilo.",
      "",
      "Your business workspace is ready. Start by adding or confirming your business profile, then Webilo will guide you through your offer, customer tools, and website.",
      "",
      "Open your workspace: https://smart-shop-bb140.web.app/business",
      "",
      "— Webilo",
    ].join("\n"),
    to: clean(account.email),
  };
}

function orderCreatedEmails(business, order) {
  const businessName = clean(business.name, "Your business");
  const customerName = clean(order.customerName, "Customer");
  const items = Array.isArray(order.items) && order.items.length
    ? order.items.map((item) => `${Number(item.quantity || 1)} × ${clean(item.name, "Item")}`).join(", ")
    : "Order details are available in Webilo";
  const total = money(order.total);

  return {
    owner: {
      subject: `New order for ${businessName}`,
      body: [
        `${customerName} placed a new order.`,
        "",
        `Items: ${items}`,
        `Total: ${total}`,
        order.customerPhone ? `Phone: ${order.customerPhone}` : "",
        "",
        "Open Webilo to accept or process the order:",
        "https://smart-shop-bb140.web.app/business?tab=orders",
      ].filter(Boolean).join("\n"),
      replyTo: clean(order.customerEmail),
    },
    customer: {
      to: clean(order.customerEmail),
      subject: `Order received by ${businessName}`,
      body: [
        `Hi ${customerName},`,
        "",
        `${businessName} received your order.`,
        `Items: ${items}`,
        `Total: ${total}`,
        "",
        "The business will contact you if anything needs clarification. You will receive another email when the order status changes.",
        "",
        `Reply to this email to contact ${businessName}.`,
      ].join("\n"),
      replyTo: clean(business.email),
    },
  };
}

function orderStatusEmail(business, order) {
  const businessName = clean(business.name, "The business");
  const customerName = clean(order.customerName, "there");
  const status = clean(order.status, "updated");
  const statusCopy = {
    confirmed: "Your order has been accepted and is being processed.",
    processing: "Your order is now being prepared.",
    completed: "Your order has been marked as completed.",
    cancelled: "Your order has been cancelled. Reply to this email if you need clarification.",
  }[status] || `Your order status is now ${status}.`;
  return {
    to: clean(order.customerEmail),
    subject: `Order ${status} — ${businessName}`,
    body: [
      `Hi ${customerName},`,
      "",
      statusCopy,
      `Total: ${money(order.total)}`,
      "",
      `Reply to this email to contact ${businessName}.`,
    ].join("\n"),
    replyTo: clean(business.email),
  };
}

function bookingCreatedEmails(business, booking) {
  const businessName = clean(business.name, "Your business");
  const customerName = clean(booking.customerName, "Customer");
  const serviceName = clean(booking.serviceName, "Service");
  const requestedTime = clean(booking.startTime, "To be arranged");
  return {
    owner: {
      subject: `New booking request for ${businessName}`,
      body: [
        `${customerName} requested a booking.`,
        "",
        `Service: ${serviceName}`,
        `Requested time: ${requestedTime}`,
        booking.customerPhone ? `Phone: ${booking.customerPhone}` : "",
        "",
        "Open Webilo to confirm or manage the booking:",
        "https://smart-shop-bb140.web.app/business?tab=bookings",
      ].filter(Boolean).join("\n"),
      replyTo: clean(booking.customerEmail),
    },
    customer: {
      to: clean(booking.customerEmail),
      subject: `Booking request received by ${businessName}`,
      body: [
        `Hi ${customerName},`,
        "",
        `${businessName} received your booking request.`,
        `Service: ${serviceName}`,
        `Requested time: ${requestedTime}`,
        "",
        "This is a request, not a confirmed appointment. You will receive another email when the business confirms or updates it.",
        "",
        `Reply to this email to contact ${businessName}.`,
      ].join("\n"),
      replyTo: clean(business.email),
    },
  };
}

function bookingStatusEmail(business, booking) {
  const businessName = clean(business.name, "The business");
  const customerName = clean(booking.customerName, "there");
  const status = clean(booking.status, "updated");
  const statusCopy = {
    confirmed: "Your booking has been confirmed.",
    completed: "Your booking has been marked as completed.",
    cancelled: "Your booking has been cancelled. Reply to this email if you need clarification.",
  }[status] || `Your booking status is now ${status}.`;
  return {
    to: clean(booking.customerEmail),
    subject: `Booking ${status} — ${businessName}`,
    body: [
      `Hi ${customerName},`,
      "",
      statusCopy,
      `Service: ${clean(booking.serviceName, "Service")}`,
      `Time: ${clean(booking.startTime, "To be arranged")}`,
      "",
      `Reply to this email to contact ${businessName}.`,
    ].join("\n"),
    replyTo: clean(business.email),
  };
}

module.exports = {
  bookingCreatedEmails,
  bookingStatusEmail,
  orderCreatedEmails,
  orderStatusEmail,
  welcomeEmail,
};

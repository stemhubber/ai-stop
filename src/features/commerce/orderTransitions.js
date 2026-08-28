// Shared order-status pipeline. Imported by both the generic Orders admin
// (src/components/product/ResourceManager.jsx) and the food KitchenBoard so the
// two UIs always agree on what "advance this order" means.
//
// Canonical statuses (see firestore.rules validOrderStatusTransition):
//   requested | pending -> confirmed -> processing -> ready
//     -> out_for_delivery (delivery only) -> completed
//   any open status -> cancelled
// "pending" is the legacy pre-schemaVersion-2 alias for "requested"; the rules
// don't constrain it, so its transition is defined here in code only.

export const OPEN_ORDER_STATUSES = [
  "requested",
  "pending",
  "confirmed",
  "processing",
  "ready",
  "out_for_delivery",
];

export const TERMINAL_ORDER_STATUSES = ["completed", "cancelled"];

// Left-to-right board columns. "New" merges requested + legacy pending.
export const KITCHEN_COLUMNS = [
  { key: "new", label: "New", statuses: ["requested", "pending"] },
  { key: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
  { key: "processing", label: "Preparing", statuses: ["processing"] },
  { key: "ready", label: "Ready", statuses: ["ready"] },
  { key: "out_for_delivery", label: "Out for delivery", statuses: ["out_for_delivery"] },
];

const isDelivery = (order) => order?.fulfilment?.method === "delivery";

// The single "advance" action for an order, or null when nothing follows.
export function nextOrderStep(order) {
  switch (order?.status) {
    case "requested":
    case "pending":
      return { status: "confirmed", label: "Accept order" };
    case "confirmed":
      return { status: "processing", label: "Start preparing" };
    case "processing":
      return { status: "ready", label: "Mark ready" };
    case "ready":
      return isDelivery(order)
        ? { status: "out_for_delivery", label: "Out for delivery" }
        : { status: "completed", label: "Mark collected" };
    case "out_for_delivery":
      return { status: "completed", label: "Mark delivered" };
    default:
      return null;
  }
}

export const canCancelOrder = (status) => !TERMINAL_ORDER_STATUSES.includes(status);

import {
  KITCHEN_COLUMNS,
  OPEN_ORDER_STATUSES,
  canCancelOrder,
  nextOrderStep,
} from "./orderTransitions";

test("advances a pickup order through the kitchen pipeline", () => {
  const pickup = { fulfilment: { method: "pickup" } };
  expect(nextOrderStep({ ...pickup, status: "requested" })).toEqual({ status: "confirmed", label: "Accept order" });
  expect(nextOrderStep({ ...pickup, status: "pending" })).toEqual({ status: "confirmed", label: "Accept order" });
  expect(nextOrderStep({ ...pickup, status: "confirmed" })).toEqual({ status: "processing", label: "Start preparing" });
  expect(nextOrderStep({ ...pickup, status: "processing" })).toEqual({ status: "ready", label: "Mark ready" });
  expect(nextOrderStep({ ...pickup, status: "ready" })).toEqual({ status: "completed", label: "Mark collected" });
});

test("a ready delivery order goes out for delivery before completing", () => {
  const delivery = { fulfilment: { method: "delivery" } };
  expect(nextOrderStep({ ...delivery, status: "ready" })).toEqual({ status: "out_for_delivery", label: "Out for delivery" });
  expect(nextOrderStep({ ...delivery, status: "out_for_delivery" })).toEqual({ status: "completed", label: "Mark delivered" });
});

test("terminal and unknown statuses have no next step", () => {
  expect(nextOrderStep({ status: "completed" })).toBeNull();
  expect(nextOrderStep({ status: "cancelled" })).toBeNull();
  expect(nextOrderStep({ status: "awaiting_payment" })).toBeNull();
  expect(nextOrderStep(undefined)).toBeNull();
});

test("only open orders can be cancelled", () => {
  expect(canCancelOrder("processing")).toBe(true);
  expect(canCancelOrder("ready")).toBe(true);
  expect(canCancelOrder("completed")).toBe(false);
  expect(canCancelOrder("cancelled")).toBe(false);
});

test("every kitchen column status is an open order status", () => {
  const columnStatuses = KITCHEN_COLUMNS.flatMap((column) => column.statuses);
  columnStatuses.forEach((status) => expect(OPEN_ORDER_STATUSES).toContain(status));
});

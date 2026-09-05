import { act, render, renderHook, screen } from "@testing-library/react";
import { PrintSurface, usePrintTicket } from "./PrintableTicket";

const order = {
  publicReference: "WEB-ABCD1234",
  createdAt: "2026-01-01T10:00:00.000Z",
  status: "confirmed",
  fulfilment: { method: "pickup" },
  customerName: "Naledi",
  customerPhone: "0712345678",
  currency: "ZAR",
  total: 22000,
  notes: "No onions please",
  items: [{
    name: "Burger",
    quantity: 2,
    unitPrice: 11000,
    lineTotal: 22000,
    selectedOptions: [
      { type: "variant", label: "Large", priceCents: 2000 },
      { type: "modifier", groupName: "Extras", label: "Cheese", priceCents: 1000 },
    ],
  }],
};
const business = { name: "Kasi Kitchen", phone: "0119876543", address: { city: "Soweto" } };

beforeEach(() => {
  window.print = jest.fn();
});

test("printing a ticket portals it to document.body and triggers window.print", () => {
  render(<PrintSurface />);
  const { result } = renderHook(() => usePrintTicket());

  act(() => result.current(order, business, "kitchen"));

  expect(window.print).toHaveBeenCalledTimes(1);
  expect(screen.getByText("WEB-ABCD1234")).toBeInTheDocument();
  expect(screen.getByText("Burger")).toBeInTheDocument();
  expect(screen.getByText(/Large/)).toBeInTheDocument();
  expect(screen.getByText(/Cheese/)).toBeInTheDocument();
});

test("a receipt shows prices and a total; a kitchen ticket does not", () => {
  render(<PrintSurface />);
  const { result } = renderHook(() => usePrintTicket());

  act(() => result.current(order, business, "receipt"));
  expect(screen.getByText("Total")).toBeInTheDocument();

  act(() => window.dispatchEvent(new Event("afterprint")));
  act(() => result.current(order, business, "kitchen"));
  expect(screen.queryByText("Total")).not.toBeInTheDocument();
});

test("clears the printed ticket after the browser reports afterprint", () => {
  render(<PrintSurface />);
  const { result } = renderHook(() => usePrintTicket());

  act(() => result.current(order, business, "kitchen"));
  expect(screen.getByText("WEB-ABCD1234")).toBeInTheDocument();

  act(() => window.dispatchEvent(new Event("afterprint")));
  expect(screen.queryByText("WEB-ABCD1234")).not.toBeInTheDocument();
});

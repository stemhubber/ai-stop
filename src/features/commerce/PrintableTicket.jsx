import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { requestPrint, setPrintListener } from "./printBus";
import "./print.css";

const money = (cents, currency = "ZAR") =>
  cents == null
    ? ""
    : new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(Number(cents) / 100);

function formatWhen(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "";
}

function optionLabel(option) {
  return option.priceCents
    ? `${option.label} (+${money(option.priceCents)})`
    : option.label;
}

// Mounted once (in ProductWorkspace) so a kitchen card or an order row can
// trigger a print without every ancestor threading a callback down. See
// usePrintTicket() below and printBus.js.
export function PrintSurface() {
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    setPrintListener(setPayload);
    return () => setPrintListener(null);
  }, []);

  useEffect(() => {
    if (!payload) return undefined;
    window.print();
    const clear = () => setPayload(null);
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, [payload]);

  if (!payload) return null;
  return createPortal(
    <PrintableTicket order={payload.order} business={payload.business} variant={payload.variant} />,
    document.body
  );
}

export function usePrintTicket() {
  return useCallback((order, business, variant = "kitchen") => {
    requestPrint({ order, business, variant });
  }, []);
}

// order ref, time, items + chosen variant/modifiers, notes, fulfilment —
// everything a kitchen or a customer needs on paper. `variant="receipt"`
// additionally shows prices and a total; `variant="kitchen"` keeps it terse
// and puts notes front and centre (allergies, special requests).
function PrintableTicket({ order, business, variant = "kitchen" }) {
  if (!order) return null;
  const isReceipt = variant === "receipt";
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="print-ticket">
      <header className="print-ticket-header">
        <strong>{business?.name || "Webilo"}</strong>
        {isReceipt && business?.phone && <span>{business.phone}</span>}
        {isReceipt && business?.address?.city && <span>{business.address.city}</span>}
      </header>

      <div className="print-ticket-meta">
        <span className="print-ticket-ref">{order.publicReference || ""}</span>
        <span>{formatWhen(order.createdAt)}</span>
      </div>

      <div className="print-ticket-meta">
        <span>{(order.fulfilment?.method || "pickup").toUpperCase()}</span>
        {order.fulfilment?.requestedStartTime && <span>{order.fulfilment.requestedStartTime}</span>}
      </div>

      {(order.customerName || order.customerPhone) && (
        <div className="print-ticket-meta">
          <span>{order.customerName}</span>
          <span>{order.customerPhone}</span>
        </div>
      )}

      <table className="print-ticket-items">
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td className="print-ticket-qty">{item.quantity || 1}&times;</td>
              <td>
                {item.name}
                {item.selectedOptions?.length > 0 && (
                  <div className="print-ticket-options">
                    {item.selectedOptions.map((option, optionIndex) => (
                      <div key={optionIndex}>{optionLabel(option)}</div>
                    ))}
                  </div>
                )}
              </td>
              {isReceipt && <td className="print-ticket-amount">{money(item.lineTotal, item.currency || order.currency)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {isReceipt && (
        <div className="print-ticket-total">
          <span>Total</span>
          <strong>{money(order.total, order.currency)}</strong>
        </div>
      )}

      {order.notes && (
        <div className="print-ticket-notes">
          <strong>Notes:</strong> {order.notes}
        </div>
      )}

      {isReceipt && <footer className="print-ticket-footer">Thank you for your order.</footer>}
    </div>
  );
}

export default PrintableTicket;

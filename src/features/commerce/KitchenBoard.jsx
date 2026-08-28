import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  limit,
  orderBy,
  subscribeRecords,
  updateRecord,
  where,
} from "../../services/businessRepository";
import { sendMessage } from "../../services/messagingService";
import { Icon } from "../websites/components/WebiloUI";
import {
  KITCHEN_COLUMNS,
  OPEN_ORDER_STATUSES,
  canCancelOrder,
  nextOrderStep,
} from "./orderTransitions";
import { useKitchenSound } from "./useKitchenSound";
import "./kitchen.css";

const money = (cents) =>
  cents == null
    ? ""
    : new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);

function toDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function elapsedLabel(createdAt, now) {
  const date = toDate(createdAt);
  if (!date) return "";
  const minutes = Math.max(0, Math.round((now - date.getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function orderSummaryText(order, businessName) {
  const items = (order.items || [])
    .map((item) => `${item.quantity || 1} x ${item.name}`)
    .join(", ");
  return `${businessName}: order ${order.publicReference || ""} is now "${order.status}". ${items}`.trim();
}

export default function KitchenBoard({ businessId, business }) {
  const [orders, setOrders] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [messageState, setMessageState] = useState({});
  const [now, setNow] = useState(() => Date.now());
  const seenRef = useRef(null);
  const { soundEnabled, enableSound, disableSound, playNewOrder, playReady } = useKitchenSound();
  // Keep the latest cue callbacks in a ref so toggling sound doesn't tear down
  // and rebuild the Firestore subscription.
  const cuesRef = useRef({ playNewOrder, playReady });
  cuesRef.current = { playNewOrder, playReady };

  useEffect(() => {
    setState("loading");
    seenRef.current = null;
    const unsubscribe = subscribeRecords(
      businessId,
      "orders",
      [
        where("status", "in", OPEN_ORDER_STATUSES),
        orderBy("createdAt", "desc"),
        limit(100),
      ],
      (records, changes) => {
        setOrders(records);
        setState("ready");
        setError("");
        if (seenRef.current === null) {
          // First snapshot — prime the "seen" set without firing a cue.
          seenRef.current = new Set(records.map((record) => record.id));
          return;
        }
        changes.forEach((change) => {
          if (change.type === "added" && !seenRef.current.has(change.doc.id)) {
            cuesRef.current.playNewOrder();
          }
          if (change.type === "modified" && change.doc.data().status === "ready") {
            cuesRef.current.playReady();
          }
          seenRef.current.add(change.doc.id);
        });
      },
      (err) => {
        setError(err?.message || "The kitchen board lost its connection. Refresh to reconnect.");
        setState("error");
      }
    );
    return unsubscribe;
  }, [businessId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const columns = useMemo(
    () =>
      KITCHEN_COLUMNS.map((column) => ({
        ...column,
        orders: orders
          .filter((order) => column.statuses.includes(order.status))
          .sort((a, b) => (toDate(a.createdAt)?.getTime() || 0) - (toDate(b.createdAt)?.getTime() || 0)),
      })),
    [orders]
  );

  const advance = useCallback(
    async (order) => {
      const step = nextOrderStep(order);
      if (!step) return;
      setPendingId(order.id);
      setError("");
      try {
        await updateRecord(businessId, "orders", order.id, { status: step.status });
      } catch (err) {
        setError(err?.message || "That status change was rejected. Refresh and try again.");
      } finally {
        setPendingId("");
      }
    },
    [businessId]
  );

  const cancel = useCallback(
    async (order) => {
      if (!window.confirm(`Cancel order ${order.publicReference || ""}?`)) return;
      setPendingId(order.id);
      setError("");
      try {
        await updateRecord(businessId, "orders", order.id, { status: "cancelled" });
      } catch (err) {
        setError(err?.message || "That order could not be cancelled.");
      } finally {
        setPendingId("");
      }
    },
    [businessId]
  );

  const notifyCustomer = useCallback(
    async (order) => {
      if (!order.customerPhone) return;
      setMessageState((current) => ({ ...current, [order.id]: "sending" }));
      try {
        await sendMessage({
          businessId,
          channel: "sms",
          to: order.customerPhone,
          body: orderSummaryText(order, business?.name || "Your order"),
        });
        setMessageState((current) => ({ ...current, [order.id]: "sent" }));
      } catch {
        setMessageState((current) => ({ ...current, [order.id]: "failed" }));
      }
    },
    [businessId, business]
  );

  return (
    <section className="kitchen-board">
      <header className="kitchen-board-bar">
        <div>
          <span className="wl-eyebrow">Live service</span>
          <h2>Kitchen board</h2>
          <p>Orders stream in as they are placed. Tap a card to move it to the next stage.</p>
        </div>
        <div className="kitchen-board-controls">
          {soundEnabled ? (
            <button className="wb-btn" onClick={disableSound}>
              <Icon name="check" size={16} /> Sound on
            </button>
          ) : (
            <button className="wb-btn wb-btn-primary" onClick={enableSound}>
              Enable sound
            </button>
          )}
        </div>
      </header>

      {error && (
        <p className="product-feedback product-feedback--error" role="alert">
          <Icon name="settings" size={16} /> {error}
        </p>
      )}

      {state === "loading" ? (
        <div className="wb-skeleton kitchen-board-skeleton" />
      ) : (
        <div className="kitchen-columns">
          {columns.map((column) => (
            <div className="kitchen-column" key={column.key}>
              <div className="kitchen-column-head">
                <span>{column.label}</span>
                <em>{column.orders.length}</em>
              </div>
              <div className="kitchen-column-body">
                {column.orders.length === 0 ? (
                  <p className="kitchen-column-empty">Nothing here</p>
                ) : (
                  column.orders.map((order) => {
                    const step = nextOrderStep(order);
                    const busy = pendingId === order.id;
                    const lineCount = (order.items || []).length;
                    return (
                      <article className="kitchen-card" key={order.id}>
                        <div className="kitchen-card-top">
                          <strong>{order.publicReference || order.id.slice(0, 6).toUpperCase()}</strong>
                          <span className="kitchen-card-age">
                            <Icon name="clock" size={13} /> {elapsedLabel(order.createdAt, now)}
                          </span>
                        </div>
                        <ul className="kitchen-card-items">
                          {(order.items || []).map((item, index) => (
                            <li key={index}>
                              <span>{item.quantity || 1}&times;</span> {item.name}
                            </li>
                          ))}
                        </ul>
                        <div className="kitchen-card-meta">
                          <span>{lineCount} {lineCount === 1 ? "line" : "lines"}</span>
                          {order.fulfilment?.method && <span>{order.fulfilment.method}</span>}
                          {order.total != null && <span>{money(order.total)}</span>}
                        </div>
                        {order.fulfilment?.requestedStartTime && (
                          <p className="kitchen-card-when">For {order.fulfilment.requestedStartTime}</p>
                        )}
                        {order.notes && <p className="kitchen-card-notes">{order.notes}</p>}
                        <div className="kitchen-card-actions">
                          {step && (
                            <button
                              className="wb-btn wb-btn-primary wb-btn-sm"
                              disabled={busy}
                              onClick={() => advance(order)}
                            >
                              {busy ? "…" : step.label} <Icon name="arrow" size={14} />
                            </button>
                          )}
                          {order.customerPhone && (
                            <button
                              className="wb-btn wb-btn-sm"
                              disabled={messageState[order.id] === "sending"}
                              onClick={() => notifyCustomer(order)}
                            >
                              {messageState[order.id] === "sent"
                                ? "Texted"
                                : messageState[order.id] === "failed"
                                  ? "Retry text"
                                  : "Text customer"}
                            </button>
                          )}
                          {order.customerPhone && (
                            <a
                              className="wb-btn wb-btn-sm wb-btn-ghost"
                              href={`https://wa.me/${String(order.customerPhone).replace(/[^\d]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              WhatsApp
                            </a>
                          )}
                          {canCancelOrder(order.status) && (
                            <button
                              className="wb-btn wb-btn-sm wb-btn-ghost kitchen-cancel"
                              disabled={busy}
                              onClick={() => cancel(order)}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

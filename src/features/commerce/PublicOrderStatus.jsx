import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getPublicOrderStatus } from "../../services/commerceService";
import WebiloAnimatedLogo from "../../components/WebiloAnimatedLogo";
import "./orderStatus.css";

const STEPPERS = {
  pickup: [
    { label: "Received", match: ["requested", "pending"] },
    { label: "Confirmed", match: ["confirmed"] },
    { label: "Preparing", match: ["processing"] },
    { label: "Ready for collection", match: ["ready"] },
    { label: "Completed", match: ["completed"] },
  ],
  delivery: [
    { label: "Received", match: ["requested", "pending"] },
    { label: "Confirmed", match: ["confirmed"] },
    { label: "Preparing", match: ["processing"] },
    { label: "Ready", match: ["ready"] },
    { label: "On the way", match: ["out_for_delivery"] },
    { label: "Delivered", match: ["completed"] },
  ],
};

const TERMINAL = ["completed", "cancelled"];
const money = (cents, currency = "ZAR") =>
  cents == null
    ? ""
    : new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(Number(cents) / 100);

function stepIndex(steps, status) {
  if (status === "completed") return steps.length - 1;
  const found = steps.findIndex((step) => step.match.includes(status));
  return found === -1 ? 0 : found;
}

export default function PublicOrderStatus() {
  const { slug, publicReference } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t") || "";
  const [order, setOrder] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const attemptsRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!slug || !publicReference || !token) {
      setState("error");
      setError("This tracking link is incomplete.");
      return null;
    }
    try {
      const result = await getPublicOrderStatus({ slug, publicReference, token });
      setOrder(result);
      setState(result.status === "cancelled" ? "cancelled" : "ready");
      return result;
    } catch (lookupError) {
      setState("error");
      setError(lookupError.message || "We could not find this order.");
      return null;
    }
  }, [slug, publicReference, token]);

  useEffect(() => {
    let cancelled = false;
    let timeout;
    const poll = async () => {
      const result = await refresh();
      if (cancelled || !result || TERMINAL.includes(result.status)) return;
      attemptsRef.current += 1;
      if (attemptsRef.current < 40) timeout = window.setTimeout(poll, 8000);
    };
    poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [refresh]);

  const steps = STEPPERS[order?.fulfilmentMethod === "delivery" ? "delivery" : "pickup"];
  const activeIndex = order ? stepIndex(steps, order.status) : 0;

  return (
    <main className="order-status">
      <WebiloAnimatedLogo size={58} showWordmark />

      {state === "loading" && (
        <section className="order-status__card">
          <h1>Finding your order…</h1>
        </section>
      )}

      {state === "error" && (
        <section className="order-status__card">
          <h1>We could not find this order</h1>
          <p>{error}</p>
          <button className="wb-btn" onClick={refresh}>Try again</button>
        </section>
      )}

      {state === "cancelled" && order && (
        <section className="order-status__card">
          <span className="order-status__badge order-status__badge--cancelled">Cancelled</span>
          <h1>Order {order.publicReference}</h1>
          <p>This order was cancelled. Contact {order.businessName || "the business"}
            {order.businessPhone ? <> on <a href={`tel:${order.businessPhone}`}>{order.businessPhone}</a></> : null} if you have a question.</p>
        </section>
      )}

      {state === "ready" && order && (
        <section className="order-status__card">
          <div className="order-status__head">
            <div>
              <span className="order-status__eyebrow">{order.businessName}</span>
              <h1>Order {order.publicReference}</h1>
            </div>
            {order.status !== "completed" && order.etaMinutes > 0 && (
              <p className="order-status__eta">
                <strong>~{order.etaMinutes} min</strong>
                <span>estimated</span>
              </p>
            )}
          </div>

          <ol className="order-status__steps">
            {steps.map((step, index) => (
              <li
                key={step.label}
                className={
                  index < activeIndex
                    ? "is-done"
                    : index === activeIndex
                      ? "is-current"
                      : ""
                }
              >
                <span className="order-status__dot" aria-hidden="true" />
                {step.label}
              </li>
            ))}
          </ol>

          {order.items?.length > 0 && (
            <ul className="order-status__items">
              {order.items.map((item, index) => (
                <li key={index}><span>{item.quantity}&times;</span> {item.name}</li>
              ))}
            </ul>
          )}
          {order.total != null && (
            <p className="order-status__total">Total {money(order.total, order.currency)}</p>
          )}
          {order.businessPhone && (
            <a className="wb-btn" href={`tel:${order.businessPhone}`}>Call {order.businessName || "the business"}</a>
          )}
        </section>
      )}

      {order?.businessName && (
        <Link className="order-status__back" to={`/b/${slug}`}>Back to {order.businessName}</Link>
      )}
    </main>
  );
}

import { useEffect, useState } from "react";
import { startCommerceCheckout } from "../../services/commerceService";
import { Icon } from "../websites/components/WebiloUI";
import { orderingPaused } from "./ordering";
import "./commerce.css";

const emptyCustomer = { name: "", email: "", phone: "", notes: "", company: "" };

function randomToken(prefix) {
  const uuid = window.crypto?.randomUUID?.().replace(/-/g, "");
  return `${prefix}_${uuid || `${Date.now()}${Math.random().toString(36).slice(2)}`}`;
}

export default function PublicCheckoutPanel({ business, cart, accentColor }) {
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [fulfilmentMethod, setFulfilmentMethod] = useState("");
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (cart.count > 0) setOpen(true);
  }, [cart.count]);
  useEffect(() => {
    if (!cart.fulfilmentMethods.includes(fulfilmentMethod)) {
      setFulfilmentMethod(cart.fulfilmentMethods[0] || "");
    }
  }, [cart.fulfilmentMethods, fulfilmentMethod]);

  if (!business?.checkoutEnabled) return null;
  if (orderingPaused(business)) return null;

  const checkout = async (event) => {
    event.preventDefault();
    if (!cart.items.length) return;
    if (!fulfilmentMethod) {
      setError("These items do not share a fulfilment method. Check out separately.");
      return;
    }
    setState("loading");
    setError("");
    try {
      const result = await startCommerceCheckout({
        slug: business.slug,
        customer,
        selections: cart.items.map((item) => ({
          resource: item.sourceResource,
          id: item.sourceId,
          quantity: item.quantity,
        })),
        fulfilmentMethod,
        notes: customer.notes,
        idempotencyKey: randomToken("checkout"),
        clientSecret: randomToken("secret"),
        returnOrigin: window.location.origin,
        company: customer.company,
      });
      if (!result.authorizationUrl) throw new Error("The payment page is unavailable.");
      window.location.assign(result.authorizationUrl);
    } catch (checkoutError) {
      setError(checkoutError.message || "Could not start checkout.");
      setState("error");
    }
  };

  return (
    <aside className={`commerce-cart ${open ? "commerce-cart--open" : ""}`} style={{ "--commerce-accent": accentColor }}>
      <button className="commerce-cart__toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <Icon name="grid" size={17} />
        Cart
        <span>{cart.count}</span>
      </button>
      {open && (
        <div className="commerce-cart__panel">
          <header><div><small>Secure checkout</small><h2>Your cart</h2></div><button onClick={() => setOpen(false)} aria-label="Close cart">×</button></header>
          {cart.items.length === 0 ? (
            <div className="commerce-cart__empty"><p>Your cart is empty.</p><small>Add a fixed-price offer to pay online.</small></div>
          ) : (
            <form onSubmit={checkout}>
              <div className="commerce-cart__items">
                {cart.items.map((item) => (
                  <div key={item.key}>
                    <div><strong>{item.name}</strong><small>{money(item.price)} each</small></div>
                    <label><span>Qty</span><input type="number" min="1" max="99" value={item.quantity} onChange={(event) => cart.setQuantity(item.key, event.target.value)} /></label>
                    <strong>{money(item.price * item.quantity)}</strong>
                    <button type="button" onClick={() => cart.remove(item.key)}>Remove</button>
                  </div>
                ))}
              </div>
              <div className="commerce-cart__total"><span>Subtotal</span><strong>{money(cart.subtotal)}</strong><small>Payment fees are shown by Paystack before confirmation.</small></div>
              <label><span>Name</span><input required value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} /></label>
              <label><span>Email</span><input required type="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} /></label>
              <label><span>Phone</span><input required inputMode="tel" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} /></label>
              <label><span>Fulfilment</span><select required value={fulfilmentMethod} onChange={(event) => setFulfilmentMethod(event.target.value)}>{cart.fulfilmentMethods.map((method) => <option value={method} key={method}>{fulfilmentLabel(method)}</option>)}</select></label>
              <label><span>Order notes</span><textarea rows="2" value={customer.notes} onChange={(event) => setCustomer({ ...customer, notes: event.target.value })} /></label>
              <label className="public-honeypot" aria-hidden="true"><span>Company</span><input tabIndex="-1" autoComplete="off" value={customer.company} onChange={(event) => setCustomer({ ...customer, company: event.target.value })} /></label>
              {error && <p className="commerce-cart__error" role="alert">{error}</p>}
              <button className="commerce-cart__pay" disabled={state === "loading"}>{state === "loading" ? "Opening Paystack…" : `Pay ${money(cart.subtotal)}`}</button>
              <small className="commerce-cart__secure">Payment is confirmed securely by Paystack. The business never receives card details.</small>
            </form>
          )}
        </div>
      )}
    </aside>
  );
}

const money = (cents) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(cents || 0) / 100);
const fulfilmentLabel = (method) => ({ pickup: "Pickup", delivery: "Delivery", digital: "Digital delivery" })[method] || method;

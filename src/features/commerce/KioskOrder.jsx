import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getBusinessBySlug, listPublicOffers } from "../../services/businessRepository";
import { getPublicOrderStatus, submitPublicBusinessRequest } from "../../services/commerceService";
import { orderingPaused } from "./ordering";
import WebiloAnimatedLogo from "../../components/WebiloAnimatedLogo";
import "./kiosk.css";

// Self-service in-store kiosk (docs/WEBILO_WORKSPACE_REDESIGN.md Ticket 6).
// Deliberately does NOT use useCommerceCart/PublicCheckoutPanel: that cart is
// hard-gated to checkoutEligible() offers only (fixed price, no variants, no
// required modifiers, no booking/quote) because it feeds Paystack. A kiosk
// needs to sell *any* offer "pay at counter" with zero new payment code (see
// the ticket's own payment decision — Paystack's redirect model doesn't fit a
// fixed shared device), so it reuses the same single-offer free-request path
// PublicBusinessPage.jsx already uses instead, which already handles
// variants/modifiers/quantity/fulfilment for any offer type.

const STEPS = [
  { label: "Received", match: ["requested", "pending"] },
  { label: "Preparing", match: ["confirmed", "processing"] },
  { label: "Ready", match: ["ready", "out_for_delivery"] },
  { label: "Complete", match: ["completed"] },
];
const TERMINAL = ["completed", "cancelled"];
const TERMINAL_RESET_MS = 15000;
// Kiosks are shared devices — no order/customer details should linger for
// the next customer, so the confirmation screen resets itself even if no
// one taps "Start new order".
const IDLE_RESET_MS = 90000;

const emptyForm = { name: "", phone: "", quantity: 1, selectedVariant: "", selectedModifiers: [], startTime: "", notes: "" };

export default function KioskOrder() {
  const { slug } = useParams();
  const [business, setBusiness] = useState(null);
  const [offers, setOffers] = useState([]);
  const [state, setState] = useState("loading");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitState, setSubmitState] = useState("idle");
  const [submitError, setSubmitError] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    (async () => {
      try {
        const nextBusiness = await getBusinessBySlug(slug);
        if (cancelled) return;
        if (!nextBusiness) return setState("not-found");
        setBusiness(nextBusiness);
        const nextOffers = await listPublicOffers(nextBusiness.id);
        if (cancelled) return;
        setOffers(nextOffers);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const paused = orderingPaused(business);

  const selectOffer = (offer) => {
    setSubmitError("");
    setForm({
      ...emptyForm,
      selectedVariant: offer.variants?.[0]?.label || "",
    });
    setSelected(offer);
  };

  const toggleModifier = (label) => {
    setForm((current) => ({
      ...current,
      selectedModifiers: current.selectedModifiers.includes(label)
        ? current.selectedModifiers.filter((item) => item !== label)
        : [...current.selectedModifiers, label],
    }));
  };

  const fulfilmentMethod = useMemo(() => resolveFulfilmentMethod(selected), [selected]);

  const submitOrder = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setSubmitError("Enter a name and phone number so we can call you when it's ready.");
      return;
    }
    if (selected.variants?.length > 0 && !form.selectedVariant) {
      setSubmitError("Choose an option before placing the order.");
      return;
    }
    if (fulfilmentMethod === "booking" && !form.startTime) {
      setSubmitError("Choose a preferred date and time.");
      return;
    }
    setSubmitState("saving");
    setSubmitError("");
    try {
      const result = await submitPublicBusinessRequest({
        slug,
        requestType: "offer",
        customer: { name: form.name.trim(), email: "", phone: form.phone.trim() },
        selection: {
          resource: selected.sourceResource,
          id: selected.sourceId,
          quantity: Math.max(1, Number(form.quantity || 1)),
          selectedOptions: { variant: form.selectedVariant, modifiers: form.selectedModifiers },
        },
        fulfilmentMethod,
        requestedStartTime: fulfilmentMethod === "booking" ? form.startTime : "",
        notes: form.notes.trim(),
        company: "",
      });
      const token = new URLSearchParams((result.statusUrl || "").split("?")[1] || "").get("t") || "";
      setConfirmation({ publicReference: result.publicReference || result.reference, token });
      setSelected(null);
      setSubmitState("idle");
    } catch (error) {
      setSubmitError(error.message || "This order could not be placed. Please ask a staff member.");
      setSubmitState("error");
    }
  };

  if (state === "loading") {
    return <KioskShell><WebiloAnimatedLogo size={72} showWordmark /><p className="kiosk-loading">Loading menu…</p></KioskShell>;
  }
  if (state === "not-found") {
    return <KioskShell><h1>Kiosk not found</h1><p>Check the address or ask a staff member for the correct kiosk link.</p></KioskShell>;
  }
  if (state === "error") {
    return <KioskShell><h1>Something went wrong</h1><p>Check your connection and try again.</p></KioskShell>;
  }

  if (confirmation) {
    return (
      <KioskConfirmation
        slug={slug}
        confirmation={confirmation}
        onReset={() => setConfirmation(null)}
      />
    );
  }

  return (
    <main className="kiosk">
      <header className="kiosk-header">
        <span>{business.name}</span>
        {business.hours?.display && <small>{business.hours.display}</small>}
      </header>

      {paused ? (
        <div className="kiosk-state">
          <h1>Not taking orders right now</h1>
          <p>{paused.reason}</p>
          {paused.until && <p>Reopens {new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(paused.until)}.</p>}
        </div>
      ) : offers.length === 0 ? (
        <div className="kiosk-state">
          <h1>No items available yet</h1>
          <p>Please ask a staff member to place your order.</p>
        </div>
      ) : selected ? (
        <KioskReview
          offer={selected}
          form={form}
          setForm={setForm}
          fulfilmentMethod={fulfilmentMethod}
          onToggleModifier={toggleModifier}
          onBack={() => setSelected(null)}
          onSubmit={submitOrder}
          submitState={submitState}
          submitError={submitError}
        />
      ) : (
        <KioskGrid offers={offers} onSelect={selectOffer} />
      )}
    </main>
  );
}

function KioskShell({ children }) {
  return <main className="kiosk kiosk--center"><div className="kiosk-state">{children}</div></main>;
}

function KioskGrid({ offers, onSelect }) {
  const groups = groupOffers(offers);
  return (
    <div className="kiosk-grid-wrap">
      {groups.map(([title, records]) => (
        <section className="kiosk-group" key={title}>
          <h2>{title}</h2>
          <div className="kiosk-grid">
            {records.map((offer) => (
              <button
                className="kiosk-card"
                onClick={() => onSelect(offer)}
                disabled={offer.available === false}
                key={offer.key}
              >
                {offer.imageUrl && <img src={offer.imageUrl} alt="" />}
                <strong>{offer.name}</strong>
                <span>{offer.available === false ? "Sold out" : offerPrice(offer)}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function KioskReview({ offer, form, setForm, fulfilmentMethod, onToggleModifier, onBack, onSubmit, submitState, submitError }) {
  return (
    <form className="kiosk-review" onSubmit={onSubmit}>
      <button type="button" className="kiosk-back" onClick={onBack}>&larr; Back to menu</button>
      <h1>{offer.name}</h1>
      {offer.description && <p className="kiosk-review-description">{offer.description}</p>}

      {offer.variants?.length > 0 && (
        <fieldset className="kiosk-options">
          <legend>Choose an option</legend>
          {offer.variants.map((variant) => (
            <label key={variant.label}>
              <input
                type="radio"
                name="variant"
                checked={form.selectedVariant === variant.label}
                onChange={() => setForm((current) => ({ ...current, selectedVariant: variant.label }))}
              />
              {variant.label}{variant.priceDeltaCents ? ` (+${money(variant.priceDeltaCents, offer.currency)})` : ""}
            </label>
          ))}
        </fieldset>
      )}

      {offer.modifierGroups?.map((group) => (
        <fieldset className="kiosk-options" key={group.name}>
          <legend>{group.name}{group.min > 0 ? ` (choose ${group.min === group.max ? group.min : `${group.min}-${group.max}`})` : " (optional)"}</legend>
          {group.options.map((option) => (
            <label key={option.label}>
              <input
                type="checkbox"
                checked={form.selectedModifiers.includes(option.label)}
                onChange={() => onToggleModifier(option.label)}
              />
              {option.label}{option.priceCents ? ` (+${money(option.priceCents, offer.currency)})` : ""}
            </label>
          ))}
        </fieldset>
      ))}

      <label className="kiosk-field kiosk-quantity">
        <span>Quantity</span>
        <div>
          <button type="button" onClick={() => setForm((current) => ({ ...current, quantity: Math.max(1, Number(current.quantity || 1) - 1) }))}>-</button>
          <output>{form.quantity}</output>
          <button type="button" onClick={() => setForm((current) => ({ ...current, quantity: Math.min(99, Number(current.quantity || 1) + 1) }))}>+</button>
        </div>
      </label>

      {fulfilmentMethod === "booking" && (
        <label className="kiosk-field">
          <span>Preferred date and time</span>
          <input type="datetime-local" required value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} />
        </label>
      )}

      <label className="kiosk-field">
        <span>Notes (allergies, special requests)</span>
        <textarea rows="2" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
      </label>

      <div className="kiosk-total">{offerTotal(offer, form.quantity, form.selectedVariant, form.selectedModifiers)}</div>

      <label className="kiosk-field">
        <span>Your name</span>
        <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
      </label>
      <label className="kiosk-field">
        <span>Phone number</span>
        <input required inputMode="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
      </label>

      {submitError && <p className="kiosk-error" role="alert">{submitError}</p>}
      <button className="kiosk-submit" disabled={submitState === "saving"}>
        {submitState === "saving" ? "Placing order…" : "Place order — pay at counter"}
      </button>
    </form>
  );
}

function KioskConfirmation({ slug, confirmation, onReset }) {
  const [order, setOrder] = useState(null);
  const [state, setState] = useState("loading");
  const attemptsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timeout;
    const poll = async () => {
      try {
        const result = await getPublicOrderStatus({ slug, publicReference: confirmation.publicReference, token: confirmation.token });
        if (cancelled) return;
        setOrder(result);
        setState("ready");
        if (TERMINAL.includes(result.status)) {
          timeout = window.setTimeout(onReset, TERMINAL_RESET_MS);
          return;
        }
      } catch {
        if (!cancelled) setState("error");
      }
      attemptsRef.current += 1;
      if (!cancelled && attemptsRef.current < 40) {
        timeout = window.setTimeout(poll, 8000);
      }
    };
    poll();
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [slug, confirmation, onReset]);

  useEffect(() => {
    const timer = window.setTimeout(onReset, IDLE_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [onReset]);

  const activeIndex = order ? STEPS.findIndex((step) => step.match.includes(order.status)) : 0;

  return (
    <main className="kiosk kiosk--center">
      <div className="kiosk-confirmation">
        {state === "loading" && <p>Confirming your order…</p>}
        {state === "error" && <p>We placed your order, but live status is unavailable. Please listen for your name.</p>}
        {order && (
          <>
            <span className="kiosk-confirmation-ref">Order {order.publicReference}</span>
            {order.status === "cancelled" ? (
              <h1>Order cancelled</h1>
            ) : (
              <>
                <h1>Thank you!</h1>
                <ol className="kiosk-steps">
                  {STEPS.map((step, index) => (
                    <li key={step.label} className={index <= Math.max(activeIndex, 0) ? "is-done" : ""}>{step.label}</li>
                  ))}
                </ol>
                {order.etaMinutes > 0 && order.status !== "completed" && <p className="kiosk-eta">~{order.etaMinutes} min</p>}
              </>
            )}
          </>
        )}
        <button className="kiosk-submit" onClick={onReset}>Start new order</button>
      </div>
    </main>
  );
}

function resolveFulfilmentMethod(offer) {
  if (!offer?.fulfilmentMethods?.length) return "pickup";
  return offer.fulfilmentMethods.includes("pickup") ? "pickup" : offer.fulfilmentMethods[0];
}

function groupOffers(offers) {
  if (offers.some((offer) => offer.category)) {
    const byCategory = new Map();
    offers.forEach((offer) => {
      const key = offer.category || (offer.offerType === "service" ? "Services" : "Menu");
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key).push(offer);
    });
    return [...byCategory.entries()];
  }
  return [["Menu", offers]];
}

function money(cents, currency = "ZAR") {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(Number(cents || 0) / 100);
}

function offerPrice(offer) {
  if (offer.pricingMode === "quote") return "Ask staff for price";
  if (offer.pricingMode === "free") return "Free";
  const amount = money(offer.price, offer.currency);
  return offer.pricingMode === "starting_from" ? `From ${amount}` : amount;
}

function offerTotal(offer, quantity, selectedVariant, selectedModifiers = []) {
  if (offer.pricingMode === "quote") return "Price confirmed at counter";
  if (offer.pricingMode === "free") return "Free";
  const variantDelta = offer.variants?.find((variant) => variant.label === selectedVariant)?.priceDeltaCents || 0;
  const modifierDelta = (offer.modifierGroups || [])
    .flatMap((group) => group.options)
    .filter((option) => selectedModifiers.includes(option.label))
    .reduce((sum, option) => sum + (option.priceCents || 0), 0);
  const unitPrice = Number(offer.price || 0) + variantDelta + modifierDelta;
  return money(unitPrice * Math.max(1, Number(quantity || 1)), offer.currency);
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getBusinessBySlug, listPublicOffers } from "../../services/businessRepository";
import { submitPublicBusinessRequest } from "../../services/commerceService";
import PublicCheckoutPanel from "../../features/commerce/PublicCheckoutPanel";
import { checkoutEligible, useCommerceCart } from "../../features/commerce/cart";
import { orderingPaused } from "../../features/commerce/ordering";
import AnnouncementBanner from "../../features/announcements/AnnouncementBanner";
import "./product.css";

const emptyForm = {
  customerName: "",
  email: "",
  phone: "",
  notes: "",
  requestType: "contact",
  offerKey: "",
  quantity: 1,
  fulfilmentMethod: "",
  startTime: "",
  company: "",
  selectedVariant: "",
  selectedModifiers: [],
};

export default function PublicBusinessPage() {
  const { slug } = useParams();
  const formRef = useRef(null);
  const [business, setBusiness] = useState(null);
  const [offers, setOffers] = useState([]);
  const [state, setState] = useState("loading");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [trackUrl, setTrackUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cart = useCommerceCart(slug);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getBusinessBySlug(slug);
        if (cancelled) return;
        if (!next) return setState("not-found");
        setBusiness(next);
        const nextOffers = await listPublicOffers(next.id);
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
  const selectedOffer = useMemo(
    () => offers.find((offer) => offer.key === form.offerKey),
    [form.offerKey, offers]
  );
  const offerGroups = useMemo(() => {
    if (offers.some((offer) => offer.category)) {
      const byCategory = new Map();
      offers.forEach((offer) => {
        const key = offer.category || (offer.offerType === "service" ? "Services" : "Menu");
        if (!byCategory.has(key)) byCategory.set(key, []);
        byCategory.get(key).push(offer);
      });
      return [...byCategory.entries()];
    }
    const products = offers.filter((offer) => offer.offerType === "product");
    const services = offers.filter((offer) => offer.offerType === "service");
    const packages = offers.filter((offer) => !["product", "service"].includes(offer.offerType));
    return [
      ["Products", products],
      ["Services", services],
      ["Packages and offers", packages],
    ].filter(([, records]) => records.length > 0);
  }, [offers]);

  const selectOffer = (offer) => {
    setMessage("");
    setForm((current) => ({
      ...current,
      requestType: "offer",
      offerKey: offer.key,
      quantity: 1,
      fulfilmentMethod: offer.fulfilmentMethods?.[0] || "pickup",
      startTime: "",
      selectedVariant: offer.variants?.[0]?.label || "",
      selectedModifiers: [],
    }));
    window.setTimeout(
      () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0
    );
  };

  const changeOffer = (offerKey) => {
    const offer = offers.find((item) => item.key === offerKey);
    setForm((current) => ({
      ...current,
      offerKey,
      fulfilmentMethod: offer?.fulfilmentMethods?.[0] || "",
      startTime: "",
      selectedVariant: offer?.variants?.[0]?.label || "",
      selectedModifiers: [],
    }));
  };

  const toggleModifier = (label) => {
    setForm((current) => ({
      ...current,
      selectedModifiers: current.selectedModifiers.includes(label)
        ? current.selectedModifiers.filter((item) => item !== label)
        : [...current.selectedModifiers, label],
    }));
  };

  const changeRequestType = (requestType) => {
    setForm((current) => ({
      ...current,
      requestType,
      offerKey: requestType === "offer" ? current.offerKey : "",
      fulfilmentMethod: requestType === "offer" ? current.fulfilmentMethod : "",
      startTime: "",
      selectedVariant: "",
      selectedModifiers: [],
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.customerName.trim() || !form.phone.trim()) {
      return setMessage("Enter your name and phone number.");
    }
    if (form.requestType === "offer" && !selectedOffer) {
      return setMessage("Choose an available offer.");
    }
    if (form.requestType === "offer" && selectedOffer?.variants?.length > 0 && !form.selectedVariant) {
      return setMessage("Choose an option before submitting.");
    }

    if (form.requestType === "offer" && paused) {
      return setMessage(paused.reason);
    }

    setSubmitting(true);
    setMessage("");
    setTrackUrl("");
    try {
      const result = await submitPublicBusinessRequest({
        slug,
        requestType: form.requestType,
        customer: {
          name: form.customerName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
        selection: selectedOffer
          ? {
              resource: selectedOffer.sourceResource,
              id: selectedOffer.sourceId,
              quantity: Math.max(1, Number(form.quantity || 1)),
              selectedOptions: { variant: form.selectedVariant, modifiers: form.selectedModifiers },
            }
          : undefined,
        fulfilmentMethod: form.fulfilmentMethod,
        requestedStartTime: form.startTime,
        notes: form.notes.trim(),
        company: form.company,
      });
      const success = result.reference
        ? `Request received. Your reference is ${result.reference}.`
        : "Thanks. The business has received your contact details.";
      setForm(emptyForm);
      setMessage(success);
      if (result.statusUrl) setTrackUrl(result.statusUrl);
    } catch (error) {
      setMessage(error.message || "Could not send your request. Please contact the business directly.");
    } finally {
      setSubmitting(false);
    }
  };

  if (state === "loading") {
    return <main className="product-auth-shell"><div className="wb-skeleton" style={{ width: "80%", height: 260 }} /></main>;
  }
  if (state !== "ready") {
    return <main className="product-auth-shell"><div className="wb-card product-empty"><h1 className="wb-heading">Business not found</h1><p className="wb-secondary">This Webilo page is unavailable.</p></div></main>;
  }

  return (
    <div className="product-shell">
      <AnnouncementBanner businessId={business.id} />
      <header className="public-hero">
        <div className="wb-container">
          <span className="wb-label">{business.category}</span>
          <h1 className="wb-display">{business.name}</h1>
          <p className="wb-secondary">{business.description}</p>
          {business.hours?.display && (
            <p className="wb-body-sm public-hours">Hours: {business.hours.display}</p>
          )}
          <div className="wb-row">
            {offers.length > 0 && !paused && <a className="wb-btn wb-btn-primary" href="#offers">View offers</a>}
            {business.phone && <a className="wb-btn wb-btn-accent" href={`tel:${business.phone}`}>Call {business.phone}</a>}
          </div>
        </div>
      </header>

      {paused && (
        <div className="public-closed-banner" role="status">
          <div className="wb-container">
            <strong>Not accepting orders right now.</strong>
            <span>{paused.reason}</span>
            {paused.until && (
              <span>Reopens {new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(paused.until)}.</span>
            )}
          </div>
        </div>
      )}

      <div id="offers">
        {offerGroups.map(([title, records]) => (
          <PublicCollection
            title={title}
            records={records}
            onChoose={selectOffer}
            onAdd={cart.add}
            checkoutEnabled={business.checkoutEnabled}
            paused={Boolean(paused)}
            key={title}
          />
        ))}
      </div>

      <section className="public-section" ref={formRef} id="contact">
        <div className="wb-container wb-grid-2">
          <div>
            <span className="wb-label">{form.requestType === "offer" ? "Request" : "Contact"}</span>
            <h2 className="wb-display">
              {form.requestType === "offer" ? "Review your request" : "Get in touch"}
            </h2>
            <p className="wb-secondary">
              {business.address?.city}{business.address?.city ? ", " : ""}South Africa
              <br />{business.email}
            </p>
          </div>
          <form className="wb-card wb-stack public-request-form" onSubmit={submit}>
            <label className="wb-field">
              <span className="wb-field-label">Your name</span>
              <input className="wb-input" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} />
            </label>
            <label className="wb-field">
              <span className="wb-field-label">Email</span>
              <input className="wb-input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label className="wb-field">
              <span className="wb-field-label">Phone number</span>
              <input className="wb-input" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
            {offers.length > 0 && (
              <label className="wb-field">
                <span className="wb-field-label">How can we help?</span>
                <select className="wb-input wb-select" value={form.requestType} onChange={(event) => changeRequestType(event.target.value)}>
                  <option value="contact">General enquiry</option>
                  <option value="offer">Order, book or request a quote</option>
                </select>
              </label>
            )}

            {form.requestType === "offer" && (
              <>
                <label className="wb-field">
                  <span className="wb-field-label">Offer</span>
                  <select className="wb-input wb-select" value={form.offerKey} onChange={(event) => changeOffer(event.target.value)}>
                    <option value="">Choose an offer</option>
                    {offers.map((offer) => (
                      <option key={offer.key} value={offer.key} disabled={offer.available === false}>
                        {offer.name} · {offer.available === false ? "Sold out" : offerPrice(offer)}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedOffer && (
                  <>
                    {selectedOffer.variants?.length > 0 && (
                      <label className="wb-field">
                        <span className="wb-field-label">Option</span>
                        <select className="wb-input wb-select" value={form.selectedVariant} onChange={(event) => setForm({ ...form, selectedVariant: event.target.value })}>
                          {selectedOffer.variants.map((variant) => (
                            <option value={variant.label} key={variant.label}>
                              {variant.label}{variant.priceDeltaCents ? ` (+${money(variant.priceDeltaCents, selectedOffer.currency)})` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {selectedOffer.modifierGroups?.length > 0 && (
                      <div className="wb-field product-field--wide public-modifier-groups">
                        {selectedOffer.modifierGroups.map((group) => (
                          <fieldset className="public-modifier-group" key={group.name}>
                            <legend>{group.name}{group.min > 0 ? ` (choose ${group.min === group.max ? group.min : `${group.min}–${group.max}`})` : " (optional)"}</legend>
                            {group.options.map((option) => (
                              <label className="public-modifier-option" key={option.label}>
                                <input
                                  type="checkbox"
                                  checked={form.selectedModifiers.includes(option.label)}
                                  onChange={() => toggleModifier(option.label)}
                                />
                                {option.label}{option.priceCents ? ` (+${money(option.priceCents, selectedOffer.currency)})` : ""}
                              </label>
                            ))}
                          </fieldset>
                        ))}
                      </div>
                    )}
                    <label className="wb-field">
                      <span className="wb-field-label">Quantity</span>
                      <input className="wb-input" type="number" min="1" max="99" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
                    </label>
                    <label className="wb-field">
                      <span className="wb-field-label">How should it be fulfilled?</span>
                      <select className="wb-input wb-select" value={form.fulfilmentMethod} onChange={(event) => setForm({ ...form, fulfilmentMethod: event.target.value, startTime: "" })}>
                        {selectedOffer.fulfilmentMethods.map((method) => <option value={method} key={method}>{fulfilmentLabel(method)}</option>)}
                      </select>
                    </label>
                    {form.fulfilmentMethod === "booking" && (
                      <label className="wb-field">
                        <span className="wb-field-label">Preferred date and time</span>
                        <input className="wb-input" type="datetime-local" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
                      </label>
                    )}
                    <div className="public-order-summary" aria-live="polite">
                      <span>{selectedOffer.name} × {Math.max(1, Number(form.quantity || 1))}</span>
                      <strong>{offerTotal(selectedOffer, form.quantity, form.selectedVariant, form.selectedModifiers)}</strong>
                      <small>Final pricing is confirmed by {business.name}.</small>
                    </div>
                  </>
                )}
              </>
            )}

            <label className="wb-field">
              <span className="wb-field-label">Message or notes</span>
              <textarea className="wb-input wb-textarea" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </label>
            <label className="public-honeypot" aria-hidden="true">
              Company
              <input tabIndex="-1" autoComplete="off" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} />
            </label>
            <button className="wb-btn wb-btn-primary" disabled={submitting}>
              {submitting ? "Sending…" : form.requestType === "offer" ? "Submit request" : "Send contact details"}
            </button>
            {message && <p className="wb-body-sm" role="status">{message}</p>}
            {trackUrl && (
              <Link className="wb-btn wb-btn-accent" to={trackUrl}>Track your order</Link>
            )}
          </form>
        </div>
      </section>
      <PublicCheckoutPanel business={business} cart={cart} />
    </div>
  );
}

function PublicCollection({ title, records, onChoose, onAdd, checkoutEnabled, paused }) {
  return (
    <section className="public-section">
      <div className="wb-container">
        <h2 className="wb-display">{title}</h2>
        <div className="wb-grid-3">
          {records.map((record) => (
            <article className={`wb-card public-record-card ${record.available === false ? "public-record-card--unavailable" : ""}`} key={record.key}>
              {record.imageUrl && <img src={record.imageUrl} alt={record.name} />}
              <span className="wb-label">{offerTypeLabel(record.offerType)}</span>
              <h3 className="wb-heading">{record.name}</h3>
              <p className="wb-secondary">{record.description}</p>
              <strong>{offerPrice(record)}</strong>
              {record.available === false ? (
                <p className="wb-body-sm wb-secondary">Sold out</p>
              ) : paused ? (
                <p className="wb-body-sm wb-secondary">Ordering is paused.</p>
              ) : (
                <div className="wb-row">
                  {checkoutEnabled && checkoutEligible(record) && (
                    <button className="wb-btn wb-btn-primary" onClick={() => onAdd(record)}>Add to cart</button>
                  )}
                  <button className={`wb-btn ${checkoutEnabled && checkoutEligible(record) ? "" : "wb-btn-primary"}`} onClick={() => onChoose(record)}>
                    {offerAction(record)}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const money = (cents, currency = "ZAR") => new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency,
}).format(Number(cents || 0) / 100);

const offerPrice = (offer) => {
  if (offer.pricingMode === "quote") return "Price on request";
  if (offer.pricingMode === "free") return "Free";
  const amount = money(offer.price, offer.currency);
  return offer.pricingMode === "starting_from" ? `From ${amount}` : amount;
};

const offerTotal = (offer, quantity, selectedVariant, selectedModifiers = []) => {
  if (offer.pricingMode === "quote") return "Quote required";
  if (offer.pricingMode === "free") return "Free";
  const variantDelta = offer.variants?.find((variant) => variant.label === selectedVariant)?.priceDeltaCents || 0;
  const modifierDelta = (offer.modifierGroups || [])
    .flatMap((group) => group.options)
    .filter((option) => selectedModifiers.includes(option.label))
    .reduce((sum, option) => sum + (option.priceCents || 0), 0);
  const unitPrice = Number(offer.price || 0) + variantDelta + modifierDelta;
  return money(unitPrice * Math.max(1, Number(quantity || 1)), offer.currency);
};

const offerAction = (offer) => offer.fulfilmentMethods?.includes("booking")
  ? "Request booking"
  : offer.pricingMode === "quote"
    ? "Request quote"
    : "Request this";

const offerTypeLabel = (type) => ({
  service: "Service",
  package: "Package",
  bundle: "Bundle",
  tier: "Tier",
  deposit: "Deposit",
})[type] || "Product";

const fulfilmentLabel = (method) => ({
  pickup: "Collect from the business",
  delivery: "Delivery",
  booking: "Book a date and time",
  digital: "Digital delivery",
  quote: "Request a quote",
})[method] || method;

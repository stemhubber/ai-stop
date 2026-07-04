import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getBusinessBySlug, listPublicOffers } from "../../services/businessRepository";
import { submitPublicBusinessRequest } from "../../services/commerceService";
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
};

export default function PublicBusinessPage() {
  const { slug } = useParams();
  const formRef = useRef(null);
  const [business, setBusiness] = useState(null);
  const [offers, setOffers] = useState([]);
  const [state, setState] = useState("loading");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const selectedOffer = useMemo(
    () => offers.find((offer) => offer.key === form.offerKey),
    [form.offerKey, offers]
  );
  const offerGroups = useMemo(() => {
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
    }));
  };

  const changeRequestType = (requestType) => {
    setForm((current) => ({
      ...current,
      requestType,
      offerKey: requestType === "offer" ? current.offerKey : "",
      fulfilmentMethod: requestType === "offer" ? current.fulfilmentMethod : "",
      startTime: "",
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

    setSubmitting(true);
    setMessage("");
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
      <header className="public-hero">
        <div className="wb-container">
          <span className="wb-label">{business.category}</span>
          <h1 className="wb-display">{business.name}</h1>
          <p className="wb-secondary">{business.description}</p>
          <div className="wb-row">
            {offers.length > 0 && <a className="wb-btn wb-btn-primary" href="#offers">View offers</a>}
            {business.phone && <a className="wb-btn wb-btn-accent" href={`tel:${business.phone}`}>Call {business.phone}</a>}
          </div>
        </div>
      </header>

      <div id="offers">
        {offerGroups.map(([title, records]) => (
          <PublicCollection
            title={title}
            records={records}
            onChoose={selectOffer}
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
                      <option key={offer.key} value={offer.key}>
                        {offer.name} · {offerPrice(offer)}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedOffer && (
                  <>
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
                      <strong>{offerTotal(selectedOffer, form.quantity)}</strong>
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
          </form>
        </div>
      </section>
    </div>
  );
}

function PublicCollection({ title, records, onChoose }) {
  return (
    <section className="public-section">
      <div className="wb-container">
        <h2 className="wb-display">{title}</h2>
        <div className="wb-grid-3">
          {records.map((record) => (
            <article className="wb-card public-record-card" key={record.key}>
              {record.imageUrl && <img src={record.imageUrl} alt={record.name} />}
              <span className="wb-label">{offerTypeLabel(record.offerType)}</span>
              <h3 className="wb-heading">{record.name}</h3>
              <p className="wb-secondary">{record.description}</p>
              <strong>{offerPrice(record)}</strong>
              <button className="wb-btn wb-btn-primary" onClick={() => onChoose(record)}>
                {offerAction(record)}
              </button>
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

const offerTotal = (offer, quantity) => {
  if (offer.pricingMode === "quote") return "Quote required";
  if (offer.pricingMode === "free") return "Free";
  return money(Number(offer.price || 0) * Math.max(1, Number(quantity || 1)), offer.currency);
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

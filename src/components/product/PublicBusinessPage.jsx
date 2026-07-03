import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { createRecord, getBusinessBySlug, listRecords } from "../../services/businessRepository";
import "./product.css";

const emptyForm = {
  customerName: "",
  email: "",
  phone: "",
  notes: "",
  requestType: "contact",
  productId: "",
  serviceId: "",
  quantity: 1,
  startTime: "",
};

export default function PublicBusinessPage() {
  const { slug } = useParams();
  const formRef = useRef(null);
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
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
        const [nextProducts, nextServices] = await Promise.all([
          listRecords(next.id, "products").catch(() => []),
          listRecords(next.id, "services").catch(() => []),
        ]);
        if (cancelled) return;
        setProducts(nextProducts.filter((item) => item.status !== "inactive"));
        setServices(nextServices.filter((item) => item.status !== "inactive"));
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const choose = (requestType, record) => {
    setMessage("");
    setForm((current) => ({
      ...current,
      requestType,
      productId: requestType === "order" ? record.id : "",
      serviceId: requestType === "booking" ? record.id : "",
    }));
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.customerName.trim() || !form.phone.trim()) {
      return setMessage("Enter your name and phone number.");
    }
    const product = products.find((item) => item.id === form.productId);
    const service = services.find((item) => item.id === form.serviceId);
    if (form.requestType === "order" && !product) return setMessage("Choose a product to order.");
    if (form.requestType === "booking" && (!service || !form.startTime)) return setMessage("Choose a service and preferred date.");

    setSubmitting(true);
    setMessage("");
    try {
      const customer = {
        name: form.customerName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim(),
        source: "website",
        status: "lead",
        lastRequestType: form.requestType,
      };
      await createRecord(business.id, "customers", customer);

      if (form.requestType === "order") {
        const quantity = Math.max(1, Number(form.quantity || 1));
        await createRecord(business.id, "orders", {
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          items: [{ productId: product.id, name: product.name, quantity, unitPrice: Number(product.price || 0) }],
          total: Number(product.price || 0) * quantity,
          notes: customer.notes,
          source: "website",
          status: "pending",
          paymentStatus: "unpaid",
          currency: "ZAR",
        });
      }

      if (form.requestType === "booking") {
        await createRecord(business.id, "bookings", {
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          serviceId: service.id,
          serviceName: service.name,
          servicePrice: Number(service.price || 0),
          durationMinutes: Number(service.durationMinutes || 0),
          startTime: form.startTime,
          notes: customer.notes,
          source: "website",
          status: "requested",
        });
      }

      setForm(emptyForm);
      setMessage(form.requestType === "booking" ? "Your booking request was sent." : form.requestType === "order" ? "Your order request was sent." : "Thanks. The business has received your contact details.");
    } catch {
      setMessage("Could not send your request. Please contact the business directly.");
    } finally {
      setSubmitting(false);
    }
  };

  if (state === "loading") return <main className="product-auth-shell"><div className="wb-skeleton" style={{ width: "80%", height: 260 }} /></main>;
  if (state !== "ready") return <main className="product-auth-shell"><div className="wb-card product-empty"><h1 className="wb-heading">Business not found</h1><p className="wb-secondary">This Webilo page is unavailable.</p></div></main>;

  return <div className="product-shell">
    <header className="public-hero"><div className="wb-container"><span className="wb-label">{business.category}</span><h1 className="wb-display">{business.name}</h1><p className="wb-secondary">{business.description}</p>{business.phone && <a className="wb-btn wb-btn-accent" href={`tel:${business.phone}`}>Call {business.phone}</a>}</div></header>
    {products.length > 0 && <PublicCollection title="Products" records={products} actionLabel="Order this" onChoose={(record) => choose("order", record)} />}
    {services.length > 0 && <PublicCollection title="Services" records={services} actionLabel="Book this" onChoose={(record) => choose("booking", record)} />}
    <section className="public-section" ref={formRef}><div className="wb-container wb-grid-2"><div><span className="wb-label">Contact</span><h2 className="wb-display">{form.requestType === "order" ? "Place an order request" : form.requestType === "booking" ? "Request a booking" : "Start a conversation"}</h2><p className="wb-secondary">{business.address?.city}, South Africa<br />{business.email}</p></div><form className="wb-card wb-stack public-request-form" onSubmit={submit}>
      <label className="wb-field"><span className="wb-field-label">Your name</span><input className="wb-input" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></label>
      <label className="wb-field"><span className="wb-field-label">Email</span><input className="wb-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label className="wb-field"><span className="wb-field-label">Phone number</span><input className="wb-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
      <label className="wb-field"><span className="wb-field-label">Request type</span><select className="wb-input wb-select" value={form.requestType} onChange={(e) => setForm({ ...form, requestType: e.target.value, productId: "", serviceId: "" })}><option value="contact">General enquiry</option>{products.length > 0 && <option value="order">Order a product</option>}{services.length > 0 && <option value="booking">Book a service</option>}</select></label>
      {form.requestType === "order" && <><label className="wb-field"><span className="wb-field-label">Product</span><select className="wb-input wb-select" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}><option value="">Choose a product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {money(product.price)}</option>)}</select></label><label className="wb-field"><span className="wb-field-label">Quantity</span><input className="wb-input" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label></>}
      {form.requestType === "booking" && <><label className="wb-field"><span className="wb-field-label">Service</span><select className="wb-input wb-select" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}><option value="">Choose a service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {money(service.price)}</option>)}</select></label><label className="wb-field"><span className="wb-field-label">Preferred date and time</span><input className="wb-input" type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></label></>}
      <label className="wb-field"><span className="wb-field-label">Message or notes</span><textarea className="wb-input wb-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
      <button className="wb-btn wb-btn-primary" disabled={submitting}>{submitting ? "Sending…" : form.requestType === "booking" ? "Request booking" : form.requestType === "order" ? "Send order request" : "Send contact details"}</button>{message && <p className="wb-body-sm" role="status">{message}</p>}
    </form></div></section>
  </div>;
}

function PublicCollection({ title, records, actionLabel, onChoose }) {
  return <section className="public-section"><div className="wb-container"><h2 className="wb-display">{title}</h2><div className="wb-grid-3">{records.map((record) => <article className="wb-card public-record-card" key={record.id}>{record.imageUrl && <img src={record.imageUrl} alt={record.name} />}<h3 className="wb-heading">{record.name}</h3><p className="wb-secondary">{record.description}</p>{record.price != null && <strong>{money(record.price)}</strong>}<button className="wb-btn wb-btn-primary" onClick={() => onChoose(record)}>{actionLabel}</button></article>)}</div></div></section>;
}

const money = (cents) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(cents || 0) / 100);

import { useEffect, useState } from "react";
import { createRecord, deleteRecord, listRecords, updateRecord } from "../../services/businessRepository";
import { sendMessage } from "../../services/messagingService";
import AIVisualImporter from "./AIVisualImporter";
import { uploadBusinessImage } from "../../services/websiteAssetService";

const CONFIG = {
  products: { singular: "product", fields: ["name", "description", "price"], defaults: { status: "active", currency: "ZAR" } },
  services: { singular: "service", fields: ["name", "description", "price", "durationMinutes"], defaults: { status: "active", currency: "ZAR", bookingEnabled: true } },
  customers: { singular: "customer", fields: ["name", "email", "phone"], defaults: { source: "manual" } },
  orders: { singular: "order", fields: ["customerName", "total", "notes"], defaults: { status: "pending", paymentStatus: "unpaid", currency: "ZAR" } },
  bookings: { singular: "booking", fields: ["customerName", "serviceName", "startTime", "notes"], defaults: { status: "requested" } },
  messages: { singular: "message", fields: ["customerName", "to", "subject", "body"], defaults: { status: "draft", direction: "outbound", channel: "sms" } },
  campaigns: { singular: "campaign", fields: ["name", "channel", "message"], defaults: { status: "draft", type: "promotion" } },
};

export default function ResourceManager({ businessId, resource }) {
  const config = CONFIG[resource];
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(config.defaults);
  const [editing, setEditing] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [showAiImport, setShowAiImport] = useState(false);
  const [imageState, setImageState] = useState("idle");

  const load = async () => {
    setState("loading");
    try { setRecords(await listRecords(businessId, resource)); setState("ready"); }
    catch (err) { setError(err.message); setState("error"); }
  };
  useEffect(() => { load(); }, [businessId, resource]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (event) => {
    event.preventDefault();
    if (!form.name && !form.customerName) return setError(`Enter a ${config.singular} name.`);
    setState("saving");
    const normalized = { ...form };
    if ("price" in normalized) normalized.price = Math.round(Number(normalized.price || 0) * 100);
    if ("total" in normalized) normalized.total = Math.round(Number(normalized.total || 0) * 100);
    try {
      if (editing) await updateRecord(businessId, resource, editing, normalized);
      else await createRecord(businessId, resource, normalized);
      setForm(config.defaults); setEditing(null); setImageState("idle"); setError(""); await load();
    } catch (err) { setError(err.message); setState("error"); }
  };

  const edit = (record) => {
    const next = { ...record };
    if ("price" in next) next.price = next.price / 100;
    if ("total" in next) next.total = next.total / 100;
    setForm(next); setEditing(record.id);
  };

  const uploadImage = async (file) => {
    setImageState("uploading");
    setError("");
    try {
      const imageUrl = await uploadBusinessImage({ file, businessId });
      setForm((current) => ({ ...current, imageUrl }));
      setImageState("done");
    } catch (err) {
      setError(err.message || "The image could not be uploaded.");
      setImageState("idle");
    }
  };

  const send = async (record) => {
    setState("saving");
    setError("");
    try {
      await sendMessage(record);
      await updateRecord(businessId, resource, record.id, {
        status: "sent",
        sentAt: new Date().toISOString(),
      });
      await load();
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  };

  return (
    <section>
      <header className="product-header product-header--actions">
        <div><span className="wb-label">Manage</span><h1 className="wb-display">{resource[0].toUpperCase() + resource.slice(1)}</h1></div>
        {["products", "services"].includes(resource) && <button className="wb-btn wb-btn-accent" onClick={() => setShowAiImport((value) => !value)}>Import image with AI</button>}
      </header>
      {showAiImport && <AIVisualImporter businessId={businessId} resource={resource} onImported={load} onClose={() => setShowAiImport(false)} />}
      <form className="wb-card product-record-form" onSubmit={save}>
        <div className="wb-grid-3">
          {config.fields.map((field) => <label className="wb-field" key={field}><span className="wb-field-label">{label(field)}</span>{field === "channel" ? <select className="wb-input wb-select" value={form[field] || "sms"} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option></select> : <input className="wb-input" type={field === "price" || field === "total" || field === "durationMinutes" ? "number" : field === "startTime" ? "datetime-local" : "text"} value={form[field] || ""} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} />}</label>)}
        </div>
        {["products", "services"].includes(resource) && <div className="product-record-image"><div>{form.imageUrl ? <img src={form.imageUrl} alt="" /> : <span>No image selected</span>}</div><label className="wb-btn"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => event.target.files?.[0] && uploadImage(event.target.files[0])} />{imageState === "uploading" ? "Uploading…" : form.imageUrl ? "Replace image" : "Add image"}</label>{form.imageUrl && <button className="wb-btn wb-btn-ghost" type="button" onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))}>Remove</button>}</div>}
        {error && <p className="wb-field-error" role="alert">{error}</p>}
        <div className="wb-row">
          <button className="wb-btn wb-btn-primary" disabled={state === "saving"}>{editing ? "Save changes" : `Add ${config.singular}`}</button>
          {editing && <button className="wb-btn" type="button" onClick={() => { setEditing(null); setForm(config.defaults); }}>Cancel</button>}
        </div>
      </form>
      {state === "loading" ? <div className="wb-skeleton" style={{ height: 120 }} /> : records.length === 0 ? <div className="wb-card product-empty"><h2 className="wb-heading">No {resource} yet</h2><p className="wb-secondary">Add your first {config.singular} above.</p></div> : <div className="wb-card product-table-wrap"><table className="wb-table"><thead><tr><th>Name</th><th>Status</th><th>Value</th><th>Actions</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{record.name || record.customerName || record.serviceName}</td><td><span className={`wb-badge ${badge(record.status)}`}>{record.status || "active"}</span></td><td>{money(record.price ?? record.total)}</td><td><div className="wb-row"><button className="wb-btn wb-btn-sm" onClick={() => edit(record)}>Edit</button>{resource === "messages" && record.status !== "sent" && <button className="wb-btn wb-btn-accent wb-btn-sm" onClick={() => send(record)}>Send</button>}<button className="wb-btn wb-btn-danger wb-btn-sm" onClick={async () => { if (window.confirm(`Delete this ${config.singular}?`)) { await deleteRecord(businessId, resource, record.id); await load(); } }}>Delete</button></div></td></tr>)}</tbody></table></div>}
    </section>
  );
}

const label = (value) => value.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
const money = (cents) => cents == null ? "—" : new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);
const badge = (status) => status === "active" || status === "completed" || status === "confirmed" ? "wb-badge-success" : status === "cancelled" ? "wb-badge-danger" : "wb-badge-warning";

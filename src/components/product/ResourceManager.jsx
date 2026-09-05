import { useCallback, useEffect, useRef, useState } from "react";
import { createRecord, deleteRecord, listRecords, updateRecord } from "../../services/businessRepository";
import { sendMessage } from "../../services/messagingService";
import { Icon } from "../../features/websites/components/WebiloUI";
import AIVisualImporter from "./AIVisualImporter";
import { uploadBusinessImage } from "../../services/websiteAssetService";
import { canCancelOrder, nextOrderStep } from "../../features/commerce/orderTransitions";

const CONFIG = {
  offers: {
    singular: "offer",
    description: "Everything customers can order, book, buy as a package, or request a quote for.",
    fields: ["name", "offerType", "description", "pricingMode", "price", "fulfilmentMethod", "durationMinutes", "available", "category", "prepMinutes"],
    required: ["name", "offerType", "pricingMode", "fulfilmentMethod"],
    defaults: {
      status: "active",
      currency: "ZAR",
      offerType: "product",
      pricingMode: "fixed",
      fulfilmentMethod: "pickup",
      available: true,
      category: "",
      prepMinutes: "",
      variants: [],
      modifierGroups: [],
    },
  },
  products: {
    singular: "product",
    description: "Items clients can discover and order from your public business page.",
    fields: ["name", "description", "price"],
    required: ["name"],
    defaults: { status: "active", currency: "ZAR" },
  },
  services: {
    singular: "service",
    description: "Services clients can view and request a booking for.",
    fields: ["name", "description", "price", "durationMinutes"],
    required: ["name"],
    defaults: { status: "active", currency: "ZAR", bookingEnabled: true },
  },
  customers: {
    singular: "customer",
    description: "Leads from your website and contacts added by your team.",
    fields: ["name", "email", "phone"],
    required: ["name"],
    defaults: { source: "manual", status: "lead" },
  },
  orders: {
    singular: "order",
    description: "Website orders appear here automatically. You can also capture an order manually.",
    fields: ["customerName", "total", "notes"],
    required: ["customerName"],
    defaults: { status: "pending", paymentStatus: "unpaid", currency: "ZAR", source: "manual" },
  },
  bookings: {
    singular: "booking",
    description: "Booking requests from your services appear here, alongside manual bookings.",
    fields: ["customerName", "serviceName", "startTime", "notes"],
    required: ["customerName", "serviceName"],
    defaults: { status: "requested", source: "manual" },
  },
  messages: {
    singular: "message",
    description: "Send an SMS or email to a saved customer.",
    fields: ["channel", "customerName", "to", "subject", "body"],
    required: ["to", "body"],
    defaults: { status: "draft", direction: "outbound", channel: "sms" },
  },
  campaigns: {
    singular: "campaign",
    description: "Prepare reusable SMS campaigns. Sending is handled from Messages while campaign delivery is being completed.",
    fields: ["name", "channel", "message"],
    required: ["name", "message"],
    defaults: { status: "draft", type: "promotion", channel: "sms" },
  },
};

const TEXTAREA_FIELDS = new Set(["description", "notes", "body", "message"]);
const NUMBER_FIELDS = new Set(["price", "total", "durationMinutes", "prepMinutes"]);
const CHECKBOX_FIELDS = new Set(["available"]);
// Only shown to businesses in the food-ordering vertical (see foodMode.js).
const FOOD_ONLY_FIELDS = new Set(["category", "prepMinutes"]);
const SELECT_FIELDS = {
  offerType: [
    ["product", "Product"],
    ["service", "Service"],
    ["package", "Package"],
    ["bundle", "Bundle"],
    ["tier", "Customer tier"],
    ["deposit", "Deposit"],
  ],
  pricingMode: [
    ["fixed", "Fixed price"],
    ["starting_from", "Starting from"],
    ["quote", "Price on request"],
    ["free", "Free"],
  ],
  fulfilmentMethod: [
    ["pickup", "Pickup"],
    ["delivery", "Delivery"],
    ["booking", "Booking"],
    ["digital", "Digital delivery"],
    ["quote", "Quote request"],
  ],
};

export default function ResourceManager({ businessId, resource, aiEnabled = false, foodAware = false }) {
  const config = CONFIG[resource];
  const [records, setRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(() => ({ ...config.defaults }));
  const [editing, setEditing] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showAiImport, setShowAiImport] = useState(false);
  const [imageState, setImageState] = useState("idle");
  const formRef = useRef(null);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setState("loading");
    try {
      const nextRecords = await listRecords(businessId, resource);
      setRecords(nextRecords);
      setState("ready");
      return nextRecords;
    } catch (err) {
      setError(err.message || `Could not load ${resource}.`);
      setState("error");
      return [];
    }
  }, [businessId, resource]);

  useEffect(() => {
    setForm({ ...config.defaults });
    setEditing(null);
    setError("");
    setNotice("");
    setShowForm(false);
    setShowAiImport(false);
    setImageState("idle");
    load();
  }, [config, load]);

  useEffect(() => {
    let cancelled = false;
    if (!["messages", "orders", "bookings"].includes(resource)) return undefined;
    listRecords(businessId, "customers")
      .then((items) => !cancelled && setCustomers(items))
      .catch(() => !cancelled && setCustomers([]));
    return () => { cancelled = true; };
  }, [businessId, resource]);

  const resetForm = ({ close = true } = {}) => {
    setForm({ ...config.defaults });
    setEditing(null);
    setError("");
    setImageState("idle");
    if (close) setShowForm(false);
  };

  const startNew = () => {
    resetForm({ close: false });
    setNotice("");
    setShowForm(true);
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
  };

  const save = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const missing = config.required.find((field) => !String(form[field] || "").trim());
    if (missing) return setError(`Enter ${label(missing).toLowerCase()} before saving.`);

    setState("saving");
    const { id, createdAt, updatedAt, ...normalized } = form; // eslint-disable-line no-unused-vars
    if ("price" in normalized) normalized.price = Math.round(Number(normalized.price || 0) * 100);
    if ("total" in normalized) normalized.total = Math.round(Number(normalized.total || 0) * 100);
    if ("durationMinutes" in normalized) normalized.durationMinutes = Number(normalized.durationMinutes || 0);
    if (resource === "offers") {
      normalized.fulfilmentMethods = [normalized.fulfilmentMethod];
      delete normalized.fulfilmentMethod;
      if (["quote", "free"].includes(normalized.pricingMode)) normalized.price = 0;
      normalized.available = normalized.available !== false;
      normalized.category = String(normalized.category || "").trim() || null;
      normalized.prepMinutes = normalized.prepMinutes
        ? Math.max(0, Math.round(Number(normalized.prepMinutes)))
        : null;
      normalized.variants = (normalized.variants || [])
        .filter((variant) => String(variant.label || "").trim())
        .map((variant) => ({
          label: String(variant.label).trim(),
          priceDeltaCents: Math.round(Number(variant.priceDelta || 0) * 100),
        }));
      normalized.modifierGroups = (normalized.modifierGroups || [])
        .filter((group) => String(group.name || "").trim())
        .map((group) => {
          const options = (group.options || [])
            .filter((option) => String(option.label || "").trim())
            .map((option) => ({
              label: String(option.label).trim(),
              priceCents: Math.max(0, Math.round(Number(option.price || 0) * 100)),
            }));
          return {
            name: String(group.name).trim(),
            min: Math.max(0, Math.round(Number(group.min || 0))),
            max: Math.max(0, Math.round(Number(group.max || options.length))),
            options,
          };
        })
        .filter((group) => group.options.length > 0);
    }

    try {
      if (editing) await updateRecord(businessId, resource, editing, normalized);
      else await createRecord(businessId, resource, normalized);
      const action = editing ? "updated" : "added";
      resetForm();
      setNotice(`${capitalize(config.singular)} ${action}.`);
      await load({ quiet: true });
    } catch (err) {
      const missingRecord = err.code === "not-found" || /No document to update/i.test(err.message || "");
      if (missingRecord) {
        resetForm();
        await load({ quiet: true });
        setError(`That ${config.singular} no longer exists. The list has been refreshed.`);
      } else {
        setError(err.message || `Could not save this ${config.singular}.`);
      }
      setState("ready");
    }
  };

  const edit = (record) => {
    const next = { ...record };
    if ("price" in next) next.price = Number(next.price || 0) / 100;
    if ("total" in next) next.total = Number(next.total || 0) / 100;
    if (resource === "offers") {
      next.fulfilmentMethod = next.fulfilmentMethods?.[0] || "pickup";
      next.available = next.available !== false;
      next.category = next.category || "";
      next.prepMinutes = next.prepMinutes || "";
      next.variants = (next.variants || []).map((variant) => ({
        label: variant.label || "",
        priceDelta: (variant.priceDeltaCents || 0) / 100,
      }));
      next.modifierGroups = (next.modifierGroups || []).map((group) => ({
        name: group.name || "",
        min: group.min ?? 0,
        max: group.max ?? (group.options?.length || 0),
        options: (group.options || []).map((option) => ({
          label: option.label || "",
          price: (option.priceCents || 0) / 100,
        })),
      }));
    }
    setForm(next);
    setEditing(record.id);
    setShowForm(true);
    setError("");
    setNotice("");
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
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
    setNotice("");
    try {
      await sendMessage({ ...record, businessId });
      await updateRecord(businessId, resource, record.id, {
        status: "sent",
        sentAt: new Date().toISOString(),
      });
      setNotice(`Message sent to ${record.to}.`);
      await load({ quiet: true });
    } catch (err) {
      setError(err.message || "The message could not be sent.");
      setState("ready");
    }
  };

  const remove = async (record) => {
    if (!window.confirm(`Delete this ${config.singular}?`)) return;
    setError("");
    setNotice("");
    try {
      await deleteRecord(businessId, resource, record.id);
      if (editing === record.id) resetForm();
      setNotice(`${capitalize(config.singular)} deleted.`);
      await load({ quiet: true });
    } catch (err) {
      setError(err.message || `Could not delete this ${config.singular}.`);
    }
  };

  const chooseCustomer = (customerId) => {
    const customer = customers.find((item) => item.id === customerId);
    if (!customer) return;
    setForm((current) => ({
      ...current,
      customerId: customer.id,
      customerName: customer.name || current.customerName,
      to: current.channel === "email"
        ? customer.email || ""
        : customer.phone || "",
    }));
  };

  const changeChannel = (channel) => {
    setForm((current) => {
      const customer = customers.find((item) => item.id === current.customerId);
      return {
        ...current,
        channel,
        to: customer
          ? channel === "email" ? customer.email || "" : customer.phone || ""
          : "",
      };
    });
  };

  const changeStatus = async (record, status) => {
    setError("");
    setNotice("");
    try {
      await updateRecord(businessId, resource, record.id, { status });
      setRecords((current) => current.map((item) =>
        item.id === record.id ? { ...item, status } : item
      ));
      setNotice(`${capitalize(config.singular)} marked ${status}.`);
    } catch (err) {
      setError(err.message || `Could not update this ${config.singular}.`);
    }
  };

  const toggleAvailable = async (record) => {
    const available = !(record.available !== false);
    setError("");
    setNotice("");
    try {
      await updateRecord(businessId, resource, record.id, { available });
      setRecords((current) => current.map((item) =>
        item.id === record.id ? { ...item, available } : item
      ));
      setNotice(available ? `${capitalize(config.singular)} marked available.` : `${capitalize(config.singular)} marked sold out.`);
    } catch (err) {
      setError(err.message || `Could not update this ${config.singular}.`);
    }
  };

  return (
    <section>
      <header className="product-header product-header--actions">
        <div>
          <span className="wl-eyebrow">Manage</span>
          <h2>{capitalize(resource)}</h2>
          <p>{config.description}</p>
        </div>
        <div className="product-header-actions">
          {["products", "services"].includes(resource) && aiEnabled && (
            <button className="wb-btn" onClick={() => setShowAiImport((value) => !value)}>
              <Icon name="sparkles" size={16} /> {showAiImport ? "Close AI import" : "Import image"}
            </button>
          )}
          <button
            className={`wb-btn ${showForm ? "" : "wb-btn-primary"}`}
            onClick={() => showForm ? resetForm() : startNew()}
            aria-expanded={showForm}
          >
            <Icon name={showForm ? "close" : "plus"} size={16} />
            {showForm ? "Close form" : `Add ${config.singular}`}
          </button>
        </div>
      </header>

      {showAiImport && (
        <AIVisualImporter
          businessId={businessId}
          resource={resource}
          onImported={() => load({ quiet: true })}
          onClose={() => setShowAiImport(false)}
        />
      )}

      {error && <p className="product-feedback product-feedback--error" role="alert"><Icon name="settings" size={16} /> {friendlyError(error)}</p>}
      {notice && <p className="product-feedback product-feedback--success" role="status"><Icon name="check" size={16} /> {notice}</p>}

      {showForm && <form className="wb-card product-record-form" onSubmit={save} ref={formRef}>
        <div className="product-form-heading">
          <div>
            <span>{editing ? "Editing" : "New"}</span>
            <h3>{editing ? `Update ${config.singular}` : `Add ${config.singular}`}</h3>
          </div>
          {resource === "messages" && <span className="wb-badge wb-badge-accent">{String(form.channel || "sms").toUpperCase()}</span>}
        </div>

        {customers.length > 0 && ["messages", "orders", "bookings"].includes(resource) && (
          <label className="wb-field product-customer-picker">
            <span className="wb-field-label">Use saved customer</span>
            <select className="wb-input wb-select" value={form.customerId || ""} onChange={(event) => chooseCustomer(event.target.value)}>
              <option value="">Choose a customer (optional)</option>
              {customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}{customer.phone || customer.email ? ` · ${customer.phone || customer.email}` : ""}</option>)}
            </select>
          </label>
        )}

        <div className="product-form-grid">
          {config.fields
            .filter((field) => foodAware || !FOOD_ONLY_FIELDS.has(field))
            .map((field) => (
            <label className={`wb-field ${TEXTAREA_FIELDS.has(field) ? "product-field--wide" : ""} ${CHECKBOX_FIELDS.has(field) ? "wb-field--checkbox" : ""}`} key={field}>
              {CHECKBOX_FIELDS.has(field) ? (
                <>
                  <input
                    type="checkbox"
                    checked={form[field] !== false}
                    onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.checked }))}
                  />
                  <span className="wb-field-label">{field === "available" ? "In stock / available" : label(field)}</span>
                </>
              ) : field === "channel" ? (
                <>
                  <span className="wb-field-label">{label(field)}</span>
                  <select className="wb-input wb-select" value={form.channel || "sms"} onChange={(event) => changeChannel(event.target.value)}>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </>
              ) : SELECT_FIELDS[field] ? (
                <>
                  <span className="wb-field-label">{label(field)}</span>
                  <select className="wb-input wb-select" value={form[field] || ""} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}>
                    {SELECT_FIELDS[field].map(([value, text]) => <option value={value} key={value}>{text}</option>)}
                  </select>
                </>
              ) : TEXTAREA_FIELDS.has(field) ? (
                <>
                  <span className="wb-field-label">{label(field)}</span>
                  <textarea className="wb-input wb-textarea" rows="3" value={form[field] || ""} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} />
                </>
              ) : (
                <>
                  <span className="wb-field-label">{field === "prepMinutes" ? "Prep time (minutes)" : label(field)}</span>
                  <input
                    className="wb-input"
                    type={NUMBER_FIELDS.has(field) ? "number" : field === "startTime" ? "datetime-local" : field === "email" || (field === "to" && form.channel === "email") ? "email" : "text"}
                    min={NUMBER_FIELDS.has(field) ? "0" : undefined}
                    step={field === "price" || field === "total" ? "0.01" : undefined}
                    value={form[field] || ""}
                    onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                  />
                </>
              )}
            </label>
          ))}
        </div>

        {resource === "offers" && foodAware && (
          <OfferOptionsEditor form={form} setForm={setForm} />
        )}

        {["offers", "products", "services"].includes(resource) && (
          <div className="product-record-image">
            <div>{form.imageUrl ? <img src={form.imageUrl} alt="" /> : <span>No image selected</span>}</div>
            <label className="wb-btn">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => event.target.files?.[0] && uploadImage(event.target.files[0])} />
              {imageState === "uploading" ? "Uploading…" : form.imageUrl ? "Replace image" : "Add image"}
            </label>
            {form.imageUrl && <button className="wb-btn wb-btn-ghost" type="button" onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))}>Remove</button>}
          </div>
        )}

        <div className="product-form-actions">
          <button className="wb-btn wb-btn-primary" disabled={state === "saving"}>{state === "saving" ? "Saving…" : editing ? "Save changes" : `Add ${config.singular}`}</button>
          <button className="wb-btn" type="button" onClick={() => resetForm()}>Cancel</button>
        </div>
      </form>}

      {state === "loading" ? (
        <div className="wb-skeleton product-record-skeleton" />
      ) : records.length === 0 ? (
        <div className="wb-card product-empty">
          <span className="product-state-icon"><Icon name={resource === "messages" ? "site" : "grid"} /></span>
          <h3>No {resource} yet</h3>
          <p>Website activity will appear here automatically, or add the first {config.singular} yourself.</p>
          <button className="wb-btn wb-btn-primary" onClick={startNew}><Icon name="plus" size={16} /> Add {config.singular}</button>
        </div>
      ) : (
        <div className="wb-card product-table-wrap">
          <table className="wb-table product-table">
            <thead><tr><th>Name</th><th>Status</th><th>Value</th><th>Actions</th></tr></thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td data-label="Name">
                    <strong>{record.name || record.customerName || record.serviceName || "Untitled"}</strong>
                    {resource === "offers" && record.available === false && (
                      <small className="product-record-detail product-record-detail--danger">Sold out</small>
                    )}
                    {resource === "offers" && record.stockCount != null && (
                      <small className="product-record-detail">{record.stockCount} left</small>
                    )}
                    {resource === "orders" && record.publicReference && (
                      <small className="product-record-detail">{record.publicReference}</small>
                    )}
                    {resource === "orders" && record.items?.length > 0 && (
                      <small className="product-record-detail">
                        {record.items.map((item) => `${item.quantity || 1} × ${item.name}`).join(", ")}
                      </small>
                    )}
                    {resource === "orders" && record.fulfilment?.method && (
                      <small className="product-record-detail">
                        {label(record.fulfilment.method)}
                        {record.fulfilment.requestedStartTime ? ` · ${formatDate(record.fulfilment.requestedStartTime)}` : ""}
                      </small>
                    )}
                    {resource === "orders" && record.paymentStatus && (
                      <small className="product-record-detail">
                        Payment: {label(record.paymentStatus)}
                        {record.payment?.channel ? ` · ${label(record.payment.channel)}` : ""}
                      </small>
                    )}
                    {resource === "bookings" && record.startTime && (
                      <small className="product-record-detail">{formatDate(record.startTime)}</small>
                    )}
                  </td>
                  <td data-label="Status"><span className={`wb-badge ${badge(record.status)}`}>{record.status || "active"}</span></td>
                  <td data-label="Value">{money(record.price ?? record.total)}</td>
                  <td data-label="Actions">
                    <div className="product-row-actions">
                      {!(resource === "orders" && record.schemaVersion === 2) && (
                        <button className="wb-btn wb-btn-sm" onClick={() => edit(record)}>Edit</button>
                      )}
                      {resource === "orders" && nextOrderStep(record) && (
                        <button className="wb-btn wb-btn-primary wb-btn-sm" onClick={() => changeStatus(record, nextOrderStep(record).status)}>{nextOrderStep(record).label}</button>
                      )}
                      {resource === "bookings" && record.status === "requested" && (
                        <button className="wb-btn wb-btn-primary wb-btn-sm" onClick={() => changeStatus(record, "confirmed")}>Confirm</button>
                      )}
                      {resource === "bookings" && record.status === "confirmed" && (
                        <button className="wb-btn wb-btn-primary wb-btn-sm" onClick={() => changeStatus(record, "completed")}>Complete</button>
                      )}
                      {["orders", "bookings"].includes(resource) && canCancelOrder(record.status) && (
                        <button className="wb-btn wb-btn-sm" onClick={() => changeStatus(record, "cancelled")}>Cancel</button>
                      )}
                      {resource === "messages" && record.status !== "sent" && <button className="wb-btn wb-btn-accent wb-btn-sm" onClick={() => send(record)}>Send {record.channel === "email" ? "email" : "SMS"}</button>}
                      {resource === "offers" && (
                        <button className="wb-btn wb-btn-sm" onClick={() => toggleAvailable(record)}>
                          {record.available === false ? "Mark available" : "Mark sold out"}
                        </button>
                      )}
                      <button className="wb-btn wb-btn-danger wb-btn-sm" onClick={() => remove(record)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// Repeatable-row editors for an offer's size/variant options and add-on
// modifier groups. Prices are entered in Rand here; ResourceManager.save()
// converts to minor units on submit, matching the price/total fields.
function OfferOptionsEditor({ form, setForm }) {
  const variants = form.variants || [];
  const modifierGroups = form.modifierGroups || [];

  const addVariant = () => setForm((current) => ({
    ...current,
    variants: [...(current.variants || []), { label: "", priceDelta: 0 }],
  }));
  const updateVariant = (index, patch) => setForm((current) => ({
    ...current,
    variants: current.variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)),
  }));
  const removeVariant = (index) => setForm((current) => ({
    ...current,
    variants: current.variants.filter((_, i) => i !== index),
  }));

  const addModifierGroup = () => setForm((current) => ({
    ...current,
    modifierGroups: [...(current.modifierGroups || []), { name: "", min: 0, max: 1, options: [{ label: "", price: 0 }] }],
  }));
  const updateModifierGroup = (index, patch) => setForm((current) => ({
    ...current,
    modifierGroups: current.modifierGroups.map((group, i) => (i === index ? { ...group, ...patch } : group)),
  }));
  const removeModifierGroup = (index) => setForm((current) => ({
    ...current,
    modifierGroups: current.modifierGroups.filter((_, i) => i !== index),
  }));
  const addOption = (groupIndex) => setForm((current) => ({
    ...current,
    modifierGroups: current.modifierGroups.map((group, i) =>
      i === groupIndex ? { ...group, options: [...group.options, { label: "", price: 0 }] } : group
    ),
  }));
  const updateOption = (groupIndex, optionIndex, patch) => setForm((current) => ({
    ...current,
    modifierGroups: current.modifierGroups.map((group, i) =>
      i === groupIndex
        ? { ...group, options: group.options.map((option, j) => (j === optionIndex ? { ...option, ...patch } : option)) }
        : group
    ),
  }));
  const removeOption = (groupIndex, optionIndex) => setForm((current) => ({
    ...current,
    modifierGroups: current.modifierGroups.map((group, i) =>
      i === groupIndex ? { ...group, options: group.options.filter((_, j) => j !== optionIndex) } : group
    ),
  }));

  return (
    <div className="product-offer-options">
      <div className="product-offer-options-section">
        <div className="product-offer-options-heading">
          <h4>Size / variant options</h4>
          <p>e.g. Small, Regular, Large — each with a price difference from the base price.</p>
        </div>
        {variants.map((variant, index) => (
          <div className="product-option-row" key={index}>
            <input
              className="wb-input"
              placeholder="Label, e.g. Large"
              value={variant.label}
              onChange={(event) => updateVariant(index, { label: event.target.value })}
            />
            <input
              className="wb-input"
              type="number"
              step="0.01"
              placeholder="+ price (R)"
              value={variant.priceDelta}
              onChange={(event) => updateVariant(index, { priceDelta: event.target.value })}
            />
            <button type="button" className="wb-btn wb-btn-ghost wb-btn-sm" onClick={() => removeVariant(index)}>Remove</button>
          </div>
        ))}
        <button type="button" className="wb-btn wb-btn-sm" onClick={addVariant}>Add variant</button>
      </div>

      <div className="product-offer-options-section">
        <div className="product-offer-options-heading">
          <h4>Add-ons / modifiers</h4>
          <p>Grouped extras like toppings. Set how many a customer must or may choose per group.</p>
        </div>
        {modifierGroups.map((group, groupIndex) => (
          <div className="product-modifier-group" key={groupIndex}>
            <div className="product-modifier-group-head">
              <input
                className="wb-input"
                placeholder="Group name, e.g. Extras"
                value={group.name}
                onChange={(event) => updateModifierGroup(groupIndex, { name: event.target.value })}
              />
              <label>Min <input className="wb-input" type="number" min="0" value={group.min} onChange={(event) => updateModifierGroup(groupIndex, { min: event.target.value })} /></label>
              <label>Max <input className="wb-input" type="number" min="0" value={group.max} onChange={(event) => updateModifierGroup(groupIndex, { max: event.target.value })} /></label>
              <button type="button" className="wb-btn wb-btn-ghost wb-btn-sm" onClick={() => removeModifierGroup(groupIndex)}>Remove group</button>
            </div>
            {group.options.map((option, optionIndex) => (
              <div className="product-option-row" key={optionIndex}>
                <input
                  className="wb-input"
                  placeholder="Option, e.g. Cheese"
                  value={option.label}
                  onChange={(event) => updateOption(groupIndex, optionIndex, { label: event.target.value })}
                />
                <input
                  className="wb-input"
                  type="number"
                  step="0.01"
                  placeholder="+ price (R)"
                  value={option.price}
                  onChange={(event) => updateOption(groupIndex, optionIndex, { price: event.target.value })}
                />
                <button type="button" className="wb-btn wb-btn-ghost wb-btn-sm" onClick={() => removeOption(groupIndex, optionIndex)}>Remove</button>
              </div>
            ))}
            <button type="button" className="wb-btn wb-btn-sm" onClick={() => addOption(groupIndex)}>Add option</button>
          </div>
        ))}
        <button type="button" className="wb-btn wb-btn-sm" onClick={addModifierGroup}>Add modifier group</button>
      </div>
    </div>
  );
}

const label = (value) => value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());
const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const money = (cents) => cents == null ? "—" : new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);
const badge = (status) =>
  ["active", "completed", "confirmed", "sent"].includes(status) ? "wb-badge-success"
  : status === "cancelled" ? "wb-badge-danger"
  : ["ready", "out_for_delivery"].includes(status) ? "wb-badge-accent"
  : "wb-badge-warning";
const formatDate = (value) => {
  const date = value?.toDate?.() || new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
};
const friendlyError = (message) => /No document to update/i.test(message)
  ? "This item was removed elsewhere. Refresh the list and try again."
  : message;

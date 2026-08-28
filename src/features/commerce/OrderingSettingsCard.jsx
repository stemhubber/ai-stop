import { useState } from "react";
import { updateBusiness } from "../../services/businessRepository";
import { isFoodBusiness } from "./foodMode";
import "./orderingSettings.css";

// Owner control for the food-ordering vertical: the accepting-orders switch, a
// customer-facing paused reason + reopen time, opening hours, a default prep
// estimate, and the `foodOrdering` escape hatch. Rendered both in the Business
// profile tab (always reachable) and at the top of the Kitchen tab.
export default function OrderingSettingsCard({ business, onSaved }) {
  const [form, setForm] = useState({
    foodOrdering: business.foodOrdering === true,
    acceptingOrders: business.ordering?.acceptingOrders !== false,
    pausedReason: business.ordering?.pausedReason || "",
    pausedUntil: toLocalInput(business.ordering?.pausedUntil),
    hoursDisplay: business.hours?.display || "",
    prepDefaultMinutes: business.prepDefaultMinutes ?? "",
  });
  const [state, setState] = useState("idle");
  const [feedback, setFeedback] = useState("");

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const save = async (event) => {
    event.preventDefault();
    setState("saving");
    setFeedback("");
    try {
      const prep = Number(form.prepDefaultMinutes);
      await updateBusiness(business.id, {
        foodOrdering: form.foodOrdering,
        ordering: {
          acceptingOrders: form.acceptingOrders,
          pausedReason: form.acceptingOrders ? "" : form.pausedReason.trim(),
          pausedUntil: form.acceptingOrders || !form.pausedUntil
            ? null
            : new Date(form.pausedUntil).toISOString(),
        },
        hours: { display: form.hoursDisplay.trim() },
        prepDefaultMinutes: Number.isFinite(prep) && prep > 0 ? Math.round(prep) : null,
      });
      await onSaved?.();
      setFeedback("Ordering settings saved.");
      setState("saved");
    } catch (error) {
      setFeedback(error.message || "Could not save ordering settings.");
      setState("error");
    }
  };

  const foodAware = isFoodBusiness({ ...business, foodOrdering: form.foodOrdering });

  return (
    <form className="wb-card product-profile-form" onSubmit={save}>
      <header className="product-form-heading">
        <div>
          <span>Food ordering</span>
          <h3>Ordering &amp; kitchen</h3>
        </div>
      </header>

      <label className="wb-toggle-row">
        <span>
          <strong>Food-ordering tools</strong>
          <small>Kitchen board, prep times, and the customer order tracker.</small>
        </span>
        <span className="wb-toggle">
          <input
            type="checkbox"
            checked={form.foodOrdering}
            onChange={(event) => set("foodOrdering", event.target.checked)}
          />
          <span className="wb-toggle-track" />
          <span className="wb-toggle-thumb" />
        </span>
      </label>

      {foodAware && (
        <>
          <label className="wb-toggle-row">
            <span>
              <strong>Accepting orders</strong>
              <small>Turn off to stop new orders and checkouts immediately.</small>
            </span>
            <span className="wb-toggle">
              <input
                type="checkbox"
                checked={form.acceptingOrders}
                onChange={(event) => set("acceptingOrders", event.target.checked)}
              />
              <span className="wb-toggle-track" />
              <span className="wb-toggle-thumb" />
            </span>
          </label>

          {!form.acceptingOrders && (
            <div className="product-form-grid">
              <label className="wb-field product-field--wide">
                <span className="wb-field-label">Message shown to customers</span>
                <input
                  className="wb-input"
                  value={form.pausedReason}
                  placeholder="e.g. Kitchen closed — back tomorrow at 10am"
                  onChange={(event) => set("pausedReason", event.target.value)}
                />
              </label>
              <label className="wb-field">
                <span className="wb-field-label">Reopens (optional)</span>
                <input
                  className="wb-input"
                  type="datetime-local"
                  value={form.pausedUntil}
                  onChange={(event) => set("pausedUntil", event.target.value)}
                />
              </label>
            </div>
          )}

          <div className="product-form-grid">
            <label className="wb-field">
              <span className="wb-field-label">Opening hours (shown on your page)</span>
              <input
                className="wb-input"
                value={form.hoursDisplay}
                placeholder="Mon–Sat 10:00–22:00"
                onChange={(event) => set("hoursDisplay", event.target.value)}
              />
            </label>
            <label className="wb-field">
              <span className="wb-field-label">Default prep time (minutes)</span>
              <input
                className="wb-input"
                type="number"
                min="0"
                value={form.prepDefaultMinutes}
                onChange={(event) => set("prepDefaultMinutes", event.target.value)}
              />
            </label>
          </div>
        </>
      )}

      {feedback && (
        <p
          className={`product-feedback ${state === "error" ? "product-feedback--error" : "product-feedback--success"}`}
          role="status"
        >
          {feedback}
        </p>
      )}
      <div className="product-form-actions">
        <button className="wb-btn wb-btn-primary" disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : "Save ordering settings"}
        </button>
      </div>
    </form>
  );
}

function toLocalInput(value) {
  if (!value) return "";
  const date = value?.toDate?.() || new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  // datetime-local wants "YYYY-MM-DDTHH:mm" in local time.
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

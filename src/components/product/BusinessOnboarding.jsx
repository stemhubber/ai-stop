import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBusiness } from "../../context/BusinessContext";
import { createBusiness } from "../../services/businessRepository";
import { generateBusinessProfile } from "../../services/aiService";
import { Button, Icon, Modal } from "../../features/websites/components/WebiloUI";
import "./product.css";

const OPTIONS = ["commerce", "bookings", "orders", "messages", "marketing", "analytics", "payments"];

export default function BusinessOnboarding() {
  const { user } = useAuth();
  const { refreshBusinesses, setActiveBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    category: "retail",
    description: "",
    audience: "",
    goal: "",
    phone: "",
    email: user?.email || "",
    city: "",
    modules: ["commerce", "orders"],
    websitePreferences: {
      tone: "Warm and professional",
      font: "modern",
      template: "organic",
      palette: "#6d5dfc",
    },
  });
  const [showPrompt, setShowPrompt] = useState(true);
  const [businessPrompt, setBusinessPrompt] = useState("");
  const [aiState, setAiState] = useState("idle");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.email && !form.email) {
      setForm((current) => ({ ...current, email: user.email }));
    }
  }, [user?.email, form.email]);

  const change = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const toggle = (moduleId) =>
    setForm((current) => ({
      ...current,
      modules: current.modules.includes(moduleId)
        ? current.modules.filter((item) => item !== moduleId)
        : [...current.modules, moduleId],
    }));

  const fillWithAI = async () => {
    if (businessPrompt.trim().length < 20) {
      return setError("Describe what you do, who you serve, and what you want to achieve.");
    }
    setAiState("loading");
    setError("");
    try {
      const profile = await generateBusinessProfile(businessPrompt);
      setForm((current) => ({
        ...current,
        name: profile.name || current.name,
        category: profile.category || current.category,
        description: profile.description || current.description,
        audience: profile.audience || current.audience,
        goal: profile.goal || current.goal,
        modules: profile.modules?.length ? profile.modules : current.modules,
        websitePreferences: {
          tone: profile.tone,
          font: profile.font,
          template: profile.template,
          palette: profile.palette,
        },
      }));
      setShowPrompt(false);
      setAiState("done");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "AI could not prepare the business profile.");
      setAiState("idle");
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return setError("Enter your business name.");
    if (!form.description.trim()) return setError("Describe what your business does.");
    setSaving(true);
    setError("");
    try {
      const business = await createBusiness(user.uid, form);
      await refreshBusinesses();
      setActiveBusinessId(business.id);
      navigate("/business");
    } catch (err) {
      setError(err.message || "Could not create the business.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="product-auth-shell">
      <form className="wb-card product-onboarding" onSubmit={submit}>
        <div className="product-onboarding-heading">
          <div><span className="wb-label">Webilo setup</span><h1 className="wb-display">Review your business</h1><p className="wb-secondary">AI can prepare the first draft. You stay in control of every field and module.</p></div>
          <button className="wb-btn wb-btn-accent" type="button" onClick={() => setShowPrompt(true)}><Icon name="sparkles" size={17} /> Tell AI about my business</button>
        </div>
        <div className="wb-grid-2">
          <Field label="Business name"><input className="wb-input" value={form.name} onChange={change("name")} /></Field>
          <Field label="Category"><select className="wb-input wb-select" value={form.category} onChange={change("category")}><option value="retail">Retail</option><option value="restaurant">Restaurant</option><option value="salon">Salon</option><option value="services">Professional services</option><option value="education">Education</option><option value="other">Other</option></select></Field>
          <Field label="Email"><input className="wb-input" type="email" value={form.email} onChange={change("email")} /></Field>
          <Field label="South African phone"><input className="wb-input" value={form.phone} onChange={change("phone")} placeholder="071 234 5678" /></Field>
          <Field label="City"><input className="wb-input" value={form.city} onChange={change("city")} /></Field>
          <Field label="Primary goal"><input className="wb-input" value={form.goal} onChange={change("goal")} placeholder="e.g. Get more bookings" /></Field>
        </div>
        <Field label="What does the business do?"><textarea className="wb-input wb-textarea" value={form.description} onChange={change("description")} /></Field>
        <Field label="Who is it for?"><input className="wb-input" value={form.audience} onChange={change("audience")} placeholder="e.g. Busy professionals in Johannesburg" /></Field>
        <div className="product-design-recommendation">
          <Icon name="palette" />
          <div><strong>Website direction</strong><p>{form.websitePreferences.template} template · {form.websitePreferences.font} type · {form.websitePreferences.tone}</p></div>
          <span style={{ background: form.websitePreferences.palette }} />
        </div>
        <fieldset className="product-module-picker">
          <legend className="wb-field-label">Modules</legend>
          <div className="wb-grid-3">{OPTIONS.map((item) => <label className="product-check" key={item}><input type="checkbox" checked={form.modules.includes(item)} onChange={() => toggle(item)} /> <span>{item}</span></label>)}</div>
        </fieldset>
        {error && !showPrompt && <p className="wb-field-error" role="alert">{error}</p>}
        <button className="wb-btn wb-btn-accent wb-btn-lg" disabled={saving}>{saving ? "Creating…" : "Create business"}</button>
      </form>
      <Modal
        open={showPrompt}
        title="Tell me about your business"
        description="What do you do, who do you serve, what makes you different, and what should the website help you achieve?"
        onClose={() => setShowPrompt(false)}
        actions={<><Button onClick={() => setShowPrompt(false)}>Fill it myself</Button><Button variant="primary" icon="sparkles" onClick={fillWithAI} disabled={aiState === "loading"}>{aiState === "loading" ? "Preparing setup…" : "Fill setup with AI"}</Button></>}
      >
        <label className="wl-field"><span>Business description</span><textarea rows="7" value={businessPrompt} onChange={(event) => setBusinessPrompt(event.target.value)} placeholder="We run a natural hair salon in Soweto for women who want healthy, low-maintenance styles. We offer appointments and sell hair products. We want more bookings and repeat clients." /></label>
        {error && <p className="wl-publish-error" role="alert">{error}</p>}
        <div className="wl-ai-note"><Icon name="sparkles" /><div><strong>AI will prepare, not publish</strong><p>You will review the business profile, modules, font, colour, and template before anything is saved.</p></div></div>
      </Modal>
    </main>
  );
}

function Field({ label, children }) {
  return <label className="wb-field"><span className="wb-field-label">{label}</span>{children}</label>;
}

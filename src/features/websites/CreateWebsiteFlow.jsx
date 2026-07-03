import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWebsites } from "../../context/WebsiteContext";
import { buildWebsitePlan } from "./websiteModel";
import { AppLayout, Button, Icon, PageHeader, Stepper } from "./components/WebiloUI";
import { generateWebsiteDraft } from "../../services/aiService";
import { useBusiness } from "../../context/BusinessContext";

const steps = ["Business", "Direction", "Pages", "Review"];
const pageOptions = [
  ["home", "Home", "Your main welcome and value proposition"],
  ["about", "About", "Your story, values, and credibility"],
  ["services", "Services", "What you offer and how it works"],
  ["portfolio", "Portfolio", "Examples, projects, or a visual gallery"],
  ["contact", "Contact", "A clear way for visitors to reach you"],
];
const palettes = ["#6d5dfc", "#176b54", "#c2542d", "#1f5ea8", "#a13462", "#25252b"];
const progressSteps = [
  "Understanding your business",
  "Creating website structure",
  "Writing page content",
  "Choosing layout sections",
  "Applying visual style",
  "Preparing your preview",
];

export default function CreateWebsiteFlow() {
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState({
    businessName: "",
    businessType: "",
    description: "",
    audience: "",
    goal: "Get more enquiries",
    tone: "Warm and professional",
    font: "modern",
    palette: palettes[0],
    pages: ["home", "about", "services", "contact"],
  });
  const [errors, setErrors] = useState({});
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generationError, setGenerationError] = useState("");
  const { createProject } = useWebsites();
  const { activeBusiness } = useBusiness();
  const navigate = useNavigate();
  const plan = useMemo(() => buildWebsitePlan(brief), [brief]);

  useEffect(() => {
    if (!activeBusiness || brief.businessName) return;
    setBrief((current) => ({
      ...current,
      businessId: activeBusiness.id,
      businessName: activeBusiness.name || "",
      businessType: activeBusiness.category || "",
      description: activeBusiness.description || "",
      audience: activeBusiness.audience || "",
      goal: activeBusiness.goal || current.goal,
      tone: activeBusiness.websitePreferences?.tone || current.tone,
      font: activeBusiness.websitePreferences?.font || current.font,
      template: activeBusiness.websitePreferences?.template || "organic",
      palette: activeBusiness.websitePreferences?.palette || current.palette,
    }));
  }, [activeBusiness, brief.businessName]);

  useEffect(() => {
    if (!generating) return undefined;
    let cancelled = false;
    const timer = setInterval(() => setProgress((value) => Math.min(value + 1, progressSteps.length - 1)), 700);
    async function generate() {
      try {
        const [blueprint] = await Promise.all([
          generateWebsiteDraft(brief),
          new Promise((resolve) => setTimeout(resolve, 3500)),
        ]);
        if (cancelled) return;
        const project = createProject(brief, blueprint);
        navigate(`/editor/${project.id}`, { replace: true, state: { justCreated: true } });
      } catch (error) {
        if (cancelled) return;
        setGenerationError(
          error.response?.data?.error ||
          error.message ||
          "AI could not create the draft. Try again."
        );
        setGenerating(false);
        setProgress(0);
      }
    }
    generate();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [generating, brief, createProject, navigate]);

  const update = (field, value) => setBrief((current) => ({ ...current, [field]: value }));
  const togglePage = (slug) => {
    if (slug === "home") return;
    update("pages", brief.pages.includes(slug) ? brief.pages.filter((page) => page !== slug) : [...brief.pages, slug]);
  };
  const next = () => {
    const nextErrors = {};
    if (step === 0 && !brief.businessName.trim()) nextErrors.businessName = "Enter the name you want visitors to see.";
    if (step === 0 && !brief.businessType.trim()) nextErrors.businessType = "Describe the type of business or project.";
    if (step === 0 && brief.description.trim().length < 20) nextErrors.description = "Add at least one sentence so Webilo has enough context.";
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) setStep((value) => Math.min(value + 1, steps.length - 1));
  };

  if (generating) {
    return (
      <div className="wl-generation">
        <div className="wl-generation__visual">
          <div className="wl-generation__window"><span /><span /><span /><i /><i /><i /></div>
          <span className="wl-generation__orb"><Icon name="sparkles" size={28} /></span>
        </div>
        <p className="wl-eyebrow">Building {brief.businessName}</p>
        <h1>Your first draft is taking shape</h1>
        <p>Webilo is using your approved plan. You can edit every word, section, and colour next.</p>
        <ol>
          {progressSteps.map((item, index) => (
            <li className={index < progress ? "complete" : index === progress ? "active" : ""} key={item}>
              <span>{index < progress ? <Icon name="check" size={13} /> : index + 1}</span>{item}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="wl-create-page">
        <div className="wl-create-top">
          <button onClick={() => step ? setStep(step - 1) : navigate("/app")}><span>←</span> {step ? "Back" : "Websites"}</button>
          <Stepper steps={steps} current={step} />
          <span>Step {step + 1} of {steps.length}</span>
        </div>
        <div className="wl-create-grid">
          <section className="wl-create-form">
            {step === 0 && (
              <>
                <PageHeader eyebrow="Tell us about your idea" title="What are you building?" description="Plain language is perfect. This gives Webilo the context it needs to plan your site." />
                <label className="wl-field"><span>Business or project name</span><input autoFocus value={brief.businessName} onChange={(e) => update("businessName", e.target.value)} placeholder="e.g. Moya Wellness Studio" />{errors.businessName && <small>{errors.businessName}</small>}</label>
                <label className="wl-field"><span>What kind of business is it?</span><input value={brief.businessType} onChange={(e) => update("businessType", e.target.value)} placeholder="e.g. Yoga and wellness studio" />{errors.businessType && <small>{errors.businessType}</small>}</label>
                <label className="wl-field"><span>Describe what you do</span><textarea value={brief.description} onChange={(e) => update("description", e.target.value)} placeholder="We help busy professionals feel stronger and less stressed through small-group classes..." rows="5" /><em>{brief.description.length}/300</em>{errors.description && <small>{errors.description}</small>}</label>
                <label className="wl-field"><span>Who is it for? <i>Optional</i></span><input value={brief.audience} onChange={(e) => update("audience", e.target.value)} placeholder="e.g. Busy professionals in Johannesburg" /></label>
              </>
            )}
            {step === 1 && (
              <>
                <PageHeader eyebrow="Set the direction" title="What should this website achieve?" description="Choose the outcome and feeling. You can fine-tune the design later." />
                <fieldset className="wl-choice-group"><legend>Main website goal</legend>{["Get more enquiries", "Sell products or services", "Showcase my work", "Build trust and awareness"].map((value) => <label className={brief.goal === value ? "selected" : ""} key={value}><input type="radio" name="goal" checked={brief.goal === value} onChange={() => update("goal", value)} /><span><strong>{value}</strong><small>{value === "Get more enquiries" ? "Guide visitors towards contacting or booking you." : value === "Sell products or services" ? "Explain your offer and drive purchase intent." : value === "Showcase my work" ? "Lead with projects, proof, and visual impact." : "Tell a clear story and establish credibility."}</small></span><i><Icon name="check" size={14} /></i></label>)}</fieldset>
                <fieldset className="wl-choice-group wl-choice-group--compact"><legend>Tone and style</legend>{["Warm and professional", "Bold and energetic", "Minimal and refined", "Friendly and playful"].map((value) => <label className={brief.tone === value ? "selected" : ""} key={value}><input type="radio" name="tone" checked={brief.tone === value} onChange={() => update("tone", value)} /><span><strong>{value}</strong></span><i><Icon name="check" size={14} /></i></label>)}</fieldset>
                <div className="wl-field"><span>Brand colour</span><div className="wl-palette">{palettes.map((color) => <button className={brief.palette === color ? "selected" : ""} style={{ background: color }} onClick={() => update("palette", color)} aria-label={`Use ${color}`} key={color} />)}<label><input type="color" value={brief.palette} onChange={(e) => update("palette", e.target.value)} /><Icon name="plus" /></label></div></div>
              </>
            )}
            {step === 2 && (
              <>
                <PageHeader eyebrow="Shape the website" title="Which pages do you need?" description="We recommend a focused starting structure. Add or remove pages at any time in the editor." />
                <div className="wl-page-choices">
                  {pageOptions.map(([slug, title, description]) => (
                    <label className={brief.pages.includes(slug) ? "selected" : ""} key={slug}>
                      <input type="checkbox" checked={brief.pages.includes(slug)} disabled={slug === "home"} onChange={() => togglePage(slug)} />
                      <span><Icon name={slug === "portfolio" ? "image" : "site"} /><span><strong>{title}</strong><small>{description}</small></span></span>
                      <i>{slug === "home" ? "Required" : <Icon name="check" size={14} />}</i>
                    </label>
                  ))}
                </div>
                <div className="wl-ai-note"><Icon name="sparkles" /><div><strong>AI recommendation</strong><p>A focused four-page website is usually easier to navigate and maintain. Start lean; grow when your content is ready.</p></div></div>
              </>
            )}
            {step === 3 && (
              <>
                <PageHeader eyebrow="Review the plan" title="Here’s the structure Webilo will build" description="Review the outline before content and design are generated. Nothing is published automatically." />
                <div className="wl-plan-summary"><span style={{ background: brief.palette }}><Icon name="sparkles" /></span><div><strong>{plan.name}</strong><p>{plan.summary}</p></div><button onClick={() => setStep(0)}>Edit brief</button></div>
                <div className="wl-plan-pages">
                  {plan.pages.map((page, index) => (
                    <article key={page.slug}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div><strong>{page.title}</strong><p>{page.sections.map((section) => section.replace(/([A-Z])/g, " $1")).join(" · ")}</p></div>
                      <small>{page.sections.length} sections</small>
                    </article>
                  ))}
                </div>
                <div className="wl-ai-note"><Icon name="check" /><div><strong>You stay in control</strong><p>The result opens as a draft. Edit the copy, reorder sections, change the theme, and preview every device before publishing.</p></div></div>
                {generationError && <p className="wl-generation-error" role="alert">{generationError}</p>}
              </>
            )}
            <footer className="wl-create-actions">
              {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
              {step < steps.length - 1 ? <Button variant="primary" icon="arrow" onClick={next}>Continue</Button> : <Button variant="primary" icon="sparkles" onClick={() => { setGenerationError(""); setGenerating(true); }}>Generate with AI</Button>}
            </footer>
          </section>
          <aside className="wl-create-preview">
            <div className="wl-brief-preview">
              <div className="wl-brief-preview__top"><span /><span /><span /></div>
              <div className="wl-brief-preview__nav"><strong>{brief.businessName || "Your business"}</strong><i /><i /><button style={{ background: brief.palette }} /></div>
              <div className="wl-brief-preview__hero"><span style={{ color: brief.palette }}>{brief.businessType || "Your business type"}</span><strong>{brief.businessName ? `${brief.businessName}, built around what matters` : "Your headline will take shape here"}</strong><p>{brief.description || "Tell Webilo what you do and a clear first draft will appear here."}</p><button style={{ background: brief.palette }} /></div>
              <div className="wl-brief-preview__cards"><i /><i /><i /></div>
            </div>
            <p><Icon name="sparkles" size={15} /> Live direction preview</p>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}

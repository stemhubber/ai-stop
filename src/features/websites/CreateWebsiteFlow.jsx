import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWebsites } from "../../context/WebsiteContext";
import { useBusiness } from "../../context/BusinessContext";
import { buildWebsitePlan } from "./websiteModel";
import { AppLayout, Button, Icon, PageHeader, Stepper } from "./components/WebiloUI";
import { generateWebsiteDraft } from "../../services/aiService";
import WebiloAnimatedLogo from "../../components/WebiloAnimatedLogo";

const steps = ["Strategy", "Pages", "Review"];
const pageOptions = [
  ["home", "Home", "Your main welcome and value proposition"],
  ["about", "About", "Your story, values, and credibility"],
  ["services", "Services", "What you offer and how it works"],
  ["portfolio", "Portfolio", "Examples, projects, or a visual gallery"],
  ["contact", "Contact", "A clear way for visitors to reach you"],
];
const palettes = ["#176b5d", "#234b63", "#9a5a35", "#4f6847", "#8a4f56", "#25252b"];
const progressSteps = [
  "Reading your business profile",
  "Creating customer-focused structure",
  "Writing specific business content",
  "Connecting calls to action",
  "Applying your brand direction",
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
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generationError, setGenerationError] = useState("");
  const { createProject } = useWebsites();
  const { activeBusiness, loadingBusinesses } = useBusiness();
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
    if (!loadingBusinesses && !activeBusiness) navigate("/onboarding", { replace: true });
  }, [activeBusiness, loadingBusinesses, navigate]);

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
        setGenerationError(error.response?.data?.error || error.message || "AI could not create the draft. Try again.");
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

  if (generating) {
    return (
      <div className="wl-generation">
        <div className="wl-generation__visual">
          <div className="wl-generation__window"><span /><span /><span /><i /><i /><i /></div>
          <WebiloAnimatedLogo size={78} className="wl-generation-logo" />
        </div>
        <p className="wl-eyebrow">Bringing {brief.businessName} online</p>
        <h1>Building your website</h1>
        <p>You can review everything before publishing.</p>
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

  if (loadingBusinesses || !activeBusiness || !brief.businessName) {
    return <AppLayout><div className="wl-generation"><WebiloAnimatedLogo size={76} showWordmark wordmarkSize={28} /><p>Loading your business foundation…</p></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="wl-create-page">
        <div className="wl-create-top">
          <button onClick={() => step ? setStep(step - 1) : navigate("/websites")}><span>←</span> {step ? "Back" : "Website"}</button>
          <Stepper steps={steps} current={step} />
          <span>Step {step + 1} of {steps.length}</span>
        </div>
        <div className="wl-create-grid">
          <section className="wl-create-form">
            {step === 0 && (
              <>
                <PageHeader eyebrow={activeBusiness.name} title="Choose the website goal" />
                <div className="wl-business-source">
                  <span><Icon name="check" /></span>
                  <div>
                    <strong>Connected to {activeBusiness.name}</strong>
                    <p>{activeBusiness.description}</p>
                  </div>
                  <button onClick={() => navigate("/business?tab=profile")}>Edit business profile</button>
                </div>
                <fieldset className="wl-choice-group"><legend>Main customer outcome</legend>{["Get more enquiries", "Sell products or services", "Showcase my work", "Build trust and awareness"].map((value) => <label className={brief.goal === value ? "selected" : ""} key={value}><input type="radio" name="goal" checked={brief.goal === value} onChange={() => update("goal", value)} /><span><strong>{value}</strong><small>{value === "Get more enquiries" ? "Guide visitors towards contacting or booking you." : value === "Sell products or services" ? "Explain your offer and drive purchase intent." : value === "Showcase my work" ? "Lead with projects, proof, and visual impact." : "Tell a clear story and establish credibility."}</small></span><i><Icon name="check" size={14} /></i></label>)}</fieldset>
                <fieldset className="wl-choice-group wl-choice-group--compact"><legend>Tone and style</legend>{["Warm and professional", "Bold and energetic", "Minimal and refined", "Friendly and playful"].map((value) => <label className={brief.tone === value ? "selected" : ""} key={value}><input type="radio" name="tone" checked={brief.tone === value} onChange={() => update("tone", value)} /><span><strong>{value}</strong></span><i><Icon name="check" size={14} /></i></label>)}</fieldset>
                <div className="wl-field"><span>Brand colour</span><div className="wl-palette">{palettes.map((color) => <button type="button" className={brief.palette === color ? "selected" : ""} style={{ background: color }} onClick={() => update("palette", color)} aria-label={`Use ${color}`} key={color} />)}<label><input type="color" value={brief.palette} onChange={(event) => update("palette", event.target.value)} /><Icon name="plus" /></label></div></div>
              </>
            )}
            {step === 1 && (
              <>
                <PageHeader eyebrow="Pages" title="What should customers see?" />
                <div className="wl-page-choices">
                  {pageOptions.map(([slug, title, description]) => (
                    <label className={brief.pages.includes(slug) ? "selected" : ""} key={slug}>
                      <input type="checkbox" checked={brief.pages.includes(slug)} disabled={slug === "home"} onChange={() => togglePage(slug)} />
                      <span><Icon name={slug === "portfolio" ? "image" : "site"} /><span><strong>{title}</strong><small>{description}</small></span></span>
                      <i>{slug === "home" ? "Required" : <Icon name="check" size={14} />}</i>
                    </label>
                  ))}
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <PageHeader eyebrow="Review" title="Your website plan" description="Nothing is published automatically." />
                <div className="wl-plan-summary"><span style={{ background: brief.palette }}><Icon name="sparkles" /></span><div><strong>{plan.name}</strong><p>{plan.summary}</p></div><button onClick={() => setStep(0)}>Edit strategy</button></div>
                <div className="wl-plan-pages">
                  {plan.pages.map((page, index) => (
                    <article key={page.slug}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div><strong>{page.title}</strong><p>{page.sections.map((section) => section.replace(/([A-Z])/g, " $1")).join(" · ")}</p></div>
                      <small>{page.sections.length} sections</small>
                    </article>
                  ))}
                </div>
                {generationError && <p className="wl-generation-error" role="alert">{generationError}</p>}
              </>
            )}
            <footer className="wl-create-actions">
              {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
              {step < steps.length - 1 ? <Button variant="primary" icon="arrow" onClick={() => setStep((value) => value + 1)}>Continue</Button> : <Button variant="primary" icon="sparkles" onClick={() => { setGenerationError(""); setGenerating(true); }}>Build business website</Button>}
            </footer>
          </section>
          <aside className="wl-create-preview">
            <div className="wl-brief-preview">
              <div className="wl-brief-preview__top"><span /><span /><span /></div>
              <div className="wl-brief-preview__nav"><strong>{brief.businessName}</strong><i /><i /><button style={{ background: brief.palette }} /></div>
              <div className="wl-brief-preview__hero"><span style={{ color: brief.palette }}>{brief.businessType}</span><strong>{brief.businessName}, built around what matters</strong><p>{brief.description}</p><button style={{ background: brief.palette }} /></div>
              <div className="wl-brief-preview__cards"><i /><i /><i /></div>
            </div>
            <p><Icon name="sparkles" size={15} /> Connected business preview</p>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}

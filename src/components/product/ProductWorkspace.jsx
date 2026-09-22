import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useBusiness } from "../../context/BusinessContext";
import { useWebsites } from "../../context/WebsiteContext";
import { hasRecords, listModules, listRecords, setModuleEnabled, updateBusiness } from "../../services/businessRepository";
import { AppLayout, Icon } from "../../features/websites/components/WebiloUI";
import ResourceManager from "./ResourceManager";
import BusinessAdvisor from "./BusinessAdvisor";
import KitchenBoard from "../../features/commerce/KitchenBoard";
import OrderingSettingsCard from "../../features/commerce/OrderingSettingsCard";
import { PrintSurface } from "../../features/commerce/PrintableTicket";
import { resolveWorkspaceProfile } from "../../features/commerce/foodMode";
import WebiloAnimatedLogo from "../WebiloAnimatedLogo";
import VoiceInput from "../VoiceInput";
import { FeatureGate, ProPrompt } from "../../features/plans/PlanUI";
import { usePlan } from "../../context/PlanContext";
import { buildLaunchPath, JOURNEY_RESOURCES } from "./businessJourney";
import { BUSINESS_CATEGORIES } from "../../config/businessCategories";
import {
  deriveWorkspaceLocation,
  getLastSection,
  isSellSectionAvailable,
  resolveTarget,
  RESOURCE_SECTION_IDS,
  sectionIdForModule,
  sectionMeta,
  setLastSection,
  SELL_SECTIONS,
  SETUP_SECTIONS,
  SETUP_EXTRAS,
  VIEW_LABELS,
} from "./workspaceSections";
import {
  connectPaystackSubaccount,
  getPaymentConnection,
} from "../../services/paymentConnectionService";
import "./product.css";

// Per-module display metadata for the Modules configuration screen only —
// unrelated to Sell/Setup navigation, kept separate from workspaceSections.js.
const MODULE_DETAILS = {
  website: ["Website", "Public site and website builder", "site"],
  commerce: ["Offers", "Products, services, packages and quote requests", "grid"],
  bookings: ["Bookings", "Client booking requests", "clock"],
  customers: ["Customers", "Contact and lead records", "grid"],
  orders: ["Orders", "Client orders and fulfilment", "grid"],
  messages: ["Messages", "Direct customer communication", "site"],
  marketing: ["Campaigns", "Saved marketing campaigns", "sparkles"],
  analytics: ["Analytics", "Live business performance", "grid"],
  ai: ["AI tools", "Image import and assisted setup", "sparkles"],
  payments: ["Online checkout", "Cart and webhook-confirmed Paystack payments", "settings"],
};

export default function ProductWorkspace() {
  const {
    businesses,
    activeBusiness,
    activeBusinessId,
    setActiveBusinessId,
    loadingBusinesses,
    businessError,
    refreshBusinesses,
  } = useBusiness();
  const { projects } = useWebsites();
  const [searchParams, setSearchParams] = useSearchParams();
  const { view, section, needsRedirect } = deriveWorkspaceLocation({
    view: searchParams.get("view"),
    section: searchParams.get("section"),
    tab: searchParams.get("tab"),
  });
  const [modules, setModules] = useState([]);
  const [moduleState, setModuleState] = useState("loading");
  const [journeyRecords, setJourneyRecords] = useState({});
  const [journeyState, setJourneyState] = useState("loading");
  const [workspaceMode, setWorkspaceMode] = useState(() => {
    try {
      return window.localStorage.getItem("webilo.workspaceMode") || "guided";
    } catch {
      return "guided";
    }
  });
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    if (!activeBusinessId) return undefined;
    setModuleState("loading");
    listModules(activeBusinessId)
      .then((items) => {
        if (!cancelled) {
          setModules(items);
          setModuleState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setModuleState("error");
      });
    return () => { cancelled = true; };
  }, [activeBusinessId]);

  useEffect(() => {
    let cancelled = false;
    if (!activeBusinessId || view !== "today") return undefined;
    setJourneyState("loading");
    Promise.all(
      JOURNEY_RESOURCES.map((resource) =>
        listRecords(activeBusinessId, resource).catch(() => [])
      )
    ).then((results) => {
      if (cancelled) return;
      setJourneyRecords(Object.fromEntries(
        JOURNEY_RESOURCES.map((resource, index) => [resource, results[index]])
      ));
      setJourneyState("ready");
    });
    return () => { cancelled = true; };
  }, [activeBusinessId, view]);

  // One small limit(1) existence check per legacy resource, loaded once
  // alongside listModules — not a full collection scan. Defaults to hidden
  // (false) while loading, so Products/Services never flash into the nav
  // before we know whether this business actually has any.
  const [legacyResources, setLegacyResources] = useState({ products: false, services: false });
  const [legacyResourceState, setLegacyResourceState] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    if (!activeBusinessId) return undefined;
    setLegacyResourceState("loading");
    setLegacyResources({ products: false, services: false });
    Promise.all([
      hasRecords(activeBusinessId, "products").catch(() => false),
      hasRecords(activeBusinessId, "services").catch(() => false),
    ]).then(([products, services]) => {
      if (cancelled) return;
      setLegacyResources({ products, services });
      setLegacyResourceState("ready");
    });
    return () => { cancelled = true; };
  }, [activeBusinessId]);

  const enabledModules = useMemo(
    () => new Set(modules.filter((item) => item.enabled).map((item) => item.moduleId)),
    [modules]
  );
  // The single source of truth for what this business's item-management
  // section is called (Offers/Menu/Catalog) and whether it sees Kitchen.
  const workspaceProfile = useMemo(() => resolveWorkspaceProfile(activeBusiness), [activeBusiness]);
  const foodAware = workspaceProfile.kind === "food";
  const sectionAvailability = useMemo(
    () => ({ enabledModules, foodAware, hasLegacyProducts: legacyResources.products, hasLegacyServices: legacyResources.services }),
    [enabledModules, foodAware, legacyResources]
  );
  // The single source of truth for which Sell sections this business can
  // reach — feeds the sub-nav, Today's "Connected tools" cards, and the Sell
  // grid so food-only sections and legacy Products/Services records with
  // nothing in them never leak into the workspace.
  const visibleSellSections = useMemo(
    () => SELL_SECTIONS
      .filter((item) => isSellSectionAvailable(item, sectionAvailability))
      .map((item) => item.id === "offers" ? { ...item, label: workspaceProfile.offersLabel } : item),
    [sectionAvailability, workspaceProfile]
  );
  // Setup's own sections (profile, ordering, modules) are always available.
  const visibleSetupSections = SETUP_SECTIONS;

  const goTo = useCallback((nextView, nextSection, options = {}) => {
    const params = {};
    if (nextView && nextView !== "today") params.view = nextView;
    if (nextSection) params.section = nextSection;
    setSearchParams(params, options.replace ? { replace: true } : undefined);
    if (nextSection && nextView && nextView !== "today") {
      setLastSection(nextView, nextSection);
    }
    if (!options.silent) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [setSearchParams]);

  // Corrects the URL when it arrived via a stale `?tab=` link or an
  // unrecognised `view` — lands on that destination's grid rather than
  // dead-ending, matching the old fallback-to-overview behavior.
  useEffect(() => {
    if (!needsRedirect) return;
    goTo(view, section, { replace: true, silent: true });
  }, [needsRedirect, view, section, goTo]);

  // If the currently open section's module gets disabled (or a food-only
  // section is opened on a non-food business, or a Products/Services deep
  // link turns out to have no legacy records) elsewhere, bounce back to
  // that view's grid instead of leaving a broken section on screen. Waits
  // for the legacy-record check to finish before judging Products/Services,
  // so a direct link to a section that *does* have data isn't yanked away
  // while that check is still loading.
  useEffect(() => {
    if (moduleState !== "ready" || !section) return;
    const meta = sectionMeta(section);
    if (!meta) return;
    const isLegacyGated = section === "products" || section === "services";
    if (isLegacyGated && legacyResourceState !== "ready") return;
    const isSellSection = SELL_SECTIONS.some((item) => item.id === section);
    const available = isSellSection ? isSellSectionAvailable(meta, sectionAvailability) : true;
    if (!available) {
      goTo(view, null, { replace: true, silent: true });
    }
  }, [moduleState, section, view, sectionAvailability, legacyResourceState, goTo]);

  const switchView = (nextView) => {
    if (nextView === "today") {
      goTo("today", null);
      return;
    }
    const remembered = getLastSection(nextView);
    const sections = nextView === "sell" ? visibleSellSections : visibleSetupSections;
    const valid = remembered && sections.some((item) => item.id === remembered);
    goTo(nextView, valid ? remembered : null);
  };

  const openTarget = (id) => {
    const resolved = resolveTarget(id);
    if (!resolved) return;
    if (resolved.external) {
      navigate(resolved.external);
      return;
    }
    goTo(resolved.view, resolved.section);
  };

  const changeWorkspaceMode = (mode) => {
    setWorkspaceMode(mode);
    try {
      window.localStorage.setItem("webilo.workspaceMode", mode);
    } catch {
      // The workspace still works when private browsing blocks local storage.
    }
  };

  if (loadingBusinesses) {
    return <AppLayout><div className="product-page product-page--loading"><WebiloAnimatedLogo size={76} showWordmark wordmarkSize={28} /><p>Loading your business workspace…</p></div></AppLayout>;
  }
  if (businessError) {
    return (
      <AppLayout>
        <div className="product-page product-page--center">
          <div className="wb-card product-load-error">
            <span className="product-state-icon"><Icon name="settings" /></span>
            <h1 className="wb-heading">Your business workspace is unavailable</h1>
            <p className="wb-secondary">{businessError}</p>
            <div className="wb-row">
              <button className="wb-btn wb-btn-primary" onClick={refreshBusinesses}>Try again</button>
              <Link className="wb-btn" to="/">Back to Webilo</Link>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }
  if (!activeBusiness) return <NavigateToOnboarding />;

  const currentSections = view === "sell" ? visibleSellSections : view === "setup" ? [...visibleSetupSections, ...SETUP_EXTRAS] : [];
  const activeSectionMeta = section ? currentSections.find((item) => item.id === section) || sectionMeta(section) : null;
  const pageTitle = view === "today" ? "Today" : activeSectionMeta ? activeSectionMeta.label : VIEW_LABELS[view];

  return (
    <AppLayout>
      <PrintSurface />
      <div className="product-page">
        <header className="product-workspace-header">
          <div>
            <span className="wl-eyebrow">Business workspace</span>
            <h1>{pageTitle}</h1>
            <p>{activeBusiness.name}</p>
          </div>
          <div className="product-workspace-actions">
            <label>
              <span>Active business</span>
              <select className="wb-input wb-select" value={activeBusinessId} onChange={(event) => setActiveBusinessId(event.target.value)}>
                {businesses.map((business) => <option value={business.id} key={business.id}>{business.name}</option>)}
              </select>
            </label>
            <Link className="wb-btn" to={`/b/${activeBusiness.slug}`}><Icon name="external" size={16} /> View site</Link>
            <button className="wb-btn wb-btn-primary" onClick={() => navigate("/onboarding")}><Icon name="plus" size={16} /> Add business</button>
          </div>
        </header>

        <nav className="product-tabs" aria-label="Business workspace">
          {["today", "sell", "setup"].map((id) => (
            <button
              className={`product-tab ${view === id ? "active" : ""}`}
              onClick={() => switchView(id)}
              aria-current={view === id ? "page" : undefined}
              key={id}
            >
              {VIEW_LABELS[id]}
            </button>
          ))}
        </nav>

        {view !== "today" && (
          <nav className="product-subtabs" aria-label={`${VIEW_LABELS[view]} sections`}>
            <button
              className={`product-subtab ${!section ? "active" : ""}`}
              onClick={() => goTo(view, null)}
              aria-current={!section ? "page" : undefined}
            >
              All {VIEW_LABELS[view].toLowerCase()}
            </button>
            {(view === "sell" ? visibleSellSections : visibleSetupSections).map((item) => (
              <button
                className={`product-subtab ${section === item.id ? "active" : ""}`}
                onClick={() => goTo(view, item.id)}
                aria-current={section === item.id ? "page" : undefined}
                key={item.id}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}

        <main className="product-main">
          {view === "today" && (
            <Overview
              business={activeBusiness}
              businesses={businesses}
              activeBusinessId={activeBusinessId}
              modules={modules}
              sellSections={visibleSellSections}
              records={journeyRecords}
              journeyState={journeyState}
              projects={projects}
              workspaceMode={workspaceMode}
              onModeChange={changeWorkspaceMode}
              onOpen={openTarget}
              onSwitch={setActiveBusinessId}
            />
          )}
          {view !== "today" && !section && (
            <SectionGrid
              eyebrow={view === "sell" ? "Sell and serve" : "Business setup"}
              title={view === "sell" ? "Customer transactions" : "Configure this business"}
              items={currentSections}
              onOpen={openTarget}
            />
          )}
          {section === "kitchen" && foodAware && (
            <div className="product-kitchen-tab">
              <div className="product-kitchen-settings-note">
                <p>Accepting-orders, pause messaging, hours, and prep time now live in Setup.</p>
                <button className="wb-btn wb-btn-ghost wb-btn-sm" onClick={() => goTo("setup", "ordering")}>
                  Open Ordering &amp; Kitchen settings <Icon name="chevron" size={14} />
                </button>
              </div>
              <KitchenBoard key={`board-${activeBusinessId}`} businessId={activeBusinessId} business={activeBusiness} />
            </div>
          )}
          {section && RESOURCE_SECTION_IDS.has(section) && (
            <ResourceManager
              key={`${activeBusinessId}:${section}`}
              businessId={activeBusinessId}
              resource={section}
              sectionLabel={activeSectionMeta?.label}
              aiEnabled={enabledModules.has("ai")}
              foodAware={foodAware}
              business={activeBusiness}
            />
          )}
          {section === "profile" && (
            <BusinessProfile
              business={activeBusiness}
              onSaved={refreshBusinesses}
            />
          )}
          {section === "ordering" && (
            <OrderingSettingsSection business={activeBusiness} onSaved={refreshBusinesses} />
          )}
          {section === "analytics" && <Analytics key={activeBusinessId} businessId={activeBusinessId} />}
          {section === "modules" && (
            <ModuleSettings
              businessId={activeBusinessId}
              modules={modules}
              setModules={setModules}
              onOpen={openTarget}
              onBusinessSaved={refreshBusinesses}
            />
          )}
        </main>
      </div>
    </AppLayout>
  );
}

function NavigateToOnboarding() {
  const navigate = useNavigate();
  useEffect(() => navigate("/onboarding", { replace: true }), [navigate]);
  return null;
}

function Overview({
  business,
  businesses,
  activeBusinessId,
  modules,
  sellSections,
  records,
  journeyState,
  projects,
  workspaceMode,
  onModeChange,
  onOpen,
  onSwitch,
}) {
  const enabled = new Set(modules.filter((item) => item.enabled).map((item) => item.moduleId));
  const cards = [
    { id: "profile", label: "Business profile", icon: "settings", description: "Your offer, audience, goals, and contact details" },
    ...(enabled.has("website") ? [{ id: "website", label: "Website", icon: "site", description: "Build, publish, and manage your public site" }] : []),
    ...sellSections,
  ];
  const journeyProjects = projects.map((project) =>
    !project.settings?.businessId && businesses.length === 1
      ? { ...project, settings: { ...project.settings, businessId: business.id } }
      : project
  );
  const readinessItems = buildLaunchPath(business, modules, records, journeyProjects);
  const completed = readinessItems.filter((item) => item.complete).length;
  const readiness = Math.round((completed / readinessItems.length) * 100);
  const nextAction = readinessItems.find((item) => !item.complete);
  const latestMilestone = [...readinessItems].reverse().find((item) => item.complete);
  const activity = [
    { label: "Customers", value: records.customers?.length || 0, target: "customers" },
    { label: "Open orders", value: records.orders?.filter((item) => !["completed", "cancelled"].includes(item.status)).length || 0, target: "orders" },
    { label: "Bookings", value: records.bookings?.length || 0, target: "bookings" },
  ];

  return (
    <section>
      <div className="product-today">
        <div className="product-today-copy">
          <span className="wb-label">{nextAction ? `Step ${completed + 1} of ${readinessItems.length}` : "Ready to run"}</span>
          <h2>{nextAction ? nextAction.label : "Your business foundation is ready"}</h2>
          <p>{nextAction ? nextAction.detail : "Review customer activity or choose a tool to keep moving."}</p>
          <div className="product-today-actions">
            {nextAction && <button className="wb-btn wb-btn-primary" onClick={() => onOpen(nextAction.target)}>Continue <Icon name="arrow" size={16} /></button>}
            <button className="wb-btn" onClick={() => onModeChange(workspaceMode === "guided" ? "advanced" : "guided")}>
              {workspaceMode === "guided" ? "I know what I need" : "Guide me"}
            </button>
          </div>
        </div>
        <div className="product-today-progress" aria-label={`${completed} of ${readinessItems.length} launch steps complete`}>
          <strong>{completed}/{readinessItems.length}</strong>
          <span>launch steps</span>
          <div className="product-readiness-bar"><span style={{ width: `${readiness}%` }} /></div>
          {latestMilestone && <small><Icon name="check" size={13} /> {latestMilestone.label}</small>}
        </div>
      </div>

      {workspaceMode === "guided" && (
        <section className="product-readiness">
          <div className="product-readiness-summary">
            <span className="wl-eyebrow">Launch path</span>
            <h2>{readiness === 100 ? "Setup complete" : "One clear step at a time"}</h2>
            <p>Complete the path in order, or open any step when you need it.</p>
            {journeyState === "loading" && <small className="product-journey-loading">Checking your business activity…</small>}
          </div>
          <div className="product-readiness-list">
            {readinessItems.map((item, index) => (
              <button onClick={() => onOpen(item.target)} key={item.label}>
                <span className={item.complete ? "complete" : ""}><Icon name={item.complete ? "check" : "arrow"} size={14} /></span>
                <strong>{index + 1}. {item.label}</strong>
                <small>{item.complete ? "Complete" : item.detail}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="product-activity">
        <div className="product-section-heading">
          <div><span className="wl-eyebrow">Live business</span><h2>What needs attention</h2></div>
        </div>
        <div className="product-activity-grid">
          {activity.map((item) => (
            <button onClick={() => onOpen(item.target)} key={item.label}>
              <strong>{item.value}</strong><span>{item.label}</span><Icon name="chevron" size={16} />
            </button>
          ))}
        </div>
      </section>

      <BusinessAdvisor business={business} records={records} projects={journeyProjects} />

      <ProPrompt
        title="Go beyond the Core workspace"
        body="Get higher AI and messaging limits plus advanced insights now. Automation and customer segments are next on the Pro roadmap."
        action="See what Pro can do"
      />

      {businesses.length > 1 && (
        <section className="product-businesses">
          <div className="product-section-heading">
            <div><span className="wl-eyebrow">Portfolio</span><h2>Your businesses</h2></div>
            <span>{businesses.length} businesses</span>
          </div>
          <div className="product-business-grid">
            {businesses.map((item) => (
              <button className={item.id === activeBusinessId ? "active" : ""} onClick={() => onSwitch(item.id)} key={item.id}>
                <span>{item.name?.charAt(0).toUpperCase()}</span>
                <div><strong>{item.name}</strong><small>{item.category || "Business"}</small></div>
                {item.id === activeBusinessId ? <em>Active</em> : <Icon name="chevron" size={16} />}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="product-section-heading">
          <div><span className="wl-eyebrow">Connected tools</span><h2>Run this business</h2></div>
          <button onClick={() => onOpen("modules")}>Configure modules <Icon name="chevron" size={15} /></button>
        </div>
        <div className="product-tool-grid">
          {cards.map((card) => (
            <button className="product-tool-card" onClick={() => onOpen(card.id)} key={card.id}>
              <span><Icon name={card.icon || "grid"} /></span>
              <div><h3>{card.label}</h3><p>{card.description}</p></div>
              <Icon name="chevron" size={18} />
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

// Card-grid landing view for the Sell/Setup destinations — picking a card
// drills into that section (or, for SETUP_EXTRAS like "website", navigates
// away). Shared by both views rather than one hub component per view.
function SectionGrid({ eyebrow, title, items, onOpen }) {
  return (
    <section>
      <header className="product-header"><span className="wl-eyebrow">{eyebrow}</span><h2>{title}</h2></header>
      <div className="product-tool-grid">
        {items.map((item) => (
          <button className="product-tool-card" onClick={() => onOpen(item.id)} key={item.id}>
            <span><Icon name={item.icon || "grid"} /></span>
            <div><h3>{item.label}</h3><p>{item.description}</p></div>
            <Icon name="chevron" size={18} />
          </button>
        ))}
      </div>
    </section>
  );
}

function BusinessProfile({ business, onSaved }) {
  const [form, setForm] = useState({
    name: business.name || "",
    category: business.category || "",
    description: business.description || "",
    audience: business.audience || "",
    goal: business.goal || "",
    email: business.email || "",
    phone: business.phone || "",
    city: business.address?.city || "",
  });
  const [state, setState] = useState("idle");
  const [feedback, setFeedback] = useState("");
  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const categoryOptions = useMemo(() => {
    const value = form.category;
    if (!value) return [{ value: "", label: "Select a category" }, ...BUSINESS_CATEGORIES];
    if (BUSINESS_CATEGORIES.some((option) => option.value === value)) return BUSINESS_CATEGORIES;
    // Legacy free-text category not in the canonical list — keep it selectable
    // rather than silently blanking it out.
    return [{ value, label: value }, ...BUSINESS_CATEGORIES];
  }, [form.category]);

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.description.trim()) {
      setFeedback("Add a business name and a clear description before saving.");
      return;
    }
    setState("saving");
    setFeedback("");
    try {
      await updateBusiness(business.id, {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        audience: form.audience.trim(),
        goal: form.goal.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: { ...(business.address || {}), city: form.city.trim(), country: business.address?.country || "South Africa" },
      });
      await onSaved();
      setFeedback("Business profile updated. Connected tools will use this information.");
      setState("saved");
    } catch (error) {
      setFeedback(error.message || "The business profile could not be saved.");
      setState("error");
    }
  };

  return (
    <section>
      <header className="product-header">
        <span className="wl-eyebrow">Business foundation</span>
        <h2>Business profile</h2>
        <p>This is the source of truth for your website, AI recommendations, customer tools, and business content.</p>
      </header>
      <form className="wb-card product-profile-form" onSubmit={save}>
        <div className="product-form-grid">
          <label className="wb-field"><span className="wb-field-label">Business name</span><input className="wb-input" value={form.name} onChange={change("name")} /></label>
          <label className="wb-field"><span className="wb-field-label">Category</span><select className="wb-input wb-select" value={form.category} onChange={change("category")}>{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="wb-field"><span className="wb-field-label">City or service area</span><input className="wb-input" value={form.city} onChange={change("city")} /></label>
          <div className="product-field--wide">
            <label className="wb-field"><span className="wb-field-label">What does the business offer?</span><textarea className="wb-input wb-textarea" rows="4" value={form.description} onChange={change("description")} /></label>
            <VoiceInput
              label="Update the business description by voice"
              onTranscribed={(text) => {
                setForm((current) => ({ ...current, description: [current.description.trim(), text].filter(Boolean).join(current.description.trim() ? " " : "") }));
                setFeedback("");
                setState("idle");
              }}
              onError={(message) => {
                setFeedback(message);
                if (message) setState("error");
              }}
            />
          </div>
          <label className="wb-field"><span className="wb-field-label">Target customers</span><input className="wb-input" value={form.audience} onChange={change("audience")} /></label>
          <label className="wb-field"><span className="wb-field-label">Primary business goal</span><input className="wb-input" value={form.goal} onChange={change("goal")} /></label>
          <label className="wb-field"><span className="wb-field-label">Email</span><input className="wb-input" type="email" value={form.email} onChange={change("email")} /></label>
          <label className="wb-field"><span className="wb-field-label">Phone</span><input className="wb-input" value={form.phone} onChange={change("phone")} /></label>
        </div>
        {feedback && <p className={`product-feedback ${state === "error" ? "product-feedback--error" : "product-feedback--success"}`} role="status">{feedback}</p>}
        <div className="product-form-actions"><button className="wb-btn wb-btn-primary" disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Save business profile"}</button></div>
      </form>
    </section>
  );
}

// Setup's single home for OrderingSettingsCard — previously mounted both
// here and atop the Kitchen tab; Kitchen now just links back to this section.
function OrderingSettingsSection({ business, onSaved }) {
  return (
    <section>
      <header className="product-header">
        <span className="wl-eyebrow">Operations</span>
        <h2>Ordering &amp; kitchen settings</h2>
        <p>Whether this business is accepting orders right now, and the food-ordering tools (Kitchen board, prep times, order tracker) other sections use.</p>
      </header>
      <OrderingSettingsCard business={business} onSaved={onSaved} />
    </section>
  );
}

function ModuleSettings({ businessId, modules, setModules, onOpen, onBusinessSaved }) {
  const [pendingId, setPendingId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [paymentConnection, setPaymentConnection] = useState(null);
  const [subaccountCode, setSubaccountCode] = useState("");
  const [connectionState, setConnectionState] = useState("loading");
  const { can } = usePlan();

  useEffect(() => {
    let cancelled = false;
    setConnectionState("loading");
    getPaymentConnection(businessId)
      .then((connection) => {
        if (!cancelled) {
          setPaymentConnection(connection);
          setConnectionState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setConnectionState("ready");
      });
    return () => { cancelled = true; };
  }, [businessId]);

  const toggle = async (module) => {
    if (module.moduleId === "payments" && !can("paidCheckout")) {
      setFeedback("Online checkout requires Webilo Pro.");
      return;
    }
    if (module.moduleId === "payments" && paymentConnection?.status !== "connected") {
      setFeedback("Connect a Paystack settlement account before enabling checkout.");
      return;
    }
    const nextEnabled = !module.enabled;
    setPendingId(module.id);
    setFeedback("");
    try {
      await setModuleEnabled(businessId, module.moduleId, nextEnabled);
      if (module.moduleId === "payments") {
        await updateBusiness(businessId, { checkoutEnabled: nextEnabled });
        await onBusinessSaved?.();
      }
      setModules((all) => all.map((item) => item.id === module.id ? { ...item, enabled: nextEnabled } : item));
      setFeedback(`${MODULE_DETAILS[module.moduleId]?.[0] || module.moduleId} ${nextEnabled ? "enabled" : "disabled"}.`);
    } catch (error) {
      setFeedback(error.message || "The module could not be updated.");
    } finally {
      setPendingId("");
    }
  };

  const connectPayments = async () => {
    setConnectionState("saving");
    setFeedback("");
    try {
      const connection = await connectPaystackSubaccount(businessId, subaccountCode.trim());
      setPaymentConnection(connection);
      setSubaccountCode("");
      setFeedback(`Paystack settlement connected for ${connection.businessName || "this business"}. Enable checkout when ready.`);
      setModules((all) => all.map((item) => item.moduleId === "payments" ? { ...item, enabled: false } : item));
      await onBusinessSaved?.();
    } catch (error) {
      setFeedback(error.message || "Paystack could not be connected.");
    } finally {
      setConnectionState("ready");
    }
  };

  return (
    <section>
      <header className="product-header">
        <span className="wl-eyebrow">Configuration</span>
        <h2>Connected modules</h2>
        <p>Enabled modules become available in this workspace and share the same business data.</p>
      </header>
      {feedback && <p className="product-inline-status" role="status">{feedback}</p>}
      <div className="product-module-grid">
        {modules.map((module) => {
          const [title, description, icon] = MODULE_DETAILS[module.moduleId] || [module.moduleId, "Business capability", "grid"];
          const proLocked = module.moduleId === "payments" && !can("paidCheckout");
          return (
            <article className={`product-module-card ${module.enabled ? "active" : ""}`} key={module.id}>
              <span><Icon name={icon} /></span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
                <small>{proLocked ? "Webilo Pro" : module.enabled ? "Connected" : "Not shown in workspace"}</small>
              </div>
              <label className="wb-toggle" title={proLocked ? "Upgrade to Pro to enable checkout" : `${module.enabled ? "Disable" : "Enable"} ${title}`}>
                <input type="checkbox" checked={module.enabled && !proLocked} disabled={proLocked || pendingId === module.id || (module.moduleId === "payments" && paymentConnection?.status !== "connected")} onChange={() => toggle(module)} />
                <span className="wb-toggle-track" />
                <span className="wb-toggle-thumb" />
              </label>
              {module.moduleId === "payments" && !proLocked && (
                <div className="product-payment-connect">
                  {paymentConnection?.status === "connected" ? (
                    <p><Icon name="check" size={14} /> Settlement connected to <strong>{paymentConnection.businessName || paymentConnection.subaccountCode}</strong></p>
                  ) : (
                    <>
                      <p>Connect a Paystack subaccount belonging to this integration. Customer revenue settles to that account.</p>
                      <div>
                        <input className="wb-input" value={subaccountCode} onChange={(event) => setSubaccountCode(event.target.value)} placeholder="ACCT_…" aria-label="Paystack subaccount code" />
                        <button className="wb-btn wb-btn-primary wb-btn-sm" disabled={connectionState === "saving" || !subaccountCode.trim()} onClick={connectPayments}>{connectionState === "saving" ? "Checking…" : "Connect"}</button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {module.enabled && sectionIdForModule(module.moduleId) && (
                <button onClick={() => onOpen(sectionIdForModule(module.moduleId))}>Open</button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Analytics({ businessId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    Promise.all(["orders", "customers", "bookings", "products"].map((resource) => listRecords(businessId, resource)))
      .then(([orders, customers, bookings, products]) => {
        if (!cancelled) {
          setData({
            revenue: orders.filter((order) => order.status === "completed").reduce((sum, order) => sum + Number(order.total || 0), 0),
            orders: orders.length,
            completedOrders: orders.filter((order) => order.status === "completed").length,
            customers: customers.length,
            bookings: bookings.length,
            products: products.length,
          });
        }
      })
      .catch((err) => !cancelled && setError(err.message || "Analytics could not be loaded."));
    return () => { cancelled = true; };
  }, [businessId]);
  if (error) return <div className="wb-card product-empty"><h2>Analytics unavailable</h2><p>{error}</p></div>;
  if (!data) return <div className="wb-skeleton product-analytics-skeleton" />;
  const metrics = [
    ["Revenue", new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(data.revenue / 100)],
    ["Orders", data.orders],
    ["Customers", data.customers],
    ["Bookings", data.bookings],
    ["Products", data.products],
  ];
  return (
    <section>
      <header className="product-header"><span className="wl-eyebrow">Performance</span><h2>Analytics</h2><p>Live totals from this business workspace.</p></header>
      <div className="product-metric-grid">{metrics.map(([label, value]) => <div className="wb-metric" key={label}><div className="wb-metric-value">{value}</div><div className="wb-metric-label">{label}</div></div>)}</div>
      <FeatureGate
        entitlement="advancedAnalytics"
        title="Understand what is driving the business"
        body="Pro adds average order value, completion rate, customer value, and operational trends."
      >
        <section className="product-pro-insights">
          <div><span>Average completed order</span><strong>{new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(data.completedOrders ? (data.revenue / data.completedOrders) / 100 : 0)}</strong></div>
          <div><span>Order completion</span><strong>{data.orders ? Math.round((data.completedOrders / data.orders) * 100) : 0}%</strong></div>
          <div><span>Revenue per customer</span><strong>{new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(data.customers ? (data.revenue / data.customers) / 100 : 0)}</strong></div>
        </section>
      </FeatureGate>
    </section>
  );
}

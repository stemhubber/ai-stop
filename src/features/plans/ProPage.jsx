import { Link } from "react-router-dom";
import { usePlan } from "../../context/PlanContext";
import { PLAN_CATALOG } from "../../config/plans";
import { AppLayout, Icon, LoadingScreen } from "../websites/components/WebiloUI";
import { PlanBadge } from "./PlanUI";
import "./plans.css";

const proCapabilities = [
  ["grid", "Paid customer checkout", "Multi-item cart, server-priced checkout, and webhook-confirmed Paystack payments.", "Available now"],
  ["grid", "Advanced insights", "Order completion, customer value, conversion, and operational trends.", "Available now"],
  ["sparkles", "More AI capacity", "Higher monthly limits for business setup, content, images, and voice.", "Available now"],
  ["clock", "Automations", "Reminders, review requests, and follow-ups triggered by business activity.", "Coming next"],
  ["site", "Growth tools", "Custom domains, branding controls, and customer segments.", "Coming next"],
  ["settings", "Team controls", "Staff access, roles, assignments, and an accountable activity history.", "Coming next"],
  ["clock", "Advanced bookings", "Availability, deposits, staff calendars, reminders, and rescheduling.", "Coming next"],
];

const comparison = [
  ["Business workspace", true, true],
  ["Connected website", true, true],
  ["Orders and booking requests", true, true],
  ["Cart and Paystack checkout", false, true],
  ["AI actions each month", "30", "500"],
  ["Messages each month", "25", "1,000"],
  ["Advanced analytics", false, true],
  ["Automations and CRM segments", false, "Coming next"],
  ["Custom domains and team roles", false, "Coming next"],
];

export default function ProPage() {
  const { isPro, plan, account, loadingPlan } = usePlan();
  const pro = PLAN_CATALOG.pro;
  const expiresAt = account.planExpiresAt?.toDate?.() || (
    account.planExpiresAt ? new Date(account.planExpiresAt) : null
  );
  if (loadingPlan) return <LoadingScreen label="Loading your plan" />;

  return (
    <AppLayout>
      <main className="plan-page">
        <section className="plan-hero">
          <div>
            <PlanBadge />
            <h1>{isPro ? "Your Pro workspace" : "Run more of the business on autopilot."}</h1>
            <p>{isPro
              ? "Your higher fair-use limits and Pro permissions are active."
              : "Get deeper insights and higher AI and messaging limits today, plus early access as new Pro tools launch."}</p>
            <div className="plan-hero__actions">
              {isPro
                ? <Link className="wb-btn wb-btn-primary" to="/usage">View usage</Link>
                : <Link className="wb-btn wb-btn-primary wb-btn-lg" to="/billing?plan=pro">Get Pro for R{pro.price} / 30 days</Link>}
              <Link className="wb-btn wb-btn-lg" to="/business">Back to business</Link>
            </div>
            {isPro && expiresAt && <small>Current access ends {expiresAt.toLocaleDateString("en-ZA", { dateStyle: "long" })}.</small>}
          </div>
          <div className="plan-hero__summary">
            <span>Current plan</span>
            <strong>{plan.name}</strong>
            <p>{plan.description}</p>
            <Link to="/usage">Usage and fair-use limits <Icon name="chevron" size={15} /></Link>
          </div>
        </section>

        <section className="plan-section">
          <header><span className="wl-eyebrow">Work smarter</span><h2>What Pro unlocks</h2></header>
          <div className="plan-capability-grid">
            {proCapabilities.map(([icon, title, description, status]) => (
              <article key={title}>
                <div><span><Icon name={icon} /></span><em className={status === "Available now" ? "available" : ""}>{status}</em></div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="plan-section">
          <header><span className="wl-eyebrow">Compare</span><h2>Core and Pro</h2></header>
          <div className="plan-comparison">
            <div className="plan-comparison__head"><span>Capability</span><strong>Core</strong><strong>Pro</strong></div>
            {comparison.map(([label, coreValue, proValue]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{renderValue(coreValue)}</strong>
                <strong className="pro">{renderValue(proValue)}</strong>
              </div>
            ))}
          </div>
        </section>

        {!isPro && (
          <section className="plan-final">
            <div><span className="wl-eyebrow">Upgrade when ready</span><h2>Keep Core. Add Pro when the business needs more.</h2></div>
            <Link className="wb-btn wb-btn-primary wb-btn-lg" to="/billing?plan=pro">Upgrade to Pro</Link>
          </section>
        )}
      </main>
    </AppLayout>
  );
}

function renderValue(value) {
  if (value === true) return <Icon name="check" size={16} />;
  if (value === false) return "—";
  return value;
}

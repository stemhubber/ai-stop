import { Link } from "react-router-dom";
import { USAGE_METRICS } from "../../config/plans";
import { usePlan } from "../../context/PlanContext";
import { AppLayout, Icon, LoadingScreen } from "../websites/components/WebiloUI";
import { PlanBadge, UsageMeter } from "./PlanUI";
import "./plans.css";

export default function UsagePage() {
  const { usage, limit, plan, period, isPro, loadingPlan } = usePlan();
  if (loadingPlan) return <LoadingScreen label="Loading usage" />;
  return (
    <AppLayout>
      <main className="plan-page">
        <header className="usage-header">
          <div><PlanBadge /><h1>Usage and fair use</h1><p>Usage resets monthly. Limits protect service quality and keep provider costs predictable.</p></div>
          {!isPro && <Link className="wb-btn wb-btn-primary" to="/pro">Increase limits with Pro <Icon name="arrow" size={15} /></Link>}
        </header>

        <section className="usage-summary">
          <div><span>Plan</span><strong>{plan.name}</strong></div>
          <div><span>Period</span><strong>{formatPeriod(period)}</strong></div>
          <div><span>Status</span><strong>Active</strong></div>
        </section>

        <section className="usage-list">
          {USAGE_METRICS.map((metric) => (
            <UsageMeter
              key={metric.id}
              label={metric.label}
              description={metric.description}
              value={usage[metric.id] || 0}
              limit={limit(metric.id)}
            />
          ))}
        </section>

        <section className="usage-policy">
          <Icon name="settings" />
          <div>
            <h2>How fair use works</h2>
            <p>Webilo checks usage before starting provider-backed work. If a monthly limit is reached, existing business data remains available and you can continue using non-metered tools. Upgrade or wait for the next monthly reset to use that metered action again.</p>
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

function formatPeriod(period) {
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

import { Link } from "react-router-dom";
import { usePlan } from "../../context/PlanContext";
import { Icon } from "../websites/components/WebiloUI";
import "./plans.css";

export function PlanBadge({ compact = false }) {
  const { plan, isPro } = usePlan();
  return (
    <span className={`plan-badge ${isPro ? "plan-badge--pro" : ""} ${compact ? "plan-badge--compact" : ""}`}>
      {isPro && <Icon name="sparkles" size={compact ? 11 : 13} />}
      {plan.name}
    </span>
  );
}

export function UsageMeter({ label, description, value = 0, limit }) {
  const unlimited = limit == null;
  const percentage = unlimited ? 0 : Math.min(100, Math.round((value / Math.max(limit, 1)) * 100));
  const warning = !unlimited && percentage >= 80;
  return (
    <article className={`usage-meter ${warning ? "usage-meter--warning" : ""}`}>
      <header>
        <div><strong>{label}</strong>{description && <small>{description}</small>}</div>
        <span>{formatUsage(value)}{!unlimited && ` / ${formatUsage(limit)}`}</span>
      </header>
      {!unlimited && <div className="usage-meter__track"><span style={{ width: `${percentage}%` }} /></div>}
      <footer>{unlimited ? "Unlimited" : `${Math.max(0, limit - value).toLocaleString()} remaining this month`}</footer>
    </article>
  );
}

export function ProPrompt({
  title,
  body,
  action = "Explore Pro",
  compact = false,
}) {
  const { isPro } = usePlan();
  if (isPro) return null;
  return (
    <aside className={`pro-prompt ${compact ? "pro-prompt--compact" : ""}`}>
      <span><Icon name="sparkles" /></span>
      <div><em>Webilo Pro</em><strong>{title}</strong>{body && <p>{body}</p>}</div>
      <Link to="/pro">{action}<Icon name="arrow" size={15} /></Link>
    </aside>
  );
}

export function FeatureGate({ entitlement, children, title, body }) {
  const { can } = usePlan();
  if (can(entitlement)) return children;
  return <ProPrompt title={title} body={body} action="See Pro features" />;
}

function formatUsage(value) {
  return new Intl.NumberFormat("en-ZA", {
    notation: Number(value) >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBusiness } from "../../context/BusinessContext";
import { listModules, listRecords, setModuleEnabled } from "../../services/businessRepository";
import ResourceManager from "./ResourceManager";
import "./product.css";

const RESOURCES = ["overview", "products", "services", "customers", "orders", "bookings", "messages", "campaigns", "analytics", "modules"];

export default function ProductWorkspace() {
  const { logout } = useAuth();
  const { businesses, activeBusiness, activeBusinessId, setActiveBusinessId, loadingBusinesses, businessError, refreshBusinesses } = useBusiness();
  const [tab, setTab] = useState("overview");
  const [modules, setModules] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeBusinessId) listModules(activeBusinessId).then(setModules);
  }, [activeBusinessId]);

  if (loadingBusinesses) return <main className="product-auth-shell"><div className="wb-skeleton" style={{ width: 400, height: 180 }} /></main>;
  if (businessError) return <main className="product-auth-shell"><div className="wb-card product-load-error"><h1 className="wb-heading">Business tools are unavailable</h1><p className="wb-secondary">{businessError}</p><button className="wb-btn wb-btn-primary" onClick={refreshBusinesses}>Try again</button><Link className="wb-btn" to="/app">Back to websites</Link></div></main>;
  if (!activeBusiness) return <NavigateToOnboarding />;

  return (
    <div className="product-shell">
      <nav className="product-nav"><div className="wb-container product-nav-inner">
        <Link className="product-brand" to="/app">Webilo</Link>
        <select className="wb-input wb-select" value={activeBusinessId} onChange={(e) => setActiveBusinessId(e.target.value)}>{businesses.map((business) => <option value={business.id} key={business.id}>{business.name}</option>)}</select>
        <div className="wb-row"><Link className="wb-btn wb-btn-sm" to={`/b/${activeBusiness.slug}`}>View site</Link><button className="wb-btn wb-btn-ghost wb-btn-sm" onClick={async () => { await logout(); navigate("/"); }}>Sign out</button></div>
      </div><div className="wb-container product-tabs">{RESOURCES.map((item) => <button className={`product-tab ${tab === item ? "active" : ""}`} onClick={() => setTab(item)} key={item}>{item}</button>)}<button className="product-tab" onClick={() => navigate("/onboarding")}>+ Business</button></div></nav>
      <main className="wb-container product-main">
        {tab === "overview" && <Overview business={activeBusiness} modules={modules} onOpen={setTab} />}
        {["products", "services", "customers", "orders", "bookings", "messages", "campaigns"].includes(tab) && <ResourceManager businessId={activeBusinessId} resource={tab} />}
        {tab === "analytics" && <Analytics businessId={activeBusinessId} />}
        {tab === "modules" && <ModuleSettings businessId={activeBusinessId} modules={modules} setModules={setModules} />}
      </main>
    </div>
  );
}

function NavigateToOnboarding() { const navigate = useNavigate(); useEffect(() => navigate("/onboarding", { replace: true }), [navigate]); return null; }
function Overview({ business, modules, onOpen }) {
  const cards = [["Products", "products"], ["Services", "services"], ["Customers", "customers"], ["Orders", "orders"], ["Bookings", "bookings"], ["Messages", "messages"], ["Marketing", "campaigns"], ["Analytics", "analytics"], ["Modules", "modules"]];
  return <section><header className="product-header"><span className="wb-label">{business.category}</span><h1 className="wb-display">{business.name}</h1><p className="wb-secondary">{business.description || "Your business operating system is ready."}</p></header><div className="wb-grid-3">{cards.map(([title, tab]) => <button className="wb-card wb-card-hover" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => onOpen(tab)} key={tab}><h2 className="wb-heading">{title}</h2><p className="wb-secondary">{tab === "modules" ? `${modules.filter((item) => item.enabled).length} active modules` : `Manage ${tab}`}</p></button>)}</div></section>;
}
function ModuleSettings({ businessId, modules, setModules }) {
  const toggle = async (module) => { await setModuleEnabled(businessId, module.moduleId, !module.enabled); setModules((all) => all.map((item) => item.id === module.id ? { ...item, enabled: !item.enabled } : item)); };
  return <section><header className="product-header"><span className="wb-label">Configuration</span><h1 className="wb-display">Modules</h1></header><div className="wb-grid-3">{modules.map((module) => <div className="wb-card wb-row-between" key={module.id}><div><h2 className="wb-subheading">{module.moduleId}</h2><p className="wb-secondary">{module.enabled ? "Enabled" : "Disabled"}</p></div><label className="wb-toggle"><input type="checkbox" checked={module.enabled} onChange={() => toggle(module)} /><span className="wb-toggle-track"></span><span className="wb-toggle-thumb"></span></label></div>)}</div></section>;
}

function Analytics({ businessId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    Promise.all(["orders", "customers", "bookings", "products"].map((resource) => listRecords(businessId, resource)))
      .then(([orders, customers, bookings, products]) => setData({
        revenue: orders.filter((order) => order.status === "completed").reduce((sum, order) => sum + Number(order.total || 0), 0),
        orders: orders.length,
        customers: customers.length,
        bookings: bookings.length,
        products: products.length,
      }));
  }, [businessId]);
  if (!data) return <div className="wb-skeleton" style={{ height: 180 }} />;
  const metrics = [["Revenue", new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(data.revenue / 100)], ["Orders", data.orders], ["Customers", data.customers], ["Bookings", data.bookings], ["Products", data.products]];
  return <section><header className="product-header"><span className="wb-label">Performance</span><h1 className="wb-display">Analytics</h1></header><div className="wb-grid-3">{metrics.map(([label, value]) => <div className="wb-metric" key={label}><div className="wb-metric-value">{value}</div><div className="wb-metric-label">{label}</div></div>)}</div></section>;
}

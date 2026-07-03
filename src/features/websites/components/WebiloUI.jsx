import { useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

const icons = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" /><path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Zm14-1 .7 1.8 1.8.7-1.8.7L19 18l-.7-1.8-1.8-.7 1.8-.7L19 13Z" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  chevron: <><path d="m9 18 6-6-6-6" /></>,
  site: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M7 6.5h.01M10 6.5h.01" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  desktop: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  tablet: <><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M11 18h2" /></>,
  mobile: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
  layers: <><path d="m12 3-9 5 9 5 9-5-9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18h1.5a1.5 1.5 0 0 0 0-3H12a2 2 0 0 1 0-4h2a7 7 0 0 0-2-11Z" /><circle cx="7.5" cy="10.5" r=".8" fill="currentColor" stroke="none" /><circle cx="10" cy="7" r=".8" fill="currentColor" stroke="none" /><circle cx="14" cy="7" r=".8" fill="currentColor" stroke="none" /><circle cx="17" cy="10" r=".8" fill="currentColor" stroke="none" /></>,
  undo: <><path d="M9 7 4 12l5 5" /><path d="M20 17a8 8 0 0 0-13-6" /></>,
  redo: <><path d="m15 7 5 5-5 5" /><path d="M4 17a8 8 0 0 1 13-6" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
  save: <><path d="M5 3h12l2 2v16H5V3Z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></>,
  rocket: <><path d="M14 5c2.5-2.5 5.5-2 5.5-2s.5 3-2 5.5L13 13l-4-4 5-4Z" /><path d="M9 9H5l-3 3 6 1M13 13v4l-3 3-1-6M5 17l2 2" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  logout: <><path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 15-5-5L5 20" /></>,
};

export function Icon({ name, size = 18, className = "" }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name] || icons.site}
    </svg>
  );
}

export function Button({ variant = "default", size = "md", icon, children, className = "", ...props }) {
  return (
    <button className={`wl-button wl-button--${variant} wl-button--${size} ${className}`} {...props}>
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 18} />}
      <span>{children}</span>
    </button>
  );
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="wl-page-header">
      <div>
        {eyebrow && <p className="wl-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="wl-page-header__action">{action}</div>}
    </header>
  );
}

export function EmptyState({ icon = "site", title, body, action }) {
  return (
    <div className="wl-empty">
      <span className="wl-empty__icon"><Icon name={icon} size={24} /></span>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Stepper({ steps, current }) {
  return (
    <ol className="wl-stepper" aria-label="Progress">
      {steps.map((step, index) => (
        <li className={index < current ? "complete" : index === current ? "current" : ""} key={step}>
          <span>{index < current ? <Icon name="check" size={13} /> : index + 1}</span>
          <em>{step}</em>
        </li>
      ))}
    </ol>
  );
}

export function DeviceToggle({ value, onChange }) {
  return (
    <div className="wl-device-toggle" aria-label="Preview size">
      {["desktop", "tablet", "mobile"].map((device) => (
        <button
          className={value === device ? "active" : ""}
          onClick={() => onChange(device)}
          aria-label={`${device} preview`}
          aria-pressed={value === device}
          title={`${device} preview`}
          key={device}
        >
          <Icon name={device} size={17} />
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, title, description, children, onClose, actions }) {
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="wl-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="wl-modal" role="dialog" aria-modal="true" aria-labelledby="wl-modal-title">
        <button className="wl-icon-button wl-modal__close" onClick={onClose} aria-label="Close dialog"><Icon name="close" /></button>
        <header>
          <h2 id="wl-modal-title">{title}</h2>
          {description && <p>{description}</p>}
        </header>
        <div className="wl-modal__content">{children}</div>
        {actions && <footer>{actions}</footer>}
      </section>
    </div>
  );
}

export function Toast({ message, tone = "success", onClose }) {
  useEffect(() => {
    const timeout = setTimeout(onClose, 3200);
    return () => clearTimeout(timeout);
  }, [onClose]);

  return (
    <div className={`wl-toast wl-toast--${tone}`} role="status">
      <span><Icon name={tone === "success" ? "check" : "site"} size={16} /></span>
      <p>{message}</p>
      <button onClick={onClose} aria-label="Dismiss"><Icon name="close" size={15} /></button>
    </div>
  );
}

export function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const links = [
    { to: "/app", label: "Websites", icon: "grid", end: true },
    { to: "/create", label: "Create website", icon: "sparkles" },
  ];

  return (
    <div className="wl-app-shell">
      <aside className="wl-sidebar">
        <Link to="/app" className="wl-brand" aria-label="Webilo dashboard">
          <span>W</span><strong>webilo</strong>
        </Link>
        <nav aria-label="Main navigation">
          <p className="wl-nav-label">Workspace</p>
          {links.map((link) => (
            <NavLink to={link.to} end={link.end} className={({ isActive }) => isActive ? "active" : ""} key={link.to}>
              <Icon name={link.icon} /><span>{link.label}</span>
            </NavLink>
          ))}
          <p className="wl-nav-label">More</p>
          <NavLink to="/business"><Icon name="grid" /><span>Business tools</span></NavLink>
          <NavLink to="/profile"><Icon name="settings" /><span>Account settings</span></NavLink>
        </nav>
        <div className="wl-sidebar__account">
          <span className="wl-avatar">{(user?.email || "W").charAt(0).toUpperCase()}</span>
          <div><strong>{user?.displayName || "My workspace"}</strong><small>{user?.email}</small></div>
          <button onClick={async () => { await logout(); navigate("/"); }} aria-label="Sign out"><Icon name="logout" /></button>
        </div>
      </aside>
      <div className="wl-app-content">
        <header className="wl-mobile-topbar">
          <Link to="/app" className="wl-brand"><span>W</span><strong>webilo</strong></Link>
          <Link to="/create" className="wl-mobile-create"><Icon name="plus" /> New</Link>
        </header>
        <main key={location.pathname}>{children}</main>
      </div>
      <nav className="wl-mobile-nav" aria-label="Mobile navigation">
        {links.map((link) => (
          <NavLink to={link.to} end={link.end} key={link.to}>
            <Icon name={link.icon} /><span>{link.label === "Create website" ? "Create" : link.label}</span>
          </NavLink>
        ))}
        <NavLink to="/profile"><Icon name="settings" /><span>Account</span></NavLink>
      </nav>
    </div>
  );
}

export function LoadingScreen({ label = "Loading your workspace" }) {
  return (
    <div className="wl-loading-screen" role="status">
      <span className="wl-loader-logo">W</span>
      <p>{label}</p>
    </div>
  );
}


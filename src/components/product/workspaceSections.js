// Replaces the old flat TABS/TAB_MODULES/FOOD_TABS (ProductWorkspace.jsx) with
// two consolidated workspace destinations — Sell and Setup — plus Today. See
// docs/WEBILO_WORKSPACE_REDESIGN.md Ticket 4. Every business/vertical gets the
// same three top-level destinations; verticals change what's inside Sell, not
// the nav shape (Ticket 5 adds that per-vertical content).

export const VIEWS = ["today", "sell", "setup"];

export const VIEW_LABELS = { today: "Today", sell: "Sell", setup: "Setup" };

// `module`: gate this section on an enabled business module (omit for
// always-visible sections). `foodOnly`: only ever shown to food-aware
// businesses (see foodMode.js resolveWorkspaceProfile()).
export const SELL_SECTIONS = [
  { id: "offers", label: "Offers", module: "commerce", icon: "grid", description: "Manage everything customers can order, book or request" },
  { id: "products", label: "Products", module: "commerce", icon: "grid", description: "Manage existing product records" },
  { id: "services", label: "Services", module: "commerce", icon: "grid", description: "Manage existing service records" },
  { id: "orders", label: "Orders", module: "orders", icon: "grid", description: "Review and process customer orders" },
  { id: "kitchen", label: "Kitchen", module: "orders", icon: "grid", foodOnly: true, description: "Live kitchen board for preparing and fulfilling orders" },
  { id: "bookings", label: "Bookings", module: "bookings", icon: "clock", description: "Manage appointment requests" },
  { id: "customers", label: "Customers", module: "customers", icon: "grid", description: "Contact and lead records" },
  { id: "messages", label: "Messages", module: "messages", icon: "site", description: "Direct customer communication" },
  { id: "campaigns", label: "Campaigns", module: "marketing", icon: "sparkles", description: "Saved marketing campaigns" },
  { id: "announcements", label: "Announcements", module: "marketing", icon: "sparkles", description: "Public notices shown on your storefront" },
  { id: "analytics", label: "Performance", module: "analytics", icon: "grid", description: "Live business performance" },
];

// Sections with real content rendered inside the Setup view.
export const SETUP_SECTIONS = [
  { id: "profile", label: "Business profile", icon: "settings", description: "Your offer, audience, goals, and contact details" },
  { id: "ordering", label: "Ordering & Kitchen settings", icon: "clock", description: "Accepting orders, pause messaging, hours, and prep time" },
  { id: "modules", label: "Modules", icon: "settings", description: "Choose the tools this business needs" },
];

// Setup grid cards that navigate away instead of drilling into a section.
export const SETUP_EXTRAS = [
  { id: "website", label: "Website", icon: "site", description: "Build, publish, and manage your public site", external: "/websites" },
];

export const RESOURCE_SECTION_IDS = new Set([
  "offers", "products", "services", "customers", "orders", "bookings", "messages", "campaigns", "announcements",
]);

const ALL_TARGETS = {
  overview: { view: "today", section: null },
  sell: { view: "sell", section: null },
  more: { view: "setup", section: null },
  createWebsite: { view: "setup", section: null, external: "/create" },
  ...Object.fromEntries(SELL_SECTIONS.map((item) => [item.id, { view: "sell", section: item.id }])),
  ...Object.fromEntries(SETUP_SECTIONS.map((item) => [item.id, { view: "setup", section: item.id }])),
  ...Object.fromEntries(SETUP_EXTRAS.map((item) => [item.id, { view: "setup", section: null, external: item.external }])),
};

// Resolves any legacy flat tab id (offers/profile/modules/website/…) or
// virtual tab (sell/more/overview) to its { view, section } location, or an
// { external } path to navigate to instead. Used both for onOpen(id) clicks
// (Overview cards, businessJourney targets, ModuleSettings' "Open" button)
// and for redirecting stale `?tab=` deep links.
export function resolveTarget(id) {
  return ALL_TARGETS[id] || null;
}

// Pure — given the current search params (as plain strings, possibly null),
// derives which view/section to render and whether the URL needs correcting
// (an old `?tab=` link, or an unknown/missing `view`).
export function deriveWorkspaceLocation({ view, section, tab }) {
  if (view && VIEWS.includes(view)) {
    return { view, section: section || null, needsRedirect: false };
  }
  if (tab) {
    const resolved = resolveTarget(tab);
    if (resolved) {
      return {
        view: resolved.view,
        section: resolved.external ? null : resolved.section,
        needsRedirect: true,
      };
    }
  }
  return { view: "today", section: null, needsRedirect: Boolean(tab) };
}

export function sectionMeta(id) {
  return SELL_SECTIONS.find((item) => item.id === id) || SETUP_SECTIONS.find((item) => item.id === id) || null;
}

// Reverse lookup used by ModuleSettings' "Open" button — the first section
// (Sell before Setup, matching the old TABS iteration order) backed by the
// given module.
export function sectionIdForModule(moduleId) {
  const match = [...SELL_SECTIONS, ...SETUP_SECTIONS].find((item) => item.module === moduleId);
  return match ? match.id : null;
}

// Whether a Sell section should be reachable right now. Products/Services
// additionally need a real legacy record to exist (Ticket 5) — the newer
// canonical "offers" model doesn't need this, only the legacy records it's
// superseding. `hasLegacyProducts`/`hasLegacyServices` should default to
// `false` while that existence check is still loading (fail-safe: hidden,
// not shown-then-yanked-away).
export function isSellSectionAvailable(item, { enabledModules, foodAware, hasLegacyProducts, hasLegacyServices }) {
  if (item.foodOnly && !foodAware) return false;
  if (item.module && !enabledModules.has(item.module)) return false;
  if (item.id === "products" && !hasLegacyProducts) return false;
  if (item.id === "services" && !hasLegacyServices) return false;
  return true;
}

const LAST_SECTION_KEY = (view) => `webilo.lastSection.${view}`;

export function getLastSection(view) {
  try {
    return window.sessionStorage.getItem(LAST_SECTION_KEY(view));
  } catch {
    return null;
  }
}

export function setLastSection(view, section) {
  try {
    window.sessionStorage.setItem(LAST_SECTION_KEY(view), section);
  } catch {
    // The workspace still works when private browsing blocks session storage.
  }
}

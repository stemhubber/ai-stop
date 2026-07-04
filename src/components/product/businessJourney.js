export const JOURNEY_RESOURCES = ["offers", "products", "services", "customers", "orders", "bookings"];

export function buildLaunchPath(business, modules = [], records = {}, projects = []) {
  const enabled = new Set(modules.filter((item) => item.enabled).map((item) => item.moduleId));
  const businessProjects = projects.filter((project) => project.settings?.businessId === business.id);
  const hasOffer =
    (records.offers?.length || 0) +
    (records.products?.length || 0) +
    (records.services?.length || 0) > 0;
  const hasCustomerFlow = enabled.has("orders") || enabled.has("bookings");
  const hasWebsite = businessProjects.length > 0;
  const hasPublishedWebsite = businessProjects.some((project) => project.status === "published");
  const hasCustomerActivity =
    (records.customers?.length || 0) +
    (records.orders?.length || 0) +
    (records.bookings?.length || 0) > 0;
  const profileReady = Boolean(
    business.name &&
    business.description?.trim().length >= 40 &&
    business.audience?.trim() &&
    business.goal?.trim() &&
    (business.email?.trim() || business.phone?.trim())
  );

  return [
    { label: "Confirm your business profile", detail: "Offer, audience, goal, and contact details", complete: profileReady, target: "profile" },
    { label: "Add your first offer", detail: "Give customers something clear to order, book, or request", complete: hasOffer, target: enabled.has("commerce") ? "offers" : "modules" },
    { label: "Choose how customers respond", detail: "Enable orders or bookings for your business", complete: hasCustomerFlow, target: "modules" },
    { label: "Create your business website", detail: "Turn your profile and offer into a customer-facing site", complete: hasWebsite, target: hasWebsite ? "website" : "createWebsite" },
    { label: "Publish and share your website", detail: "Make the site available through its public link", complete: hasPublishedWebsite, target: "website" },
    { label: "Get your first customer action", detail: "A contact, order, or booking will appear here", complete: hasCustomerActivity, target: "customers" },
  ];
}

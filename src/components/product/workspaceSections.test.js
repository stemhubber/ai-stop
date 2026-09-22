import {
  deriveWorkspaceLocation,
  isSellSectionAvailable,
  resolveTarget,
  sectionIdForModule,
  SELL_SECTIONS,
  SETUP_SECTIONS,
} from "./workspaceSections";

test("deriveWorkspaceLocation honours an explicit valid view/section", () => {
  expect(deriveWorkspaceLocation({ view: "sell", section: "offers", tab: null })).toEqual({
    view: "sell",
    section: "offers",
    needsRedirect: false,
  });
});

test("deriveWorkspaceLocation defaults to today's grid with no params", () => {
  expect(deriveWorkspaceLocation({ view: null, section: null, tab: null })).toEqual({
    view: "today",
    section: null,
    needsRedirect: false,
  });
});

test("deriveWorkspaceLocation redirects a legacy ?tab= section id into Sell/Setup", () => {
  expect(deriveWorkspaceLocation({ view: null, section: null, tab: "offers" })).toEqual({
    view: "sell",
    section: "offers",
    needsRedirect: true,
  });
  expect(deriveWorkspaceLocation({ view: null, section: null, tab: "profile" })).toEqual({
    view: "setup",
    section: "profile",
    needsRedirect: true,
  });
});

test("deriveWorkspaceLocation redirects legacy virtual tabs (sell/more) to their grid", () => {
  expect(deriveWorkspaceLocation({ view: null, section: null, tab: "sell" })).toEqual({
    view: "sell",
    section: null,
    needsRedirect: true,
  });
  expect(deriveWorkspaceLocation({ view: null, section: null, tab: "more" })).toEqual({
    view: "setup",
    section: null,
    needsRedirect: true,
  });
});

test("deriveWorkspaceLocation redirects an external legacy target to its view's grid, not an auto-navigate", () => {
  expect(deriveWorkspaceLocation({ view: null, section: null, tab: "website" })).toEqual({
    view: "setup",
    section: null,
    needsRedirect: true,
  });
});

test("deriveWorkspaceLocation falls back to today for an unrecognised ?tab=", () => {
  expect(deriveWorkspaceLocation({ view: null, section: null, tab: "not-a-real-tab" })).toEqual({
    view: "today",
    section: null,
    needsRedirect: true,
  });
});

test("resolveTarget resolves every Sell and Setup section id", () => {
  for (const section of SELL_SECTIONS) {
    expect(resolveTarget(section.id)).toEqual({ view: "sell", section: section.id });
  }
  for (const section of SETUP_SECTIONS) {
    expect(resolveTarget(section.id)).toEqual({ view: "setup", section: section.id });
  }
});

test("resolveTarget resolves website/createWebsite as external navigations", () => {
  expect(resolveTarget("website")).toEqual({ view: "setup", section: null, external: "/websites" });
  expect(resolveTarget("createWebsite")).toEqual({ view: "setup", section: null, external: "/create" });
});

test("sectionIdForModule finds the first Sell section for a shared module, matching the old TABS order", () => {
  expect(sectionIdForModule("commerce")).toBe("offers");
  expect(sectionIdForModule("marketing")).toBe("campaigns");
  expect(sectionIdForModule("orders")).toBe("orders");
});

test("sectionIdForModule returns null for modules with no directly-tabbed section", () => {
  expect(sectionIdForModule("website")).toBeNull();
  expect(sectionIdForModule("ai")).toBeNull();
  expect(sectionIdForModule("payments")).toBeNull();
});

test("resolveTarget resolves the new Setup ordering section", () => {
  expect(resolveTarget("ordering")).toEqual({ view: "setup", section: "ordering" });
});

const offers = SELL_SECTIONS.find((item) => item.id === "offers");
const kitchen = SELL_SECTIONS.find((item) => item.id === "kitchen");
const products = SELL_SECTIONS.find((item) => item.id === "products");
const services = SELL_SECTIONS.find((item) => item.id === "services");
const bookings = SELL_SECTIONS.find((item) => item.id === "bookings");

test("isSellSectionAvailable gates Kitchen on food-awareness only", () => {
  expect(isSellSectionAvailable(kitchen, { enabledModules: new Set(["orders"]), foodAware: false, hasLegacyProducts: false, hasLegacyServices: false })).toBe(false);
  expect(isSellSectionAvailable(kitchen, { enabledModules: new Set(["orders"]), foodAware: true, hasLegacyProducts: false, hasLegacyServices: false })).toBe(true);
});

test("isSellSectionAvailable gates every section on its module regardless of food/legacy state", () => {
  expect(isSellSectionAvailable(bookings, { enabledModules: new Set([]), foodAware: true, hasLegacyProducts: false, hasLegacyServices: false })).toBe(false);
  expect(isSellSectionAvailable(bookings, { enabledModules: new Set(["bookings"]), foodAware: false, hasLegacyProducts: false, hasLegacyServices: false })).toBe(true);
});

test("isSellSectionAvailable hides Products/Services without a legacy record, even with commerce enabled", () => {
  const ctx = { enabledModules: new Set(["commerce"]), foodAware: false, hasLegacyProducts: false, hasLegacyServices: false };
  expect(isSellSectionAvailable(products, ctx)).toBe(false);
  expect(isSellSectionAvailable(services, ctx)).toBe(false);
  expect(isSellSectionAvailable(products, { ...ctx, hasLegacyProducts: true })).toBe(true);
  expect(isSellSectionAvailable(services, { ...ctx, hasLegacyServices: true })).toBe(true);
});

test("isSellSectionAvailable never gates Offers on legacy records", () => {
  expect(isSellSectionAvailable(offers, { enabledModules: new Set(["commerce"]), foodAware: false, hasLegacyProducts: false, hasLegacyServices: false })).toBe(true);
});

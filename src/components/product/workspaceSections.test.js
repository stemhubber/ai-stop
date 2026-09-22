import {
  deriveWorkspaceLocation,
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

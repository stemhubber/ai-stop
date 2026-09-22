// Which businesses see the food-ordering vertical (Kitchen board, prep time,
// menu photo import, variant/modifier editors). Gated on category, with an
// explicit `foodOrdering` boolean escape hatch for businesses whose free-text
// category doesn't match — set from the Kitchen/Business profile settings card.

export const FOOD_CATEGORIES = new Set([
  "restaurant",
  "takeaway",
  "cafe",
  "food",
]);

const WORKSPACE_PROFILES = {
  food: { offersLabel: "Menu", showKitchen: true },
  retail: { offersLabel: "Catalog", showKitchen: false },
  general: { offersLabel: "Offers", showKitchen: false },
};

// The single source of truth every vertical-aware screen (Sell/Setup nav,
// ResourceManager labels, Kitchen section visibility) should read from.
// isFoodBusiness() is defined in terms of this, not the other way around.
export function resolveWorkspaceProfile(business) {
  const category = String(business?.category || "").trim().toLowerCase();
  const kind =
    business?.foodOrdering === true || FOOD_CATEGORIES.has(category)
      ? "food"
      : category === "retail"
      ? "retail"
      : "general";
  return { kind, ...WORKSPACE_PROFILES[kind] };
}

export function isFoodBusiness(business) {
  return resolveWorkspaceProfile(business).kind === "food";
}

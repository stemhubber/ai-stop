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

export function isFoodBusiness(business) {
  if (business?.foodOrdering === true) return true;
  return FOOD_CATEGORIES.has(String(business?.category || "").trim().toLowerCase());
}

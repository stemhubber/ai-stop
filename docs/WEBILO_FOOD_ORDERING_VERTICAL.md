# Webilo Food-Ordering Vertical — Ideas Ported from BitePilot

**Status:** proposal / spec for implementation in this repo
**Source:** `food-ordering-app` (working name "BitePilot"), a standalone CRA prototype for restaurant / kasi-fast-food ordering
**Decision:** do **not** port BitePilot's code. Rebuild the useful ideas as a **food-ordering vertical inside Webilo**, on top of the existing `businesses/{businessId}` model, offers/orders schema, public request/checkout endpoints, and Paystack. This document is the bridge: what BitePilot did, which ideas are worth keeping, and how each maps onto Webilo.

Read alongside `docs/WEBILO_COMMERCE_ARCHITECTURE.md` (the canonical order/offer design) and `docs/DEVELOPER_RULES.md` §14. Where this doc and the commerce architecture doc disagree, the commerce architecture doc wins — raise the conflict rather than fork the order system.

---

## 1. Why this vertical

BitePilot is a single-vertical prototype of something Webilo already generalises: a business with a public page, a catalogue, orders, checkout, and fulfilment. Everything BitePilot got *wrong* is infrastructure Webilo already has right:

| BitePilot problem | Webilo already provides |
| --- | --- |
| Every route + all state in one 210-line `Homepage.jsx`; `App.js` is just `<Router><HomePage/></Router>` | `src/App.js` real route table, `RequireAuth`, `AuthContext`, `BusinessContext`, `PlanContext` |
| `sessionStorage.getItem('bitepilot_user')` "auth"; MD5 store access code in `AdminAuthWrapper` | Firebase Auth + `members/{userId}` roles + `firestore.rules` `ownsBusiness()` |
| Hardcoded `storeLoaderId = 1`; `StoreController` dummy array; `products.js` with expired Facebook CDN URLs | `businesses/{id}` + `businessSlugs/{slug}`, `businessRepository`, `websiteAssetService` uploads |
| `Math.random()` / `stores.length + 1` IDs; client computes and trusts order totals | Server builds orders from stored pricing (`functions/commerce.js` `buildOrder`), `schemaVersion: 2`, `pricingSnapshot` |
| No payment | Paystack subaccount checkout, webhook-confirmed, `paymentWebhookEvents` idempotency |

So the vertical is **additive UI + a few schema fields + a couple of Cloud Function tweaks**, not a new app and not a rewrite.

### What Webilo already covers (do not rebuild)

- **Catalogue:** `businesses/{id}/offers` (canonical) + legacy `products` / `services`, surfaced through `listPublicOffers()`.
- **Orders:** `businesses/{id}/orders/{orderId}` v2 with `items[]`, `pricingSnapshot`, `fulfilment`, `payment`, `status`, plus `orders/{orderId}/events` subcollection.
- **Order lifecycle:** `requested → confirmed → processing → completed`, `↘ cancelled`; legacy `pending`; `awaiting_payment` for paid checkout. Transitions enforced in `firestore.rules` `validOrderStatusTransition()`.
- **Public submission:** `POST /public/businesses/:slug/requests` and `POST /public/businesses/:slug/checkout-sessions` (Admin SDK writes after validation, rate limit + honeypot).
- **Owner admin:** `ResourceManager` (`resource="orders"`) — list, manual capture, accept/process/complete/cancel buttons.
- **Notifications:** `orderCreatedNotification` + `orderStatusNotification` Firestore triggers (email via Resend); order↔booking projection sync.
- **Workspace shell:** `ProductWorkspace` tabbed UI keyed off enabled `modules`; `TAB_MODULES` / `MODULE_DETAILS` registries.
- **Images:** `websiteAssetService.uploadBusinessImage`, `AIVisualImporter`, `GalleryUploader`.

### The gap BitePilot fills

None of these exist in Webilo today and all matter for food service:

1. **Real-time kitchen board** — orders as live status columns, not a table you refresh.
2. **Customer live order tracker** — "Preparing → Ready → Collect" progress for the person who ordered, without an account.
3. **"Accepting orders" / open-closed switch** — pause inbound orders with a customer-facing reason + hours.
4. **Food catalogue shape** — categories, size variants (Large/Small), add-ons/toppings, prep time, per-item availability ("86").
5. **Kitchen ticket / receipt printing.**
6. **Menu import** — photo → OCR/AI → draft items.
7. **Sound cues** (and optional voice call-outs) for a noisy kitchen.
8. **Broadcast alerts** from a business to its customers, with replies.
9. **Fulfilment-gated reviews** per business (already on the commerce roadmap — §Pro extensions item 4).

---

## 2. Feature specs

Each item: **Keep** (the good idea), **Drop** (BitePilot's implementation debt), **Map** (how it lands in Webilo), **Priority**.

### 2.1 Real-time Kitchen Board  ·  Priority: P0

BitePilot: `src/views/AdminView.jsx` — subscribes to all orders via `OrderService.listenToOrders`, groups by `id`, buckets into `Pending / Preparing / Ready / Completed` columns, `framer-motion` card entry, `<select>` to change status with a confirm modal, WhatsApp deep-link to the customer with an order summary, plays a sound on new orders.

- **Keep:** live column board (one column per active status); newest-first ordering; audible new-order cue; per-card "advance to next status" as the primary action (one tap, not a dropdown); quick "message customer" link; big legible order reference + item list + line count.
- **Drop:** subscribing to the entire `orders` collection then filtering client-side; `convertIDToTime` parsing timestamps out of a `Date.now()-n` string id; confirm-modal on every status change (too slow for a kitchen); grouping hacks because BitePilot wrote one Firestore doc *per cart line*.
- **Map:**
  - New component under `src/features/commerce/` — e.g. `KitchenBoard.jsx` + `kitchen.css`. Surface it as a new workspace tab: add `["kitchen", "Kitchen"]` to `TABS` in `ProductWorkspace.jsx`, `kitchen: "orders"` to `TAB_MODULES`, gated on the `orders` module (optionally also require `category` in a "food" set on the business).
  - Data: `onSnapshot` on `query(collection(db,"businesses",businessId,"orders"), where("status","in",["requested","pending","confirmed","processing","ready"]), orderBy("createdAt","desc"))`. Add the composite index to `firestore.indexes.json`. Reads are already allowed by rules for `ownsBusiness`.
  - Status changes go through the existing `updateRecord(businessId,"orders",id,{status})` path so `firestore.rules` + `orderStatusNotification` stay authoritative. Add a `ready` status — see §3.3.
  - Each column = a status; card actions call `changeStatus(order, nextStatus)`. Reuse `ResourceManager`'s transition map so both UIs agree.
  - "Message customer": reuse `messagingService.sendMessage` (SMS) rather than a `wa.me` link, or keep a WhatsApp link as a zero-config fallback using `customerPhone`.
  - Sound: small `useKitchenSound` hook; play on snapshot `docChanges()` of type `"added"`. Ship the `.wav`s under `public/sounds/` (BitePilot's `soundMap` in `src/utils/Constants.js` is a fine starting list). Gate behind a per-user toggle stored in `localStorage`; browsers block autoplay until the first interaction, so arm it on a visible "Enable sound" button.
- **Notes:** staff-who-aren't-the-owner need kitchen access — see §4 (roles).

### 2.2 Customer live order tracker (public, no account)  ·  Priority: P0 — ✅ IMPLEMENTED (Phase 2)

Delivered:
- Public route `/o/:slug/:publicReference?t=<token>` → `src/features/commerce/PublicOrderStatus.jsx` (+ `orderStatus.css`). Registered in `src/App.js`. Short-polls every 8 s, stops on `completed` / `cancelled`.
- `GET /public/businesses/:slug/orders/:publicReference?token=…` in `functions/index.js` — looks the order up by `publicReference` (Firestore auto-indexes the single field), gates on `secureHashEqual(order.clientTokenHash, hashCheckoutSecret(token))`, and returns a **customer-safe projection only** (`status`, `fulfilmentMethod`, item name+qty, `etaMinutes`, business name/phone, currency, total) — never the raw doc. Unknown ref or bad token → 404.
- Token: `functions/commerce.js` `buildOrder` takes an optional `clientTokenHash` and writes it verbatim (stays crypto-free). The `/requests` handler generates the raw token with `checkoutSecret()` and hashes it with `hashCheckoutSecret()`. Paid checkout reuses the checkout `clientSecret` as the tracker token (`buildCheckoutOrder` gets the same arg).
- `clientTokenHash` added to `preservesOrderSnapshot()` in `firestore.rules` (via `.get("clientTokenHash", "")` so pre-existing orders without it still validate).
- Response wiring: `/requests` 201 keeps `reference`, adds `publicReference` + `statusUrl`; `checkout-sessions` POST + GET projection add `statusUrl`. `PublicBusinessPage` shows a "Track your order" link on submit; `CommerceCheckoutComplete` shows one once paid.
- Stepper labels from `fulfilmentMethod` (`pickup`: …→ Ready for collection → Completed; `delivery`: …→ Ready → On the way → Delivered). Presentational only; stored status stays the §3.3 canonical set.

ETA: `max(item.prepMinutes)` if any, else `business.prepDefaultMinutes`, else 15; zeroed once the order is `ready` / `out_for_delivery` / `completed` / `cancelled`. `prepMinutes` / `prepDefaultMinutes` don't exist until Phases 4 / 3, so ETA currently shows the 15-min fallback. Signed single-doc Firestore listener instead of polling is a later optimisation.

### 2.3 "Accepting orders" toggle + hours  ·  Priority: P1 — ✅ IMPLEMENTED (Phase 3)

Delivered:
- `businesses/{id}` optional fields: `ordering: { acceptingOrders, pausedReason, pausedUntil }`, `hours: { display }`, `prepDefaultMinutes`, plus the `foodOrdering` escape-hatch boolean. `pausedUntil` is stored as an ISO string (not a Firestore Timestamp) — a value in the past auto-reopens.
- `src/features/commerce/OrderingSettingsCard.jsx` (+ `orderingSettings.css`) — owner control with the accepting-orders switch, customer-facing paused reason + reopen time, opening-hours string, default prep minutes, and the `foodOrdering` toggle. Rendered in the **Business profile** tab (always reachable, so a non-food business can switch food tools on) and at the top of the **Kitchen** tab.
- Server enforcement: `functions/ordering.js` `assertAcceptingOrders(business)` — throws `409 { code: "ORDERING_PAUSED" }` — called in both `POST /public/businesses/:slug/requests` (offer path only, not contact) and `POST /public/businesses/:slug/checkout-sessions`. `firestore.rules` `orders` block carries a comment pointing at it.
- Public surfaces: `src/features/commerce/ordering.js` `orderingPaused(business)` mirrors the server check. `PublicBusinessPage` shows a closed banner (reason + reopen time), hides offer actions and the "View offers" CTA, and blocks offer submits; `PublicWebsite` blocks non-contact submits and surfaces the server reason; `PublicCheckoutPanel` returns null when paused. `hours.display` renders in the `PublicBusinessPage` hero.

### 2.3-original "Accepting orders" toggle + hours (spec)

BitePilot: `src/views/StoreStatusController.jsx` (`isOpen` flip with flavour-text messages) + `NotificationPopover` shows a "store is closed 💔" banner with `openingTimes`.

- **Keep:** one owner switch that stops new orders immediately; a customer-facing closed state with the reason and the next opening time; opening-hours string on the public page.
- **Drop:** `isOpen` living only in React state / the dummy store object (never persisted); 12 hardcoded inspirational strings; `setTimeout(...,180000)` to clear a message.
- **Map:**
  - `businesses/{id}` fields: `ordering: { acceptingOrders: boolean, pausedReason?: string, pausedUntil?: timestamp }` and `hours` (structured: `{ mon: [["10:00","22:00"]], … }` or a simple display string for v1).
  - Owner control: a card in the Kitchen tab and/or Business profile. Writes via `updateBusiness`.
  - Enforcement (important — this is a server rule, not a UI hint): in `functions` `requests` + `checkout-sessions` handlers, after resolving the business, reject with `409` if `ordering.acceptingOrders === false`. Add a matching check to `firestore.rules` for any direct client order create path (there is none today, but keep them in sync).
  - Public: `PublicBusinessPage` / generated `/w/:slug` show a closed banner and hide the cart when `acceptingOrders` is false or `hours` say closed. `PublicCheckoutPanel` already early-returns on `!business.checkoutEnabled`; add the ordering-paused check there too.

### 2.4 Food catalogue shape: categories, variants, add-ons, prep time  ·  Priority: P1

BitePilot: `ProductController` synthesises "(Large)" / "(Small)" rows from one menu entry with `small`/`large` prices; `productsData.extra_toppings` / `extra_packages`; `Product.waitingTime` ("11 minutes"); `isAvailable` flag; `MenuItemModal` edits name/price/description/image/available/waitingTime.

- **Keep:** menu items grouped by **category**; a single item with **size/variant options** carrying price deltas; optional **add-ons/modifiers** (toppings, extras) with prices; a **prep-time** estimate per item (feeds the tracker ETA); a fast **available / unavailable** toggle on the card.
- **Drop:** generating separate product records per size; ingredient strings parsed by `split(',')`/`split(' and ')`; prices as plain rands in strings (`(10+pd.small)*2`).
- **Map:**
  - Extend the **offer** shape (`businesses/{id}/offers`), not a new collection. Add optional fields: `category` (string), `variants: [{ label, priceDeltaCents }]`, `modifierGroups: [{ name, min, max, options: [{ label, priceCents }] }]`, `prepMinutes` (number), `available` (boolean, default true). All optional → backward compatible; `WEBILO_COMMERCE_ARCHITECTURE.md`'s "immutable item snapshot" rule means the order must snapshot the chosen variant + modifiers into `items[].selectedOptions` (the field already exists, currently `[]`).
  - `ResourceManager` `CONFIG.offers.fields` / `CONFIG.products` gains the new inputs (guard behind the food category so non-food businesses don't see topping editors). Prices continue to be stored in minor units (the component already does `Math.round(Number(price)*100)`).
  - `functions/commerce.js` `offerSnapshot` + `buildOrder` must price variants/modifiers server-side from the reloaded offer and add them to `lineTotal` — the browser keeps sending only references + quantities (§ commerce doc: "never submits an authoritative price").
  - Public menu grouping by `category` is a pure rendering change in `PublicBusinessPage` / `features/commerce` cart source (`listPublicOffers`).

### 2.5 Item availability / "86" + light stock counts  ·  Priority: P2

BitePilot: `isAvailable` on products; `StockManagerController.useStockManager` derives an "ingredient" list from description text and decrements on orders (heuristic, not real).

- **Keep:** instant "mark unavailable / sold out" from the kitchen board and the menu manager; hide or grey-out unavailable items on the public menu; optional per-item countdown quantity for the day ("12 left").
- **Drop:** the ingredient-inference engine entirely — it's guesswork on `description.split(',')`.
- **Map:**
  - `available: boolean` on the offer (from §2.4). Kitchen board and `ResourceManager` both get a one-tap toggle → `updateRecord(..., { available })`.
  - `listPublicOffers` / public renderers filter or badge on `available === false`.
  - Optional `stockCount` (number, nullable): decrement in the server `buildOrder` batch (same transaction that writes the order), set `available:false` at zero. Keep it opt-in per item. This is the "Stock reservations" bullet already listed as a remaining commerce phase — align with that rather than shipping a parallel system.

### 2.6 Kitchen ticket / receipt printing  ·  Priority: P2

BitePilot: `src/views/ReceiptView.jsx` + `PrintModal.jsx` — `window.print()` on a styled receipt DOM, `@media print` CSS, `/print` route.

- **Keep:** a print-friendly kitchen ticket (order ref, time, items + options, notes, fulfilment method) and a customer receipt; trigger from the kitchen card and the order detail.
- **Drop:** a dedicated `/print` route that depends on in-memory `receiptOrders` state; `JENETE APPS ©` hardcoded footer.
- **Map:** a `<PrintableTicket order={…} business={…} />` component rendered into a hidden container, `@media print` styles scoped with a `print-only` class, `window.print()` on click. No routing, no backend. Pull business name/phone/address from the business doc. Later: an ESC/POS / share-to-printer path is out of scope for v1.

### 2.7 Menu import (photo → draft items)  ·  Priority: P2

BitePilot: `src/views/MenuOCRProductForm.jsx` — `tesseract.js` in the browser, regex `(.+?)\.*\s*R?(\d+)` per line → editable draft rows.

- **Keep:** upload a menu photo, get back editable draft items (name + price), confirm into the catalogue. Big onboarding win for a stall owner with a paper menu.
- **Drop:** shipping `tesseract.js` (~mb) into the main bundle; naive line regex.
- **Map:** Webilo already has `AIVisualImporter` + AI proxying in `functions/` (provider registry `providers/ai/`). Add a "menu photo" mode: upload via `websiteAssetService`, send the image URL to an AI extract endpoint in `functions` that returns `[{ name, price, description?, category? }]`, render the existing importer's review table, write via `createRecord(businessId,"offers",…)`. Reuses AI metering/entitlements — don't add a second AI path. `tesseract.js` only as an offline fallback, lazy-loaded, if wanted at all.

### 2.8 Sound + optional voice call-outs  ·  Priority: P2 (sound is bundled with 2.1)

BitePilot: `playOrderSound` (`new Audio('/sounds/…')`), `soundMap`; `speakText` (`SpeechSynthesis`) and `listenForSpeechCommand` (`webkitSpeechRecognition`) in `VoiceOrderCommand.jsx` (parses "ready order 12").

- **Keep:** sound on new order / status change (kitchen). Voice **call-out** of ready order numbers is a nice-to-have for a collection counter (`speakText("Order 12 is ready")`).
- **Drop:** voice *command* control (`listenForSpeechCommand` → status update) — brittle, `webkit`-only, and `confirmAction` was never wired up. Skip it.
- **Map:** `useKitchenSound` hook (see §2.1). Optional `announceReady` util wrapping `speechSynthesis` behind a toggle. All client-only, `localStorage` prefs.

### 2.9 Broadcast alerts from a business to its customers  ·  Priority: P3

BitePilot: `AlertController` + `AdminAlertManager` + `NotificationPopover` — a top-level `alerts` collection (`storeId`, `message`, `alertType`, `replies[]`), live subscription, a bell with unread count (last-read timestamp in `localStorage`), threaded replies.

- **Keep:** owner posts a short notice ("out of ribs today", "load-shedding, 30-min delays"); customers on the business page see it; optional replies.
- **Drop:** a global `alerts` collection filtered client-side by `storeId`; identity via `localStorage` user; unread state in `localStorage`.
- **Map:** `businesses/{id}/announcements/{id}` subcollection (`message`, `level`, `createdBy`, `expiresAt`, `createdAt`). Owner CRUD via `businessRepository` generic helpers; `firestore.rules`: `read: if true` (public, like `offers` active), `write: if ownsBusiness`. Render a dismissible strip on `PublicBusinessPage` / `/w/:slug`. Replies → defer; if wanted, model as `announcements/{id}/replies`. This overlaps conceptually with `campaigns`/`messages` — check with the team whether an announcement is just a `campaign` with a public channel before adding a collection.

### 2.10 Fulfilment-gated reviews  ·  Priority: P3

BitePilot: `ReviewsController` + `AdminReviewManager` + `ReviewSlider` — top-level `reviews` collection (`storeId`, `rating`, `comment`, `media`, `likes`, `replies[]`), owner can delete.

- **Keep:** per-business star rating + comment, optional photo; shown on the public page; owner can moderate (hide/delete); aggregate rating on the business.
- **Drop:** anonymous unauthenticated writes to a global collection; `orderBy('rating','desc')` as the only sort; storing initials as `avatar`.
- **Map:** this is **already on the commerce roadmap** — `WEBILO_COMMERCE_ARCHITECTURE.md` → "Pro extensions → item 4: Fulfilment-gated service ratings". Implement there: `businesses/{id}/reviews/{id}` written only after an order/booking for that customer reaches `completed` (enforce server-side, issue a review token in the completion flow like the status token). Aggregate into `businesses/{id}.ratingSummary` via a Firestore trigger. Don't build the BitePilot version first.

### 2.11 Storefront polish  ·  Priority: P3

BitePilot: `StoreSite.jsx` — hero wallpaper + logo, about text, `GallerySection`, "Meet the owners" grid, embedded Google Maps + Street View iframes, hours/location/phone, review slider.

- **Keep:** hero, gallery, hours, map, "meet the team" as optional public-page sections.
- **Drop:** unauthenticated `StatsController.updateVisit` on render; `<iframe src="google.com/maps?q=…output=embed">` (no key, ToS-grey). Webilo already has `MapPicker` / `StreetViewPicker` / `@react-google-maps/api` + `leaflet`.
- **Map:** these are `PublicBusinessPage` / website-builder block additions. "Team" ≈ surface `members` (with public-safe name/photo). Gallery ≈ business asset list from `websiteAssetService`. Hours from §2.3. Mostly presentational; no schema beyond `hours` and a `gallery` asset tag.

### 2.12 Multi-business discovery (optional)  ·  Priority: P3 / product call

BitePilot: `StoreList.jsx` (`/list`) + `WelcomePage` — a "Browse Stores" grid linking to each store.

- **Keep (maybe):** a directory of active businesses in a category ("food near me"). Only if Webilo wants a marketplace surface.
- **Map:** `businesses` already has `allow read: if resource.data.status == "active"`. A `/discover` route querying active businesses by `category` is straightforward. Confirm this fits Webilo's positioning (it's a business platform, not a marketplace) before building.

---

## 3. Concrete schema / rules / functions changes

### 3.1 `businesses/{businessId}` — new optional fields

```
ordering: {
  acceptingOrders: boolean,      // default true
  pausedReason: string | null,
  pausedUntil: timestamp | null
}
hours: { mon: [["HH:MM","HH:MM"]], ... } | { display: string }   // v1 may ship display-only
prepDefaultMinutes: number | null
ratingSummary: { count: number, average: number } | null         // written by trigger (§2.10)
```

### 3.2 `businesses/{businessId}/offers/{offerId}` — new optional fields

```
category: string | null
variants: [{ label: string, priceDeltaCents: number }]
modifierGroups: [{ name, min, max, options: [{ label, priceCents }] }]
prepMinutes: number | null
available: boolean            // default true
stockCount: number | null    // opt-in; server-decremented
```

All additive. Legacy offers/products without these render exactly as today.

### 3.3 Order status — add `ready` — ✅ IMPLEMENTED (Phase 1)

`ready` (prepared, awaiting handoff) and `out_for_delivery` (delivery orders only) are
now part of the canonical lifecycle:
`requested → confirmed → processing → ready → completed`, with
`ready → out_for_delivery → completed` for delivery and `↘ cancelled` from any open
status. Both stages are optional — `processing → completed` still works.

Delivered touch points:
- `firestore.rules` `validOrderStatusTransition()` — `processing → ready|completed|cancelled`, `ready → out_for_delivery|completed|cancelled`, `out_for_delivery → completed|cancelled`.
- `functions/index.js` `orderStatusNotification` — `ready` / `out_for_delivery` in the notified-status list (still website-source only; manual orders don't notify).
- `functions/notifications.js` `orderStatusEmail` — `statusCopy` for both; subject line humanises `out_for_delivery`.
- `src/features/commerce/orderTransitions.js` (new) — shared next-status map + kitchen columns, imported by both `ResourceManager.jsx` and `KitchenBoard.jsx`.
- `ResourceManager.jsx` — single `nextOrderStep`-driven advance button; `badge()` maps `ready` / `out_for_delivery` to `wb-badge-accent`.
- `docs/WEBILO_COMMERCE_ARCHITECTURE.md` Lifecycle section updated.
- `firestore.indexes.json` — `orders` composite index `status ASC, createdAt DESC` for the kitchen board query. Deploy with `firebase deploy --only firestore:indexes` before the board is used in production.

`PublicOrderStatus.jsx` stepper mapping lands with Phase 2.

### 3.4 New Cloud Function routes (Express app in `functions/index.js`)

- ✅ `GET /public/businesses/:slug/orders/:publicReference?token=…` — token-guarded customer-safe order status projection (§2.2). Shipped in Phase 2.
- `POST /ai/menu-extract` (or extend the existing AI import route) — image URL → draft offer array (§2.7).
- Ordering-paused guard added to the existing `requests` and `checkout-sessions` handlers (§2.3).

### 3.5 New public routes (`src/App.js`)

- ✅ `/o/:slug/:publicReference` → `PublicOrderStatus` (public, token in `?t=`). Shipped in Phase 2 (slug moved into the path so the client never guesses it).
- (optional) `/discover` → category directory.

Kitchen board is **not** a new top-level route — it's a tab inside `/business` (`ProductWorkspace`).

---

## 4. Staff roles (needed for the kitchen board)

BitePilot gated the admin panel with an MD5 access code per store (`AdminAuthWrapper`). Webilo has `businesses/{id}/members/{userId}` with `role` + `permissions` but `firestore.rules` currently checks **`ownsBusiness()` only** (owner === `businesses/{id}.ownerId`) for order reads/writes.

For kitchen staff who are not the owner:
- Decide whether to expand order-subcollection rules to `ownsBusiness(businessId) || isMember(businessId, ['owner','manager','staff'])` with an `isMember()` helper (`get(members/$(uid)).data.role in [...]`).
- Or keep it owner-only for v1 and treat the kitchen board as an owner tool.
- This is a security-rules change with blast radius — spec it separately and get it reviewed. Flagging here because 2.1 assumes multi-user kitchen access.

---

## 5. What NOT to carry over (anti-patterns in BitePilot)

- One mega-component holding all routes + state (`Homepage.jsx`). Webilo's route table + context split already solves this.
- Mock data controllers (`StoreController`, `ProductController`, `products.js`, `data.json`) — everything is Firestore-backed in Webilo.
- `sessionStorage` / `localStorage` as identity or authorization (`bitepilot_user`, `admin-auth`, `bitepilot-admin`).
- Client-generated IDs (`Math.random().toString(36)`, `stores.length + 1`, `Date.now()-n`) and parsing time back out of IDs.
- Client computing and persisting order totals. Webilo prices server-side from the reloaded offer.
- One Firestore doc per cart line (BitePilot's `createOrders` loop). Webilo orders are one doc with `items[]`.
- `onSnapshot` on a whole root collection then `.filter()` by store. Scope every query to `businesses/{id}/…`.
- Expiring / hotlinked image URLs. Use `websiteAssetService` uploads to Firebase Storage.
- Unauthenticated writes to global `reviews` / `alerts` / `visits` collections.
- Google Maps `output=embed` iframes without an API key. Use the libraries already in `package.json`.
- MD5 (`crypto-js`) for access control.

---

## 6. Suggested phasing

| Phase | Ships | Depends on |
| --- | --- | --- |
| **1** | Kitchen board tab (2.1) + `ready` status (3.3) + sound (2.8) | status/rules/trigger change, kitchen index |
| **2** | Public order tracker (2.2) + token route (3.4) | order-created responses returning `statusUrl` |
| **3** | Accepting-orders toggle + hours (2.3) | `businesses` fields + server guard |
| **4** | Food catalogue fields: categories, variants, modifiers, prep time, availability (2.4, 2.5) | `offers` fields + `offerSnapshot`/`buildOrder` pricing |
| **5** | Kitchen ticket printing (2.6) | none |
| **6** | Menu photo import (2.7) | AI route |
| **7** | Announcements (2.9), storefront sections (2.11), discovery (2.12) | product decisions |
| **later** | Fulfilment-gated reviews (2.10) | commerce roadmap Pro phase |

Phases 1–3 are the minimum that makes Webilo usable for a live food business.

---

## 7. Open questions for the Webilo team

1. **Status set:** OK to add `ready` (and maybe `out_for_delivery`) to the canonical order lifecycle, or should the kitchen board derive those from `fulfilment.status` instead of `order.status`?
2. **Staff access:** expand order rules to `members` roles now (§4), or keep the kitchen board owner-only for v1?
3. **Food fields on `offers`:** extend the `offers` doc with `variants` / `modifierGroups`, or model modifiers as their own linked offers/packages (the architecture doc mentions "package" and "bundle" offer types)?
4. **Announcements:** new `announcements` subcollection, or is this just a `campaign` with a `public` channel?
5. **Discovery surface:** does a `/discover` directory fit Webilo's positioning, or stay out?
6. **Category gating:** should food-specific UI (kitchen tab, topping editors, prep time) key off `business.category`, a dedicated `modules` entry, or always-on?

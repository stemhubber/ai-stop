# Changelog

All notable changes to this repository are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project does not yet follow strict semantic versioning — entries are
grouped by date instead of a release number.

## [Unreleased]

### Added — Food-ordering vertical, Phase 6: Menu photo import (2026-09-05)

Additive, builds on Phases 1–5. Reuses the existing AI import path end to end
— no second AI route, no `tesseract.js`.

- **`functions/index.js`** `POST /ai/extract-business-image` now accepts
  `resource: "offers"` (previously `products`/`services` only).
  `BUSINESS_IMAGE_SCHEMA` already returned `category` — no schema change. The
  prompt nudges the model to group items into short categories
  (Starters/Mains/Drinks) when extracting for `"offers"`, feeding directly
  into the Phase 4 category grouping on the public menu.
- **`AIVisualImporter.jsx`** `importItems()`: importing into `"offers"` now
  writes a complete canonical offer (`offerType: "product"`,
  `pricingMode: "fixed"`, `fulfilmentMethods: ["pickup"]`, `available: true`,
  extracted `durationMinutes` repurposed as `prepMinutes`) instead of the bare
  `{name, price, description, category}` the products/services path writes —
  an offer needs those fields to price and render correctly elsewhere in the
  vertical. Header copy adapts to "Turn a menu photo into catalogue items".
- **`ResourceManager.jsx`**: the import button reads "Import menu photo" and
  is surfaced for `resource === "offers"` when `foodAware && aiEnabled`.
- Tests: new `AIVisualImporter.test.jsx` (canonical-offer import shape) +
  a `ResourceManager.test.jsx` case for the button's gating. 57 frontend / 50
  functions tests total, all green.

### Added — Food-ordering vertical, Phase 5: Kitchen ticket / receipt printing (2026-09-05)

Additive, builds on Phases 1–4. Frontend-only — no backend or routing changes.

- **`src/features/commerce/PrintableTicket.jsx`** (+ `print.css`, `printBus.js`)
  — a single `<PrintSurface/>`, mounted once in `ProductWorkspace.jsx`, that
  portals (`createPortal`) the requested ticket directly onto `document.body`
  (sibling to `#root`). `@media print` hides `#root` and shows only the
  ticket; it clears itself on the browser's `afterprint` event.
- **`usePrintTicket()`** hook — `printTicket(order, business, variant)` from
  any component, via a tiny module-level pub-sub (`printBus.js`) rather than
  threading a callback down every tab, and rather than mounting a hidden
  ticket per row (which would conflict if several existed at once).
- One component, two variants: `"kitchen"` (ref, time, items +
  `selectedOptions`, notes front-and-centre, fulfilment method) and
  `"receipt"` (adds unit/line prices, a total, thank-you footer). Wired to a
  "Print ticket" button on `KitchenBoard` cards and a "Print receipt" button
  on `ResourceManager`'s `orders` rows (schemaVersion 2 orders).
- Tests: `PrintableTicket.test.jsx` (portal mount, `window.print()` call,
  receipt-vs-kitchen content, `afterprint` cleanup) — 55 frontend / 50
  functions tests total, all green.

### Added — Food-ordering vertical, Phase 4: Food catalogue shape (2026-09-05)

Additive, builds on Phases 1–3.

- **`businesses/{id}/offers/{id}` optional fields**: `category`, `variants:
  [{label, priceDeltaCents}]`, `modifierGroups: [{name, min, max, options:
  [{label, priceCents}]}]`, `prepMinutes`, `available` (default true),
  `stockCount`. Sanitized and capped by `offerSnapshot()` in
  `functions/commerce.js` (12 variants / 8 groups / 20 options max).
- **`functions/commerce.js` `resolveSelectedOptions(offer, rawSelection)`** —
  turns a customer's `{ variant, modifiers[] }` labels into server-priced
  entries against the *reloaded* offer; rejects a missing required variant, an
  unknown label, or a group min/max violation with `400`. Shared by `buildOrder`
  (free/quote requests) and `buildCheckoutOrder` (paid checkout — imported into
  `commerceCheckout.js`).
- **`commerceCheckout.js` `normalizeCheckoutSelections`** now groups cart lines
  by offer id *and* selected options, so distinct variants of the same offer
  stay separate lines instead of merging quantities.
- **Availability enforcement**: both public order-creation paths (`/requests`,
  `checkoutOfferSnapshots`) reject `available === false` offers with `409`,
  alongside the existing `status !== "active"` check.
- **Stock, decremented atomically with the order write**: `/requests`
  decrements `stockCount` in the same `db.batch()` that writes the order
  (`409` if insufficient at read time); `/checkout-sessions` re-reads live
  `stockCount` *inside* its existing `db.runTransaction()`, so a concurrent
  sale is caught by Firestore's transaction retry. Hits 0 → `available` flips
  to `false` automatically. Deliberately short of a full reservation/hold
  system — that's the separate "Stock reservations" commerce-roadmap item.
- **Owner editor**: `ResourceManager.jsx` offers form gains `available` (all
  businesses) and food-aware-only `category` / `prepMinutes` fields plus a new
  `OfferOptionsEditor` — repeatable rows for variants and modifier groups
  (Rand in the UI, converted to minor units on save, same as `price`). A
  one-tap "Mark sold out" / "Mark available" toggle was added to the offers
  table row actions. `foodAware` now flows from `ProductWorkspace` into
  `ResourceManager`.
- **Public menu**: `PublicBusinessPage` groups offers by `category` when
  present, renders a variant `<select>` + modifier checkboxes with a
  live-priced summary in the request form, badges "Sold out" cards, and
  disables sold-out options in the offer picker. `PublicWebsite`'s
  product/service selects disable sold-out items too.
- **Known scope boundary**: the paid-checkout cart (`cart.js`
  `checkoutEligible`, `PublicCheckoutPanel`) does not yet support choosing a
  variant or a *required* modifier — such offers stay request-only until the
  cart gets its own picker. Optional (`min: 0`) modifier groups don't block
  checkout eligibility but also can't be selected from the cart yet.
  `PublicWebsite` doesn't render the variant/modifier picker either (its
  contact/order form still submits without `selectedOptions` for those
  fields) — both are documented follow-ups, not silent gaps.
- Tests: `functions/commerce.test.js`, `functions/commerceCheckout.test.js`,
  `ResourceManager.test.jsx`, `cart.test.js` — 52 frontend / 50 functions
  tests total, all green.

### Added — Food-ordering vertical, Phase 3: Accepting-orders toggle + hours (2026-08-28)

Additive, builds on Phases 1–2.

- **`businesses/{id}` optional fields** — `ordering: { acceptingOrders,
  pausedReason, pausedUntil }`, `hours: { display }`, `prepDefaultMinutes`, and
  the `foodOrdering` escape-hatch boolean. `pausedUntil` is an ISO string; a
  value in the past auto-reopens.
- **`functions/ordering.js` `assertAcceptingOrders(business)`** — throws
  `409 { code: "ORDERING_PAUSED" }` (with the owner's `pausedReason`). Called in
  `POST /public/businesses/:slug/requests` (offer path only, contact enquiries
  still go through) and `POST /public/businesses/:slug/checkout-sessions`.
  Covered by `functions/ordering.test.js`. `firestore.rules` `orders` block
  carries a comment pointing at it.
- **`src/features/commerce/OrderingSettingsCard.jsx`** (+ `orderingSettings.css`)
  — owner control (accepting switch, paused reason + reopen time, opening-hours
  string, default prep minutes, `foodOrdering` toggle). Rendered in the Business
  profile tab (always reachable) and atop the Kitchen tab.
- **`src/features/commerce/ordering.js` `orderingPaused(business)`** — client
  mirror of the server guard. `PublicBusinessPage` shows a closed banner, hides
  offer actions + the "View offers" CTA, and blocks offer submits;
  `PublicWebsite` blocks non-contact submits and surfaces the server reason;
  `PublicCheckoutPanel` returns null when paused. `hours.display` renders in the
  `PublicBusinessPage` hero. `PublicWebsite` now also shows the Phase 2 "Track
  your order" link and surfaces server error messages.

### Added — Food-ordering vertical, Phase 2: Public order tracker (2026-08-28)

Builds on Phase 1. Additive.

- **`GET /public/businesses/:slug/orders/:publicReference?token=…`** — a public,
  token-guarded endpoint returning a customer-safe order projection (status,
  fulfilment method, item name+qty, ETA, business name/phone, currency, total).
  Never exposes the raw order document; unknown ref or bad token → 404. Order
  lookup is by `publicReference` (Firestore auto-indexes single fields).
- **Order-tracker token** — `functions/commerce.js` `buildOrder` and
  `functions/commerceCheckout.js` `buildCheckoutOrder` take an optional
  `clientTokenHash` and store it verbatim (`commerce.js` stays crypto-free). The
  `/requests` handler mints the raw token with `checkoutSecret()` and hashes it
  with `hashCheckoutSecret()`; paid checkout reuses its `clientSecret` as the
  token. `clientTokenHash` added to `preservesOrderSnapshot()` in
  `firestore.rules` (via `.get(..., "")` so pre-existing orders still validate).
- **`statusUrl` in responses** — `/requests` 201 keeps `reference`, adds
  `publicReference` + `statusUrl`; `checkout-sessions` POST and the
  `checkout-sessions/:sessionId` GET projection add `statusUrl`.
- **`src/features/commerce/PublicOrderStatus.jsx`** (+ `orderStatus.css`) — new
  public route `/o/:slug/:publicReference` in `src/App.js`. A no-login status
  stepper (labels derived from `fulfilmentMethod`), short-polling every 8 s and
  stopping on `completed` / `cancelled`. `getPublicOrderStatus()` added to
  `commerceService.js`.
- **"Track your order"** link surfaced on `PublicBusinessPage` after a request
  and on `CommerceCheckoutComplete` once payment is confirmed.
- ETA = `max(item.prepMinutes)` else `business.prepDefaultMinutes` else 15,
  zeroed once the order is ready/out-for-delivery/completed/cancelled. Those
  fields arrive in Phases 3–4, so ETA currently shows the 15-min fallback.

### Added — Food-ordering vertical, Phase 1: Kitchen board (2026-08-28)

First slice of `docs/WEBILO_FOOD_ORDERING_VERTICAL.md`. Additive — no change to
how existing (non-food) businesses behave.

- **`ready` / `out_for_delivery` order statuses** added to the canonical lifecycle
  (`firestore.rules` `validOrderStatusTransition()`), between `processing` and
  `completed`. Both optional; `processing → completed` still works. Delivery orders
  can go `ready → out_for_delivery → completed`.
- **`orderStatusNotification`** now emails customers on `ready` / `out_for_delivery`
  (website-sourced orders only, as before — manually captured counter/phone orders
  still send no notification, documented in a code comment).
  `functions/notifications.js` gains `statusCopy` for both and humanises the
  `out_for_delivery` subject line.
- **`src/features/commerce/orderTransitions.js`** (new) — the single next-status
  map + kitchen column definitions, imported by both `ResourceManager.jsx` (which
  now renders one `nextOrderStep`-driven advance button instead of three hardcoded
  ones) and the new `KitchenBoard`.
- **`KitchenBoard`** (`src/features/commerce/KitchenBoard.jsx` + `kitchen.css`) —
  a live status-column board, added as a `kitchen` workspace tab in
  `ProductWorkspace`. Real-time via a new `subscribeRecords()` helper in
  `businessRepository.js` (first `onSnapshot` use there). One-tap advance,
  secondary cancel, "text customer" (reuses `messagingService.sendMessage`) +
  WhatsApp fallback link.
- **New-order sound** — `useKitchenSound` hook, off by default, per-user
  (`localStorage`), armed by a visible "Enable sound" button (autoplay policy).
  Synthesised cues under `public/sounds/`.
- **Food gating** — `src/features/commerce/foodMode.js` `isFoodBusiness()` keys off
  `business.category` (`restaurant` / `takeaway` / `cafe` / `food`) with a
  `business.foodOrdering === true` escape hatch. The `kitchen` tab is filtered out
  of all three `TABS`-derived surfaces (nav, Today cards, All-tools hub) for
  non-food businesses. `BusinessOnboarding` category select gains Takeaway and
  Cafe options.
- **`firestore.indexes.json`** — `orders` composite index `status ASC, createdAt DESC`
  for the board query (deploy before production use).
- Docs: `WEBILO_COMMERCE_ARCHITECTURE.md` Lifecycle section and
  `WEBILO_FOOD_ORDERING_VERTICAL.md` §3.3 updated.

### Added — Developer Communications API (`/v1/*`)

A new API surface under `/v1` on the existing `exports.api` Express app, letting
other apps (starting with Study Acumen) send email/SMS through Webilo's existing
Resend/Twilio integration via an API key, instead of integrating those providers
directly. Webilo's own routes, UI, and provider integrations are unchanged —
this is an additive interface over infrastructure that already existed
(`functions/providers/messaging`).

- `POST /v1/email`, `POST /v1/sms` — both terminate at the same
  `getMessagingProvider()` call the internal `/messages/send` route already
  uses; no second Resend/Twilio implementation.
- API-key authentication (`x-api-key` header) backed by a Firestore-only data
  model: `apiKeys/{sha256(rawKey)}` for O(1) lookup, owning `projects/{projectId}`
  documents, all denied to clients in `firestore.rules` (Admin SDK-only).
- `Idempotency-Key` request header support — a repeated request with the same
  key returns the first attempt's response instead of sending again; a key
  still mid-flight gets `409`.
- Per-project, per-environment rate limiting (Firestore-transaction fixed
  window, same pattern as the existing `enforceAiRateLimit`) and a monthly
  usage rollup per project.
- `functions/scripts/provisionDeveloperProject.js` — one-off CLI to manually
  provision a project + API key until self-serve issuance exists.
- The Resend provider (`functions/providers/messaging/resend.js`) now accepts
  an optional `html` body alongside `text`, used by `/v1/email` and available
  to the internal `/messages/send` route too.
- `GET /v1/messages/:id` — scoped to the caller's own project; a different
  project's key gets `404` for the same id.
- `POST /webhooks/resend` — delivery-status updates (sent/delivered/bounced)
  from Resend, matched back to a message via a Firestore collection-group
  query on `providerMessageId`. Signature verification implements Svix's
  HMAC scheme directly rather than adding the `svix` package. Needs a field
  override (not a composite index — Firestore rejects that for a
  single-field collection-group query) declared in `firestore.indexes.json`
  and deployed; rules, indexes, and the `RESEND_WEBHOOK_SECRET` secret have
  since been deployed to `smart-shop-bb140`.
- `POST /webhooks/twilio-status` — sent/delivered/failed/undelivered
  updates from Twilio, matched back to a message the same way as the
  Resend webhook. `twilioSender.js`'s `sendSMS`/`sendWhatsApp` now accept
  an optional `statusCallback`, passed through only by `/v1/sms` — the
  internal `/messages/send` route's existing Twilio sends are unaffected.
  Verifies `X-Twilio-Signature` via the `twilio` package's own
  `validateRequest` (already a dependency).
- `POST /v1/whatsapp` — same request/response shape as `/v1/sms`, sharing
  its handler (`createTwilioSendHandler`) now that both are near-identical
  wraps around `getMessagingProvider().sendWhatsApp`/`sendSms`. Covered by
  the Twilio status-callback webhook and usage/rate-limit tracking the
  same way `/v1/sms` is.
- `GET /v1/messages` — cursor-paginated (`?limit=&cursor=`), ordered
  newest first; the cursor is just a previously returned message's `id`.
- `GET /v1/usage` — was in the original endpoint list and never built;
  `recordUsage` was already writing counts, nothing read them back.
  Optional `?period=YYYY-MM` (validated), defaults to the current month;
  a period with no data returns zeros rather than 404.
- `functions/scripts/revokeApiKey.js` — sets an API key's status to
  `"revoked"`, which `requireApiKey` already rejected identically to an
  unrecognized key; there was previously no way to do this short of a
  manual Firestore console edit.
- `type`/`status` filtering on `GET /v1/messages` (`?type=` or `?status=`,
  mutually exclusive), backed by two new composite indexes in
  `firestore.indexes.json`.
- Self-serve project/API-key management, mounted at `/developer` and
  gated by a Firebase ID token (not `/v1`'s `x-api-key`) — creating and
  listing projects, issuing keys (raw value shown once), and revoking
  them, all scoped so one owner can never see or touch another owner's
  projects/keys. Backend routes only; no UI yet, and no access/billing
  gate — any signed-in Webilo user can create a project today.

### Not yet included

- A developer portal UI for the self-serve routes above.
- A `functions/.secret.local` file must exist locally (gitignored, not
  committed) with placeholder provider secrets before running the Functions
  emulator, so local/emulator runs never fetch real Resend/Twilio credentials
  from Secret Manager.

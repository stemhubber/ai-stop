# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Webilo (package name `smart-shop`) is a business operating platform: a React SPA (business dashboard, website builder/editor, public storefronts) backed by Firebase (Auth, Firestore, Storage, Hosting, Cloud Functions). It brings business setup, products/services, customers, orders, bookings, messaging, publishing, and analytics into one workspace under `businesses/{businessId}`.

`docs/DEVELOPER_RULES.md` is the canonical rules document for this repo — read it before non-trivial changes. Its **section 14, "Current repository state," overrides every other section** where they conflict: much of the doc (e.g. `src/hooks`, `src/utils` as single-purpose dirs, an `anthropic.js` proxy, Sentry, a `dev` branch) describes target-state architecture that is not implemented. Do not treat target-state examples in that doc as instructions to build new infrastructure.

## Commands

Frontend (root):
```bash
npm install                       # install frontend deps
npm start                         # dev server at http://localhost:3000 (npm.cmd start on PowerShell if blocked)
npm test                          # Jest + RTL via CRA, watch mode
npm test -- --watchAll=false      # single run (CI-style)
npm test -- --watchAll=false -t "<name>"   # run tests matching a name
npm test -- src/path/to/File.test.js       # run a single test file
npm run build                     # production build to build/
npm run preview                   # serve build/ via scripts/serve-build.js
npm run deploy                    # build + firebase deploy (hosting + functions)
```
There is **no `npm run lint` script**. CRA runs ESLint during `start`/`build`; don't add a lint command until one is actually committed.

Cloud Functions (`functions/`):
```bash
cd functions && npm install
node --test                       # run all functions tests (Node's built-in test runner, not Jest)
node --test path/to/file.test.js  # run a single functions test file
npm run serve                     # firebase emulators:start --only functions
npm run shell                     # firebase functions:shell
npm run deploy                    # firebase deploy --only functions
npm run logs                      # firebase functions:log
```
Functions tests use `node:test`/`node:assert` (see any `functions/*.test.js`), **not** Jest — don't reach for `jest` commands there.

Firebase emulators (run from repo root):
```bash
firebase emulators:start
```
Auth `9099`, Firestore `8080` (needs a Java runtime), Functions `5001`, Hosting `5003`, Storage `9199`. Set `REACT_APP_USE_FIREBASE_EMULATORS=true` in `.env.local` to point the frontend at them. **Develop against the emulators, not the production project** — the active Firebase alias is `smart-shop-bb140` (`firebase use` to confirm).

Required Firebase secrets (never commit values): `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`, `TWILIO_WHATSAPP_FROM`, `SENDGRID_API_KEY`, `EMAIL_FROM`, `PAYSTACK_SECRET`, `OPENAI_API_KEY`.

## Architecture

**Split codebases, one repo.** The frontend (`src/`) is a Firebase-Web-SDK client that reads/writes Firestore/Storage directly for most data. `functions/` is a separate Node/CommonJS package (its own `package.json`, own `node_modules`) holding everything privileged: payment processing, AI proxying, scheduled/triggered jobs. **Frontend code must never import `firebase-admin`, `firebase-functions`, Twilio, or any payment/AI secret** — those belong exclusively in `functions/`. All third-party API keys except Pexels and map tiles must stay server-side; `REACT_APP_*` env vars are bundled into the browser and are effectively public.

**Two eras of frontend code coexist in `src/`:**
- `src/components/`, `src/controllers/`, `src/context/`, `src/Billing/`, `src/linkyloop/` — the original website-builder/dashboard app (site creation, publishing, contacts/follow-ups).
- `src/features/` (`commerce/`, `plans/`, `websites/`) and `src/components/product/` — the newer business-operating-platform layer (onboarding, `ProductWorkspace`, public business pages, checkout, plans/usage). New business-workspace work belongs here, not in the legacy `components/`/`controllers/` split.
- `src/services/` holds Firebase setup plus client wrappers for external-facing concerns (`PaymentController`, `aiService`, `advisorService`, `commerceService`, `messagingService`, `businessRepository`, `websiteRepository`, `paymentConnectionService`). `src/config/plans.js` mirrors the plan catalog used server-side.

**Routing** (`src/App.js`) mixes both eras: `/business` (→ `ProductWorkspace`, the owner workspace) and `/app` redirects there; `/onboarding` creates a business; `/w/:slug` is the live published-website route wired to real products/services/orders/bookings; `/b/:slug` is the lighter public business page; `/studio/*`, `/websites`, `/editor/:projectId`, `/site/:siteName` are the website builder/publishing flows; `/pro` and `/usage` cover plan upgrade and fair-use metering; `/legacy-studio` is the old dashboard kept for compatibility.

**Cloud Functions (`functions/index.js`) is a single Express app** (`exports.api`) plus separate exported triggers — it is not split into per-route files. Within it:
- `/payments/*`, `/paystack/*` (legacy aliases), `/ai/*`, `/messages/*`, and the public `/public/businesses/:slug/*` (enquiries, checkout sessions) routes are mounted on the Express app. Auth'd routes use `requireAuth` and expect a Firebase ID token as `Authorization: Bearer <token>`.
- Firestore triggers (`onDocumentCreated`/`onDocumentUpdated`) drive side effects: welcome notifications, order/booking created and status-change notifications, and two-way order↔booking projection sync.
- `exports.followUpScheduler` runs every minute (`Africa/Johannesburg`) formatting phone numbers to E.164 and sending due follow-ups via Twilio.
- `functions/plans.js` is the source of truth for `PLAN_CATALOG`, `effectivePlan`, and usage recording/reservation — plan/entitlement logic must go through it, not be reimplemented client-side. `src/config/plans.js` mirrors its shape for the frontend `PlanProvider`.
- `functions/commerce.js` / `functions/commerceCheckout.js` hold order/checkout-session construction logic (`buildOrder`, `normalizeCustomer`, etc.) — covered by `node:test` files of the same name.

**Provider registries isolate vendor code** under `functions/providers/{ai,payment,messaging}/index.js`, each exposing a `get<Kind>Provider(name)` lookup keyed by an env var (`AI_PROVIDER`, `PAYMENT_PROVIDER`, `MESSAGING_PROVIDER`; e.g. `providers/ai/index.js` picks between adapters like `openai.js` by name). Add a new vendor as a new adapter module in the matching `providers/<kind>/` folder and register it in that folder's `index.js` — don't hardcode vendor SDK calls into route handlers in `functions/index.js`.

**Firestore data model** (see `firestore.rules` for the authoritative shape): most business data nests under `businesses/{businessId}` — `members`, `modules`, `products`, `services`, `offers`, `customers`, `orders` (with an `events` subcollection), `bookings`, `messages`, `campaigns`, `advisorActivity`, `checkoutSessions`, `paymentConnections`. Top-level collections include `users/{userId}` (with `usage/{period}` and `websiteActivity` subcollections), `websites`, `publishedWebsites/{slug}`, `businessSlugs/{slug}`, `publishedSites/{siteId}`, `payments`, `paymentWebhookEvents`. Every document should carry `createdAt`/`updatedAt` via `serverTimestamp()`. Before changing a collection's shape: find every reader/writer, plan compatibility for existing documents, and update `firestore.rules` (rules deny-all by default at the bottom) — never assume an empty database.

**Design system** (`lib/styles/webilo-tokens.css`, `lib/styles/webilo.css`, `wb-*` classes) is opt-in and not imported automatically — load the tokens file before the component file or `var(--wb-*)` references stay unresolved. See `docs/WEBILO_UI_USAGE_GUIDE.md` and `docs/WEBILO_UI_DECISIONS.md` before adding new UI primitives.

## Notes specific to this repo

- Deployed Cloud Run/Functions API URL is currently hardcoded in the frontend payment client (`src/services/PaymentController.js`) — update it if the API is redeployed under a different project/region rather than adding another env-specific URL.
- AI/Whisper/messaging usage is metered server-side under `users/{userId}/usage/{YYYY-MM}`; plan/entitlement fields are server-controlled, so don't trust or duplicate them in frontend state beyond what `PlanProvider` exposes.
- On Windows PowerShell, `npm start`/`npm test` may need `npm.cmd` if script execution policy blocks `npm.ps1`.

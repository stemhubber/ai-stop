# Webilo

Webilo is a business operating platform with a connected AI-assisted website. It brings business setup, products, services, customers, orders, bookings, messaging, publishing, and analytics into one workspace.

## Product flows

The product branch adds a business-centered operating workspace:

- `/onboarding` creates a South African business and selects active modules.
- `/business` opens the owner workspace and business switcher (`/app` redirects there).
- Products, services, customers, orders, bookings, messages, and campaigns are managed under `businesses/{businessId}`.
- `/w/:slug` renders a published website connected to live products, services, enquiries, orders, and booking requests.
- `/b/:slug` remains the lightweight public business-page route.
- `/pro` explains the premium plan and routes verified upgrades through Paystack.
- `/usage` shows monthly AI, token, transcription, and messaging fair-use meters.
- Existing website-studio, billing, profile, and messaging routes remain available.

## Current architecture

```text
React single-page application
├── Firebase Authentication
├── Cloud Firestore
├── Firebase Storage
├── OpenAI and Pexels APIs
└── Firebase Hosting
    └── Firebase Cloud Functions
        ├── Express payment API → Paystack
        └── Scheduled follow-ups → Twilio SMS
```

The browser application reads and writes Firebase services directly through the Firebase Web SDK. Server-side payment and scheduled messaging logic runs in Firebase Cloud Functions.

## Stack

### Frontend

- React 19 and React DOM
- Create React App (`react-scripts` 5)
- React Router 7
- Plain CSS
- Framer Motion for UI animation
- Three.js for animated 3D backgrounds
- Leaflet and React Leaflet for maps
- Axios for HTTP requests
- UUID for generated asset and record identifiers

### Firebase

- Firebase Authentication with email/password and Google sign-in
- Cloud Firestore for users, sites, products, contacts, and follow-ups
- Firebase Storage for images and video
- Firebase Hosting for the production SPA
- Firebase Cloud Functions for the payment API and scheduled follow-up processing
- Firebase Admin SDK inside Cloud Functions

### Cloud Functions

- Node.js 24 runtime
- CommonJS modules
- Express 5
- CORS
- Firebase Functions v2 scheduler

### External services

- OpenAI Chat Completions for generated website content
- OpenAI Audio Transcriptions for voice input
- Pexels API for stock-image search
- Paystack for payment initialization and verification
- Twilio for SMS follow-ups
- OpenStreetMap tiles and Nominatim geocoding
- Google Maps and Street View embeds
- UI Avatars for fallback profile images

## Project structure

```text
src/
  Billing/              Billing and payment-completion UI
  components/           Website builder, dashboard, publishing, and media UI
  context/              Authentication and contextual-help providers
  controllers/          Firebase, OpenAI, Pexels, site, and user operations
  linkyloop/             Contacts and scheduled follow-up messaging
  services/             Firebase setup, Firestore helpers, and payment client

lib/
  styles/
    webilo-tokens.css    Shared design tokens
    webilo.css           Reusable wb-* component and utility classes

functions/
  index.js              Scheduled SMS function and Express payment API
  env.js                Firebase secret declarations
  paystack.js           Paystack integration
  twilioSender.js       Twilio integration

firebase.json           Hosting, Functions, and emulator configuration
```

## UI style library

Reusable Webilo design-system styles live in `lib/styles/`:

```text
lib/styles/webilo-tokens.css
lib/styles/webilo.css
```

Load the token file before the component file. For a CSS entry point that can resolve repository-root files:

```css
@import "../lib/styles/webilo-tokens.css";
@import "../lib/styles/webilo.css";
```

The library is opt-in and is not loaded by the current React application automatically. Its classes use the `wb-` prefix:

```jsx
<div className="wb-card">
  <h2 className="wb-heading">Business profile</h2>
  <p className="wb-secondary">Keep your public details up to date.</p>
  <button className="wb-btn wb-btn-primary" type="button">
    Save changes
  </button>
</div>
```

The component stylesheet depends on the variables in `webilo-tokens.css`; reversing the import order will leave its `var(--wb-*)` declarations unresolved. See the [UI usage guide](docs/WEBILO_UI_USAGE_GUIDE.md) for component examples and current application conventions.

## Prerequisites

- Node.js and npm
- Node.js 24 when running or deploying `functions/`
- Firebase CLI
- Access to the Firebase project configured in `.firebaserc`
- Credentials for the external services used by the features you enable

## Local setup

Install the frontend and Cloud Functions dependencies:

```bash
npm install
cd functions
npm install
cd ..
```

Create a root `.env.local` file:

```dotenv
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_FIREBASE_MEASUREMENT_ID=

REACT_APP_PEXELS_API_KEY=
# Optional override. Leave blank to use the deployed Firebase Function.
REACT_APP_API_BASE_URL=
REACT_APP_USE_FIREBASE_EMULATORS=false
```

All `REACT_APP_*` values are bundled into the browser build. OpenAI is called through the authenticated Firebase API function; configure its key only as a Firebase secret.

Configure backend credentials as Firebase secrets:

```bash
firebase functions:secrets:set TWILIO_SID
firebase functions:secrets:set TWILIO_TOKEN
firebase functions:secrets:set TWILIO_FROM
firebase functions:secrets:set TWILIO_WHATSAPP_FROM
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:secrets:set EMAIL_FROM
firebase functions:secrets:set PAYSTACK_SECRET
firebase functions:secrets:set OPENAI_API_KEY
```

Provider selection is configuration-driven:

```dotenv
AI_PROVIDER=openai
PAYMENT_PROVIDER=paystack
MESSAGING_PROVIDER=twilio
```

The backend provider registries isolate vendor-specific code. New payment or messaging providers can be added without changing product controllers or frontend flows. Twilio is the default SMS provider; WhatsApp requires a Twilio WhatsApp sender, and email through the Twilio ecosystem requires a SendGrid adapter.

In Firebase Authentication, enable Email/Password and Google providers and add the local and deployed domains as authorized domains.

## Development

Start the React development server:

```bash
npm start
```

The app runs at `http://localhost:3000`.
On Windows PowerShell, use `npm.cmd start` if script execution policy blocks
`npm.ps1`.

Run the frontend test suite:

```bash
npm test
```

The PowerShell-safe equivalent is `npm.cmd test`.

Run the configured Firebase emulators:

```bash
firebase emulators:start
```

The Functions emulator uses port `5001`, Hosting uses `5003`, and the Emulator Suite UI is enabled.

Auth uses `9099`, Firestore uses `8080`, and Storage uses `9199`. Install a compatible Java runtime before starting the Firestore emulator.

## Production

Create an optimized frontend build:

```bash
npm run build
```

Deploy Hosting and Cloud Functions:

```bash
npm run deploy
```

The Firebase Hosting configuration serves `build/` and rewrites application routes to `index.html`.

To deploy only the backend:

```bash
cd functions
npm run deploy
```

## Backend endpoints and jobs

The exported `api` Cloud Function exposes:

```text
POST /payments/init
GET  /payments/verify/:ref
POST /ai/site
POST /ai/website-draft
POST /ai/business-profile
POST /ai/extract-business-image
POST /ai/transcribe
POST /messages/send
GET  /paystack/health
```

Payment and AI routes require a Firebase ID token in the `Authorization: Bearer <token>` header. Legacy `/paystack/*` aliases remain temporarily for compatibility.

AI, Whisper, and messaging requests are metered on the backend under
`users/{userId}/usage/{YYYY-MM}`. Plan fields are server-controlled; verified
Pro payments activate 30 days of Pro access. The React `PlanProvider` exposes
the effective plan, entitlements, limits, and live usage to application views.

The exported `followUpScheduler` runs every minute in the `Africa/Johannesburg` timezone. It queries pending Firestore follow-ups, formats South African phone numbers to E.164, sends them through Twilio, and updates their delivery status.

The frontend payment client currently targets the deployed Cloud Run URL defined in `src/services/PaymentController.js`. Update that URL when deploying the API under a different Firebase project or region.

## Additional documentation

- [Webilo Pro product plan](docs/WEBILO_PRO_PRODUCT_PLAN.md)
- [Webilo user journey action plan](docs/WEBILO_USER_JOURNEY_ACTION_PLAN.md)
- [Ask Webilo business advisor](docs/WEBILO_BUSINESS_ADVISOR.md)
- [Webilo offer and commerce architecture](docs/WEBILO_COMMERCE_ARCHITECTURE.md)
- [Webilo architecture](docs/WEBILO_ARCHITECTURE.md)
- [Webilo product rebuild](docs/WEBILO_PRODUCT_REBUILD.md)
- [Webilo AI integration](docs/WEBILO_AI_INTEGRATION.md)
- [Webilo messaging setup](docs/WEBILO_MESSAGING_SETUP.md)
- [Webilo developer rules](docs/DEVELOPER_RULES.md)
- [Webilo UI usage guide](docs/WEBILO_UI_USAGE_GUIDE.md)
- [Webilo UI design decisions](docs/WEBILO_UI_DECISIONS.md)

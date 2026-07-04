# Webilo

Webilo is a React-based website builder and small-business dashboard. It supports AI-assisted site creation, publishing, product and media management, customer follow-ups, and billing.

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

functions/
  index.js              Scheduled SMS function and Express payment API
  env.js                Firebase secret declarations
  paystack.js           Paystack integration
  twilioSender.js       Twilio integration

firebase.json           Hosting, Functions, and emulator configuration
```

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
```

All `REACT_APP_*` values are bundled into the browser build. OpenAI requests run through the authenticated Firebase API function; configure the key only with `firebase functions:secrets:set OPENAI_API_KEY`.

Configure backend credentials as Firebase secrets:

```bash
firebase functions:secrets:set TWILIO_SID
firebase functions:secrets:set TWILIO_TOKEN
firebase functions:secrets:set TWILIO_FROM
firebase functions:secrets:set PAYSTACK_SECRET
```

In Firebase Authentication, enable Email/Password and Google providers and add the local and deployed domains as authorized domains.

## Development

Start the React development server:

```bash
npm start
```

The app runs at `http://localhost:3000`.

Run the frontend test suite:

```bash
npm test
```

Run the configured Firebase emulators:

```bash
firebase emulators:start
```

The Functions emulator uses port `5001`, Hosting uses `5003`, and the Emulator Suite UI is enabled.

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
POST /public/businesses/:slug/requests
POST /paystack/init
GET  /paystack/verify/:ref
GET  /paystack/health
```

Public business requests are resolved and priced by the backend. The browser sends offer identity, quantity, fulfilment choice, and customer details; it does not provide an authoritative total. See [Webilo offer and commerce architecture](WEBILO_COMMERCE_ARCHITECTURE.md).

The exported `followUpScheduler` runs every minute in the `Africa/Johannesburg` timezone. It queries pending Firestore follow-ups, formats South African phone numbers to E.164, sends them through Twilio, and updates their delivery status.

The frontend payment client currently targets the deployed Cloud Run URL defined in `src/services/PaymentController.js`. Update that URL when deploying the API under a different Firebase project or region.

## Additional documentation

- [Webilo architecture](docs/WEBILO_ARCHITECTURE.md)

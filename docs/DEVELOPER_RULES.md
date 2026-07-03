# Webilo developer rules

This document is the single source of truth for how we build Webilo.
Read it before writing code. Follow it on every PR.
When something is unclear, this document wins over instinct.

> **Current-state warning:** Some sections describe intended architecture,
> packages, branches, or tooling that are not implemented yet. Check
> [Current repository state](#14-current-repository-state) before running a
> command or importing an example. Target-state examples do not authorize
> inventing missing infrastructure or deploying it without review.

> Related docs:
> - `docs/WEBILO_UI_DECISIONS.md` — which component to use and when
> - `docs/WEBILO_UI_USAGE_GUIDE.md` — wb-* class reference
> - `lib/styles/webilo-tokens.css` — design tokens
> - `lib/styles/webilo.css` — component classes

---

## Table of contents

1. [Before you write a single line](#1-before-you-write-a-single-line)
2. [Project structure](#2-project-structure)
3. [Development workflow](#3-development-workflow)
4. [Code standards](#4-code-standards)
5. [Security rules — non-negotiable](#5-security-rules--non-negotiable)
6. [Firebase rules](#6-firebase-rules)
7. [Error handling](#7-error-handling)
8. [Crash reporting and monitoring](#8-crash-reporting-and-monitoring)
9. [UI and design rules](#9-ui-and-design-rules)
10. [State management](#10-state-management)
11. [Testing](#11-testing)
12. [Deployment](#12-deployment)
13. [Current priorities](#13-current-priorities)

---

## 1. Before you write a single line

### Local setup

```bash
# 1. Install frontend dependencies
npm install

# 2. Install Cloud Functions dependencies
cd functions && npm install && cd ..

# 3. Copy the environment template and fill in values
cp .env.local.example .env.local

# 4. Start the Firebase emulators (Auth, Firestore, Functions, Hosting)
firebase emulators:start

# 5. In a second terminal, start the React dev server
npm start
```

The app runs at `http://localhost:3000`.
The emulator suite UI runs at `http://localhost:4000`.
Functions run at `http://localhost:5001`.

**Always develop against the emulators, not the production Firebase project.**
Mistakes in dev should never touch real user data.

### First-time Firebase setup

```bash
# Install the Firebase CLI if you don't have it
npm install -g firebase-tools

# Log in
firebase login

# Confirm you're pointed at the right project
firebase projects:list
firebase use <project-id>
```

### Required secrets (never commit these)

```bash
# Backend secrets — set once, never touch again unless rotating
firebase functions:secrets:set TWILIO_SID
firebase functions:secrets:set TWILIO_TOKEN
firebase functions:secrets:set TWILIO_FROM
firebase functions:secrets:set PAYSTACK_SECRET
firebase functions:secrets:set ANTHROPIC_API_KEY   # when migrating from OpenAI
```

---

## 2. Project structure

```text
webilo/
├── docs/
│   ├── DEVELOPER_RULES.md          ← you are here
│   ├── WEBILO_UI_DECISIONS.md      ← component decisions
│   └── WEBILO_UI_USAGE_GUIDE.md    ← wb-* class examples
│
├── lib/
│   └── styles/
│       ├── webilo-tokens.css       ← CSS variables (load first)
│       └── webilo.css              ← wb-* component classes
│
├── src/
│   ├── components/                 ← UI components, one folder per feature
│   │   ├── Dashboard/
│   │   ├── Commerce/
│   │   ├── Customers/
│   │   ├── Marketing/
│   │   ├── Operations/
│   │   └── shared/                 ← reusable components (Button, Modal, Toast)
│   │
│   ├── context/                    ← React context providers
│   │   ├── AuthContext.jsx
│   │   └── HelpContext.jsx
│   │
│   ├── controllers/                ← Firebase, API, and business logic
│   │   ├── firebase.js             ← Firebase SDK init
│   │   ├── OrderController.js
│   │   ├── ProductController.js
│   │   └── ...
│   │
│   ├── hooks/                      ← custom React hooks
│   │   ├── useOrders.js
│   │   ├── useToast.js
│   │   └── ...
│   │
│   ├── services/                   ← external service clients
│   │   ├── PaymentController.js    ← Paystack via Cloud Function
│   │   └── AIService.js            ← Anthropic via Cloud Function
│   │
│   ├── utils/                      ← pure functions, no side effects
│   │   ├── formatters.js           ← currency, date, phone
│   │   ├── validators.js
│   │   └── errors.js               ← error classification helpers
│   │
│   ├── Billing/
│   ├── linkyloop/
│   └── index.js
│
├── functions/
│   ├── index.js                    ← Cloud Function exports
│   ├── env.js                      ← secret declarations
│   ├── paystack.js
│   ├── twilioSender.js
│   └── anthropic.js                ← AI proxy (replaces OpenAI frontend calls)
│
├── .env.local                      ← never commit
├── .env.local.example              ← commit this, no real values
├── firebase.json
└── .firebaserc
```

### Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Component files | PascalCase | `OrderCard.jsx` |
| Hook files | camelCase, `use` prefix | `useOrders.js` |
| Controller files | PascalCase, `Controller` suffix | `OrderController.js` |
| Utility files | camelCase | `formatters.js` |
| CSS classes | `wb-` prefix, kebab-case | `wb-btn-primary` |
| Firestore collections | camelCase, plural | `orders`, `businessProfiles` |
| Firestore documents | auto-generated IDs via `addDoc` |  |
| Environment variables | `REACT_APP_` prefix for frontend | `REACT_APP_FIREBASE_API_KEY` |

---

## 3. Development workflow

### Branch strategy

```
main          ← production. nothing merges here without a review.
dev           ← integration branch. this is what you develop against.
feature/name  ← your work. branch from dev, merge back to dev.
fix/name      ← bug fixes. same flow.
```

```bash
# Start a new feature
git checkout dev
git pull origin dev
git checkout -b feature/order-status-update

# When done
git push origin feature/order-status-update
# Open a PR into dev
```

**Never push directly to `main`.**
**Never develop directly on `dev`.**

### Commit messages

```
type: short description (under 60 chars)

Types: feat, fix, style, refactor, docs, chore
```

Examples:
```
feat: add order status badge to order list
fix: WhatsApp number not formatting to E.164
style: apply wb-btn to dashboard action buttons
docs: update UI decisions with badge colour table
chore: move OpenAI calls behind Cloud Function
```

### Before every commit

```bash
# Make sure the app still runs
npm start

# Make sure tests pass
npm test -- --watchAll=false

# Check for obvious issues
npm run lint
```

---

## 4. Code standards

### React

**Use functional components and hooks everywhere.** No class components.

```jsx
// Correct
function OrderCard({ order, onStatusChange }) {
  const [loading, setLoading] = useState(false);
  // ...
}

// Wrong — never
class OrderCard extends React.Component { ... }
```

**One component per file.** If a file is getting long, the component
needs to be broken up, not the file.

**Props are the API of a component.** Name them clearly.
Avoid passing raw Firestore document objects as props — shape them first.

```jsx
// Wrong — passes raw Firestore doc, tight coupling
<OrderCard doc={firestoreDoc} />

// Correct — shaped into what the component needs
<OrderCard
  orderId={order.id}
  customerName={order.customer.name}
  amount={order.total}
  status={order.status}
  createdAt={order.createdAt}
/>
```

**Extract business logic into controllers and hooks.**
Components should be concerned with rendering, not with Firestore queries
or API calls.

```jsx
// Wrong — Firebase logic inside a component
function OrderList() {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    getDocs(collection(db, 'orders')).then(snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);
}

// Correct — logic in a hook
function OrderList() {
  const { orders, loading, error } = useOrders();
}

// src/hooks/useOrders.js
export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q,
      snap => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      err => {
        setError(err);
        setLoading(false);
        reportError(err, 'useOrders');
      }
    );
    return unsub; // always clean up listeners
  }, []);

  return { orders, loading, error };
}
```

### Formatting

**Always format currency, dates, and phone numbers through the shared utilities.**
Never format inline in JSX.

```js
// src/utils/formatters.js

export function formatZAR(amount) {
  if (amount == null) return '—';
  return `R ${Number(amount).toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000)   return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `Today at ${date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

export function formatPhone(number) {
  // Display format: 071 234 5678
  const digits = number.replace(/\D/g, '').replace(/^27/, '0');
  return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
}

export function toE164(number) {
  // Storage format: +27712345678
  const digits = number.replace(/\D/g, '');
  if (digits.startsWith('27')) return `+${digits}`;
  if (digits.startsWith('0'))  return `+27${digits.slice(1)}`;
  return `+27${digits}`;
}
```

```jsx
// In JSX
<span>{formatZAR(order.total)}</span>
<span>{formatRelativeTime(order.createdAt)}</span>
<span>{formatPhone(customer.phone)}</span>
```

---

## 5. Security rules — non-negotiable

### API keys never go in the browser bundle

**This is the most important rule in this document.**

Any API key in `REACT_APP_*` variables is visible to anyone who opens
DevTools → Network or simply reads your built JS bundle.

**Move ALL third-party API calls behind Cloud Functions:**

| Service | Current state | Required state |
|---|---|---|
| OpenAI / Anthropic | ⚠️ Called from frontend | ✅ Must be a Cloud Function |
| Paystack | ✅ Already behind Cloud Function | ✅ Keep as is |
| Twilio | ✅ Already behind Cloud Function | ✅ Keep as is |
| Pexels | ⚠️ Called from frontend | Move behind CF or accept (public key, lower risk) |

**How to proxy AI calls through a Cloud Function:**

```js
// functions/anthropic.js
const { onCall } = require('firebase-functions/v2/https');
const Anthropic = require('@anthropic-ai/sdk');

exports.generateContent = onCall(async (request) => {
  if (!request.auth) throw new Error('Unauthenticated');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: request.data.prompt }],
  });

  return { content: message.content[0].text };
});
```

```js
// src/services/AIService.js
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const generateContent = httpsCallable(functions, 'generateContent');

export async function generateWebsiteContent(prompt) {
  const result = await generateContent({ prompt });
  return result.data.content;
}
```

### Firestore security rules

Never use open rules. At minimum, every rule must verify the user is
authenticated and owns the resource.

```js
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: user is signed in
    function isAuth() {
      return request.auth != null;
    }

    // Helper: user owns this business
    function ownsBusinessProfile(businessId) {
      return isAuth() && request.auth.uid == businessId;
    }

    // Business profiles — owner only
    match /businessProfiles/{businessId} {
      allow read, write: if ownsBusinessProfile(businessId);

      // Orders under a business — owner only
      match /orders/{orderId} {
        allow read, write: if ownsBusinessProfile(businessId);
      }

      // Contacts — owner only
      match /contacts/{contactId} {
        allow read, write: if ownsBusinessProfile(businessId);
      }
    }

    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### `.env.local` hygiene

```bash
# .env.local.example — COMMIT THIS FILE
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_FIREBASE_MEASUREMENT_ID=
# Do NOT add REACT_APP_OPENAI_API_KEY — this must live in Firebase Secrets
```

```bash
# .gitignore — verify these are present
.env.local
.env.*.local
```

---

## 6. Firebase rules

### Firestore data shape

Every document must include `createdAt` and `updatedAt` timestamps.
Set them using `serverTimestamp()`, never `new Date()`.

```js
import { serverTimestamp } from 'firebase/firestore';

// When creating
await addDoc(collection(db, 'orders'), {
  ...orderData,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

// When updating
await updateDoc(doc(db, 'orders', orderId), {
  status: 'confirmed',
  updatedAt: serverTimestamp(),
});
```

### Real-time listeners vs one-time reads

Use real-time listeners (`onSnapshot`) for data the user interacts with
live: orders, messages, bookings.

Use one-time reads (`getDocs`, `getDoc`) for data that doesn't change
during a session: business profile settings, plan info.

**Always clean up listeners.** A listener that isn't unsubscribed is a
memory leak.

```js
useEffect(() => {
  const unsub = onSnapshot(query(...), handler);
  return () => unsub(); // React runs this on unmount
}, []);
```

### Pagination

Never load unlimited documents. Always use `limit()`.
For lists the user scrolls, use `startAfter()` cursor pagination.

```js
// First page
const first = query(
  collection(db, 'orders'),
  orderBy('createdAt', 'desc'),
  limit(25)
);

// Next page (pass the last visible document from previous result)
const next = query(
  collection(db, 'orders'),
  orderBy('createdAt', 'desc'),
  startAfter(lastVisible),
  limit(25)
);
```

### Storage file paths

Structure paths so Firestore security rules can be mirrored:

```
businesses/{businessId}/products/{productId}/{filename}
businesses/{businessId}/profile/{filename}
businesses/{businessId}/media/{filename}
```

---

## 7. Error handling

### The rule: never let an error be silent

Every `async` function that can fail must either:
1. Return an error state the caller can render, or
2. Catch and report to the error monitoring service

**Never swallow errors:**

```js
// Wrong — error disappears
async function saveOrder(data) {
  try {
    await addDoc(collection(db, 'orders'), data);
  } catch (e) {
    console.log(e); // silent failure, user doesn't know
  }
}

// Correct — error is surfaced and reported
async function saveOrder(data) {
  try {
    await addDoc(collection(db, 'orders'), data);
  } catch (err) {
    reportError(err, 'saveOrder', { data });
    throw new WebIloError('Could not save order. Please try again.', err);
  }
}
```

### Error classification

Create a shared error utility so every throw is consistent:

```js
// src/utils/errors.js

export class WebiloError extends Error {
  constructor(userMessage, originalError, context = {}) {
    super(userMessage);
    this.name = 'WebiloError';
    this.userMessage = userMessage;
    this.originalError = originalError;
    this.context = context;
  }
}

// Translate Firebase and API error codes into user-friendly messages
export function getFirebaseErrorMessage(code) {
  const messages = {
    'auth/user-not-found':       'No account found with that email.',
    'auth/wrong-password':       'Incorrect password. Try again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/too-many-requests':    'Too many attempts. Try again in a few minutes.',
    'auth/network-request-failed': 'No internet connection. Check your network.',
    'permission-denied':         'You don't have access to this.',
    'unavailable':               'Webilo is temporarily unavailable. Try again.',
    'deadline-exceeded':         'The request timed out. Try again.',
    'not-found':                 'This item no longer exists.',
  };
  return messages[code] ?? 'Something went wrong. Please try again.';
}
```

### Error display patterns

**Form validation errors** — inline, below the relevant field.
**Action failures** (save, send, delete) — toast notification.
**Page-level data failures** (couldn't load orders) — inline error state with retry.
**Fatal errors** (app crashes) — error boundary with a refresh prompt.

```jsx
// src/components/shared/ErrorState.jsx
export function ErrorState({ message, onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--wb-space-12)' }}>
      <p className="wb-body-sm wb-secondary">{message ?? 'Something went wrong.'}</p>
      {onRetry && (
        <button className="wb-btn wb-btn-sm" style={{ marginTop: 'var(--wb-space-4)' }} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
```

```jsx
// Usage
const { orders, loading, error } = useOrders();

if (loading) return <OrderListSkeleton />;
if (error)   return <ErrorState message="Couldn't load orders." onRetry={() => window.location.reload()} />;
return <OrderList orders={orders} />;
```

### Error boundaries

Wrap every major route in an error boundary so one broken component
doesn't crash the whole app.

```jsx
// src/components/shared/ErrorBoundary.jsx
import { Component } from 'react';
import { reportError } from '../../utils/crashReporter';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportError(error, 'ErrorBoundary', { componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 'var(--wb-space-12)', textAlign: 'center' }}>
          <p className="wb-heading">Something went wrong</p>
          <p className="wb-secondary" style={{ marginTop: 'var(--wb-space-3)' }}>
            We've been notified. Refresh the page to continue.
          </p>
          <button
            className="wb-btn wb-btn-primary"
            style={{ marginTop: 'var(--wb-space-6)' }}
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

```jsx
// Wrap routes
<ErrorBoundary>
  <Dashboard />
</ErrorBoundary>
```

### Network failures

South African mobile networks are inconsistent. Handle offline gracefully.

```js
// Listen for connectivity changes
window.addEventListener('online', () => showToast('Back online', 'success'));
window.addEventListener('offline', () => showToast('No internet connection', 'warning'));
```

Firebase's local persistence means Firestore reads still work offline.
Writes queue and sync when the connection restores. Tell the user this:

```
"Changes will sync when you're back online."
```

---

## 8. Crash reporting and monitoring

### Setup: Sentry (recommended for React web apps)

Firebase doesn't include browser crash reporting out of the box.
Sentry is the standard choice — free tier covers Webilo's current scale.

```bash
npm install @sentry/react
```

```js
// src/index.js — initialise before rendering
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // Only send errors in production
  enabled: process.env.NODE_ENV === 'production',
  // Don't send noise
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Network Error',
    'ChunkLoadError',
  ],
  // Attach user context once they log in
  beforeSend(event) {
    return event;
  },
});
```

Add `REACT_APP_SENTRY_DSN` to `.env.local` and `.env.local.example`.

### Attach user identity to error reports

```js
// src/context/AuthContext.jsx — after sign-in
import * as Sentry from '@sentry/react';

function onSignIn(user) {
  Sentry.setUser({
    id: user.uid,
    email: user.email,
  });
}

function onSignOut() {
  Sentry.setUser(null);
}
```

### Shared error reporter

Every `catch` block calls this. Never call `Sentry.captureException`
directly in feature code — go through this function so we can swap
providers later.

```js
// src/utils/crashReporter.js
import * as Sentry from '@sentry/react';

/**
 * Report an error to Sentry.
 * @param {Error} error - The caught error
 * @param {string} context - Where it came from, e.g. 'useOrders', 'saveOrder'
 * @param {object} extras - Any extra data helpful for debugging
 */
export function reportError(error, context, extras = {}) {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error, extras);
    return;
  }

  Sentry.withScope(scope => {
    scope.setTag('context', context);
    scope.setExtras(extras);
    Sentry.captureException(error);
  });
}
```

### Cloud Function error reporting

Functions write structured error logs that appear in Google Cloud Logging
and can be routed to alerts.

```js
// functions/index.js — at the top of every function handler
const { logger } = require('firebase-functions');

try {
  // ...
} catch (err) {
  logger.error('followUpScheduler failed', {
    error: err.message,
    stack: err.stack,
    context: { ... },
  });
  throw err; // re-throw so Firebase marks the function as failed
}
```

### What to monitor

Set up alerts in Sentry for:
- Any new error type (first seen)
- Error rate spike (>10 errors/hour)
- Auth failures spike

Set up alerts in Firebase Console → Functions for:
- `followUpScheduler` error rate
- `api` function 5xx rate
- Cold start latency > 5s

---

## 9. UI and design rules

**Full decisions are in `docs/WEBILO_UI_DECISIONS.md`. This is the summary.**

- Use `wb-*` classes from `lib/styles/webilo.css` for all UI.
  No new one-off colour values. No inline colour hex codes.
  Use `var(--wb-*)` tokens if you need something the classes don't cover.

- Switch for live settings. Checkbox for form selections.
  Radio for one-of-N options. Never a dropdown for fewer than 5 choices.

- One `wb-btn-primary` per screen maximum.
  Every button must give immediate visual feedback on click.

- Every list, table, and card section must have a defined empty state.

- Validate forms on blur, not on keystroke.
  Error messages say what to do, not what went wrong.

- Currency: `formatZAR(amount)` — always. Never format inline.

- Mobile first. The sidebar collapses on screens under 640px.
  Touch targets minimum 44×44px.

- No AI-generated UI aesthetic: no gradients, no glassmorphism,
  no purple/indigo palette, no glows. Refer to the design tokens.

---

## 10. State management

Webilo uses React's built-in state tools. We do not use Redux or Zustand.

| Data type | Where it lives |
|---|---|
| User auth state | `AuthContext` (already built) |
| Real-time Firestore data | Custom hooks (`useOrders`, `useContacts`, etc.) |
| Local UI state (modal open, loading flag) | `useState` inside the component |
| Form state | `useState` or `useReducer` inside the form component |
| App-wide UI (toast notifications) | `ToastContext` |

### Toast context

```jsx
// src/context/ToastContext.jsx
const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  function showToast(message, variant = 'neutral', duration = 3000) {
    const id = crypto.randomUUID();
    setToasts(t => [...t, { id, message, variant }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
```

```jsx
// Usage in any component
const { showToast } = useToast();

async function handleSave() {
  try {
    await save();
    showToast('Changes saved', 'success');
  } catch (err) {
    reportError(err, 'handleSave');
    showToast('Could not save. Try again.', 'danger');
  }
}
```

---

## 11. Testing

### What to test

| Layer | What to test |
|---|---|
| `utils/` | All formatter and validator functions — these are pure and easy |
| `controllers/` | Mock Firestore, test data shaping logic |
| Critical flows | Auth sign-in, order creation, payment init |
| Components | Smoke test: renders without crashing |

### What not to test (at this stage)

Don't write tests for UI appearance or animation. Don't test Firebase SDK
internals. Don't test third-party library behaviour.

### Running tests

```bash
npm test                          # watch mode
npm test -- --watchAll=false      # single run (CI)
npm test -- --coverage            # coverage report
```

### Test file convention

Tests live next to the file they test:

```
src/utils/formatters.js
src/utils/formatters.test.js
```

```js
// src/utils/formatters.test.js
import { formatZAR, toE164, formatPhone } from './formatters';

describe('formatZAR', () => {
  it('formats whole amounts without decimals', () => {
    expect(formatZAR(8460)).toBe('R 8,460');
  });
  it('handles null gracefully', () => {
    expect(formatZAR(null)).toBe('—');
  });
});

describe('toE164', () => {
  it('converts 071 number to +27', () => {
    expect(toE164('0712345678')).toBe('+27712345678');
  });
  it('handles spaced format', () => {
    expect(toE164('071 234 5678')).toBe('+27712345678');
  });
});
```

---

## 12. Deployment

### Frontend (Firebase Hosting)

```bash
# Build
npm run build

# Deploy hosting only
firebase deploy --only hosting

# Deploy everything
npm run deploy
```

### Cloud Functions

```bash
# Deploy functions only
firebase deploy --only functions

# Deploy a single function
firebase deploy --only functions:api
firebase deploy --only functions:followUpScheduler
```

### Pre-deployment checklist

Run through this before every production deploy:

```
[ ] npm test -- --watchAll=false passes
[ ] npm run build completes without errors
[ ] No console.log statements left in production paths
[ ] No hardcoded test data or placeholder values
[ ] .env.local has not been committed (git status clean)
[ ] Firestore security rules are deployed (firebase deploy --only firestore:rules)
[ ] Storage security rules are deployed (firebase deploy --only storage)
[ ] The change has been tested against the emulators
[ ] Any new secrets have been set via firebase functions:secrets:set
```

### Environment matrix

| Environment | Firebase project | URL |
|---|---|---|
| Local dev | emulator | `localhost:3000` |
| Production | `webilo-prod` | `webilo.co.za` |

There is no staging environment yet. Test against emulators before
pushing to production.

---

## 13. Current priorities

Work in this order. Don't start a new item until the previous one is done
and tested.

### P0 — Must do before sharing with real users

- [ ] **Move all API calls behind Cloud Functions.**
      Anthropic (replacing OpenAI), Pexels if needed.
      The API key exposure is a security incident waiting to happen.

- [ ] **Tighten Firestore security rules.**
      Current rules may be too permissive. Every collection must require
      `request.auth.uid == businessId`. Test with the emulator's
      Rules Playground.

- [ ] **Set up Sentry.**
      You will not know about errors until users tell you — and they won't.

### P1 — Apply the design system

- [ ] Replace all existing inline styles and ad-hoc CSS with `wb-*` classes.
- [ ] Replace all custom button and input implementations with the library versions.
- [ ] Implement the decision rules: switches where there are checkboxes,
      correct badge colours for order statuses, empty states on all lists.
- [ ] Verify the app on a real Android phone (Chrome, mobile network, not WiFi).

### P2 — Wire up the six pillars with real data

The dashboard mockup shows all six pillars. Connect each to Firestore:

- [ ] Commerce: products, orders, bookings all reading/writing live data
- [ ] Customers: contact list, purchase history, message thread
- [ ] Operations: inventory counts, delivery tracking
- [ ] Marketing: SMS and email campaign creation, send via Twilio
- [ ] Analytics: sales charts reading from real order data
- [ ] Automation: Anthropic-powered content and reply suggestions

### P3 — Onboarding and launch

- [ ] Sign-up → business type selection → AI-assisted setup → live in under 5 minutes
- [ ] Custom subdomain: `businessname.webilo.co.za`
- [ ] Pricing page and plan enforcement
- [ ] First 10 real businesses onboarded (validation before scale)

---

## Appendix: useful commands

```bash
# Start everything locally
firebase emulators:start &
npm start

# Run only specific emulators
firebase emulators:start --only auth,firestore,functions

# Deploy Firestore rules only
firebase deploy --only firestore:rules

# Deploy Storage rules only
firebase deploy --only storage

# View Cloud Function logs
firebase functions:log

# Check current Firebase project
firebase projects:list

# Rotate a secret
firebase functions:secrets:set ANTHROPIC_API_KEY

# Clear emulator data and start fresh
firebase emulators:start --import=./emulator-data --export-on-exit
```

---

## 14. Current repository state

This section records what is implemented now. It takes precedence over
target-state examples elsewhere in this document when deciding which commands
can be run or which modules can be imported.

### Runtime and framework

| Area | Current implementation |
|---|---|
| Frontend | React 19 and Create React App (`react-scripts` 5) |
| Routing | React Router 7 |
| Data and auth | Firebase Web SDK 12 |
| Backend | Firebase Cloud Functions using CommonJS |
| Function runtime | Node.js 24 |
| HTTP API | Express 5 with CORS |
| Hosting | Firebase Hosting serving `build/` |
| Tests | Jest and React Testing Library through Create React App |
| Styling | Feature CSS plus opt-in styles under `lib/styles/` |

The root package currently has `start`, `build`, `preview`, `test`, `eject`,
and `deploy` scripts. There is **no `npm run lint` script**. Create React App runs
ESLint during start and build; do not add a lint command to CI until a real
script and configuration are committed.

### Firebase configuration

The current Firebase alias points to `smart-shop-bb140`, not the example
`webilo-prod` project. Confirm the active target before deploying:

```bash
firebase use
firebase projects:list
```

`firebase.json` configures Auth on 9099, Firestore on 8080, Functions on 5001,
Hosting on 5003, and Storage on 9199. The frontend connects to these emulators
when `REACT_APP_USE_FIREBASE_EMULATORS=true`. Firestore emulation requires a
compatible Java runtime.

`firestore.rules` and `storage.rules` are committed and referenced by
`firebase.json`. Rule changes must be tested in the emulator before deployment.

### Environment and external services

The repository ignores populated environment files and includes sanitized
`.env.local.example` and `functions/.env.example` templates. Never commit real
values.

OpenAI, Paystack, Twilio SMS/WhatsApp, and SendGrid email are behind
authenticated Firebase HTTP endpoints and provider registries. Pexels and map
services remain frontend integrations.

Anthropic and Sentry are proposals in this document, not installed
dependencies. Their examples will not build until an approved change adds the
packages, configuration, secrets, and tests.

Do not reintroduce browser-side AI keys. Privileged AI calls belong behind the
authenticated Cloud Function.

### Current layout and Git workflow

The current source layout is:

```text
src/
  Billing/
  components/
  context/
  controllers/
  hooks/
  linkyloop/
  services/
functions/
lib/styles/
```

The aspirational feature tree in section 2 does not exist yet. Do not create a
parallel hierarchy during unrelated work; migrate incrementally.

The repository is currently checked out on `master`, the remote contains both
`main` and `master`, and there is no `dev` branch. The branch model in section
3 is proposed policy. Confirm the intended base branch before changing the
workflow.

---

## 15. Rules for changing the current codebase

### Preserve behavior while modernizing

Make improvements incrementally:

1. Add or update a test around the behavior being changed.
2. Move one responsibility at a time.
3. Keep public routes and stored Firestore shapes backward-compatible.
4. Run the production build.
5. Verify the changed flow manually.

Do not combine a broad folder restructure, styling migration, data migration,
and feature change in one pull request.

### Respect existing boundaries

- `components/` renders UI and owns local interaction state.
- `controllers/` coordinates business and Firestore operations.
- `services/` owns shared clients and external-service access.
- `context/` owns application-wide React state.
- `functions/` owns secrets and privileged server-side operations.

Frontend code must not import `firebase-admin`, `firebase-functions`, Twilio,
or payment secrets. Server-only packages belong in `functions/`.

### Protect stored data and APIs

Before changing a Firestore collection or document shape:

1. Search every reader and writer.
2. Document the old and new shape.
3. Plan compatibility or migration for existing documents.
4. Update and test security rules and indexes once those files exist.
5. Verify with representative legacy data.

Never assume an empty database.

For backend endpoints, validate all input, check authorization independently
of the UI, keep response shapes stable, and never log tokens, payment data, or
unnecessary personal information. Replace hardcoded deployed URLs with
configuration rather than adding more environment-specific URLs.

### Adopt the style library safely

`lib/styles/webilo-tokens.css` must load before `lib/styles/webilo.css`. The
library is opt-in and is not imported by the application automatically.

Migrate one feature at a time. Remove replaced CSS only after visual checks in
light mode, dark mode, keyboard navigation, and a viewport below 640px. Do not
mix old theme variables with `--wb-*` variables inside a shared primitive
unless the compatibility mapping is documented.

### Manage dependencies deliberately

Before adding a package:

- Confirm the existing platform does not already provide the capability.
- Check browser or Node.js 24 compatibility.
- Add it to the correct frontend or Functions package.
- Commit the matching lockfile.
- Document bundle, runtime, security, and maintenance impact.

Do not put server-only dependencies in the root frontend package.

---

## 16. Definition of done

A change is complete only when all applicable items are true:

### Correctness

- Requested behavior works on the intended route.
- Loading, empty, success, and failure states are handled.
- Async operations cannot fail silently.
- Firestore and browser listeners are cleaned up.
- Existing stored data remains readable or has an explicit migration.

### Security and UI quality

- No new secret or privileged API key enters frontend code.
- Input is validated and authorization is checked at the server boundary.
- Logs exclude secrets, payment data, and unnecessary personal information.
- Controls follow `WEBILO_UI_DECISIONS.md`.
- Labels, keyboard behavior, focus, and error associations work.
- Mobile and supported theme states have been checked.

### Verification

Run checks that actually exist:

```bash
npm test -- --watchAll=false
npm run build
git diff --check
```

For Functions changes, also run the relevant emulator or function-shell
workflow. Record warnings separately from failures; do not claim a clean build
when warnings remain.

### Documentation

- Setup changes are reflected in the README.
- Environment variable names are documented without values.
- New secrets include their Firebase setup command.
- API and Firestore shape changes are documented.
- Target-state proposals are labeled and not presented as implemented.

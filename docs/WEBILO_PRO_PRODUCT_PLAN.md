# Webilo Pro product plan

## Document status

This document defines the target product and technical direction for Webilo Pro.
The entitlement and usage foundation is implemented; the operational Pro
capabilities described later in this document remain phased targets.

Webilo Core is the currently implemented business-first foundation. Pro extends
that foundation without removing existing Core capabilities or turning Webilo
back into a website-first product.

### Implemented Pro foundation

- Core and Pro plan catalogue with explicit entitlements and fair-use limits
- Authenticated `PlanProvider` with live plan and usage state
- `/pro` comparison and upgrade view
- `/usage` monthly usage view
- Reusable feature gates, plan badges, usage meters, and contextual Pro prompts
- Backend AI request, token, Whisper, and messaging meters
- Server-side fair-use enforcement
- Firestore rules that prevent clients from granting themselves Pro
- Paystack-priced Pro checkout with idempotent 30-day activation after verification
- Core analytics plus a Pro-gated advanced insight panel

This foundation does not imply that every target capability in the matrix is
already implemented.

## Product decision

Webilo is a business operating platform with a connected website. The website
is one customer-facing channel inside the business workspace, alongside
customers, products, services, orders, bookings, messaging, marketing, and
analytics.

Pro must therefore help an owner:

1. understand what needs attention;
2. complete business work faster;
3. collect and convert customer demand;
4. automate repeatable operations; and
5. make better decisions from business data.

Adding more templates alone is not a Pro product.

## Core baseline

The following capabilities are part of the current Core baseline:

- authenticated, persistent user sessions;
- creation and switching of businesses;
- AI-assisted business-profile setup;
- products, services, customers, orders, bookings, messages, and campaigns;
- a connected website builder and published website;
- public product and service discovery;
- public contact, order, and booking requests;
- owner-side order and booking status processing;
- server-side OpenAI generation and Whisper transcription;
- Firebase persistence, storage, hosting, and security rules;
- Twilio SMS integration; and
- basic business analytics.

These features must not be retroactively removed from existing users when Pro
is introduced. If future commercial limits are required, existing accounts
must be migrated deliberately and communicated clearly.

## Pro value proposition

Webilo Pro is the command centre for running and growing a customer-facing
business.

The strongest first Pro release combines:

- paid checkout;
- advanced bookings;
- customer automation;
- operational analytics; and
- a business-aware copilot.

Each Pro capability must either save measurable time, reduce missed work, or
help the business earn revenue.

## Capability model

| Area | Core baseline | Pro target |
| --- | --- | --- |
| Business workspace | Profile, modules, products, services | Locations, operating settings, team roles, audit history |
| Website | Generated site, editing, publishing, enquiries | Custom domains, advanced SEO, site insights, branding controls |
| Commerce | Product display and order requests | Cart, checkout, Paystack payments, inventory, fulfilment, invoices |
| Bookings | Service display and booking requests | Availability, staff calendars, deposits, reminders, rescheduling |
| Customers | Contact records and website leads | CRM timeline, tags, segments, notes, retention insights |
| Messaging | Manual SMS | Automated transactional SMS/email and later WhatsApp |
| Marketing | Saved campaign records | Scheduling, segmentation, templates, delivery and results |
| AI | Assisted setup, content, image extraction, voice input | Persistent copilot, recommendations, summaries, approved actions |
| Analytics | Operational totals | Revenue, conversion, retention, source and performance reporting |
| Team | Owner account | Staff invitations, roles, permissions, assignments |

## Pro information architecture

The Pro workspace should use a compact, task-oriented navigation:

```text
Today
Customers
Sell
Bookings
Marketing
Website
Analytics
Automations
Settings
```

Products, orders, inventory, payments, delivery, and invoices belong under
`Sell`. This prevents the navigation from becoming a flat list of every data
type.

The same capabilities must be available on desktop and mobile. Mobile can
change presentation and navigation density, but it must not become a reduced
product mode.

## Experience 1: Today

`Today` is the default Pro command centre. It should answer four questions:

- What needs attention now?
- Which orders and bookings need action?
- How is the business performing?
- What is the most useful next action?

The page should contain:

- a compact revenue and activity summary;
- pending-order and booking queues;
- failed payment or delivery alerts;
- low-stock and schedule warnings;
- recent customer activity; and
- one prioritised Webilo recommendation.

Avoid repeating explanations across headings, cards, alerts, and helper text.
Every visible card should provide information or a working action.

## Experience 2: commerce

### Customer experience

The Pro public website should support:

- a multi-product cart;
- quantity and variant selection;
- delivery or collection;
- contact and delivery details;
- Paystack payment;
- a clear order reference;
- confirmation by email or SMS; and
- a customer order-status page.

### Owner experience

Owners should be able to:

- view paid and unpaid orders;
- move orders through `new`, `confirmed`, `preparing`, `ready`, `completed`,
  `cancelled`, and `refunded`;
- inspect customer, item, delivery, and payment information;
- update inventory;
- send status notifications;
- issue invoices or receipts; and
- process cancellations and supported refunds.

Product prices and final totals must be calculated on the server. The browser
must never be trusted as the source of payment amounts.

## Experience 3: advanced bookings

Pro bookings should add:

- opening hours and availability rules;
- service duration and buffers;
- staff or resource assignment;
- deposits or full payment;
- customer confirmation;
- automated reminders;
- customer rescheduling and cancellation;
- day, week, and staff calendar views; and
- no-show tracking.

Availability must be checked transactionally when a booking is confirmed to
prevent double booking.

## Experience 4: customer operations

The Pro CRM should provide a single customer timeline containing:

- enquiries;
- orders;
- bookings;
- payments;
- messages;
- notes;
- tags;
- campaign activity; and
- consent or opt-out history.

Segments should support practical filters such as:

- new leads;
- repeat customers;
- customers without an order in a defined period;
- high-value customers;
- upcoming bookings; and
- customers who opted into marketing.

Transactional messages and marketing consent must be treated separately.

## Experience 5: Webilo Copilot

The Pro copilot should understand the active business and its permitted data.
Example requests include:

- "Summarise this week's orders."
- "Which bookings still need confirmation?"
- "Create a campaign for customers who have not ordered in 60 days."
- "Turn this menu photograph into draft products."
- "Suggest which service needs promotion."

### Action safety

AI-generated work follows a preview-and-approve model:

```text
User request
  -> retrieve permitted business context
  -> generate a structured proposal
  -> show affected records and expected outcome
  -> user approves
  -> server executes
  -> write audit event
```

The copilot may read data within the user's permissions. It must not send a
message, publish content, charge a customer, delete data, or change multiple
records without explicit approval.

AI responses that trigger actions must use validated structured output rather
than parsing free-form prose.

## Experience 6: automations

The first release should use tested automation templates:

| Trigger | Conditions | Actions |
| --- | --- | --- |
| New enquiry | Source is website | Create/update customer, notify owner |
| New paid order | Payment verified | Confirm order, notify customer |
| Booking approaching | Configured reminder window | Send reminder |
| Order completed | Customer has not been asked recently | Request a review |
| Customer inactive | No activity for configured period | Suggest a campaign |
| Inventory low | Quantity reaches threshold | Notify owner |

A visual automation builder can follow after template execution, retry,
observability, and consent handling are reliable.

## Subscription and entitlement foundation

Pro UI must never be protected only by hidden buttons. Entitlements must be
enforced by the backend.

Required concepts:

```text
plans
subscriptions
entitlements
usageMeters
billingEvents
```

An entitlement answers whether an account may use a capability. A usage meter
tracks consumption such as:

- AI generations and transcriptions;
- SMS/email sends;
- automation executions;
- storage;
- staff seats; and
- connected domains.

Suggested entitlement identifiers:

```text
commerce.checkout
commerce.inventory
bookings.advanced
crm.segments
marketing.scheduling
automation.templates
analytics.advanced
team.members
website.customDomain
website.removeBranding
ai.copilot
```

Pricing and exact limits remain product decisions. They must be configured,
not hardcoded throughout React components.

## Target technical architecture

```text
React application
  -> Firebase Authentication
  -> authenticated API boundary
      -> entitlement checks
      -> command validation
      -> provider adapters
      -> Firestore transactions
      -> audit events
  -> Firestore read models
  -> Firebase Storage

External events
  -> Paystack webhooks
  -> messaging delivery webhooks
  -> scheduled jobs
  -> event handlers and automation queue
```

### Required backend capabilities

- verified Paystack subscription and payment webhooks;
- idempotency keys for payments, orders, messages, and automation jobs;
- a job queue with retry and dead-letter handling;
- scheduled automation evaluation;
- rate limits and abuse controls;
- central entitlement checks;
- event and audit logging;
- transactional order and booking commands;
- provider delivery-status reconciliation; and
- monitoring for failed jobs and webhooks.

Provider-specific logic must remain behind payment, AI, and messaging adapters.

## Proposed data additions

The exact schema should be validated during implementation. The target model
includes:

```text
accounts/{accountId}
  subscriptions/{subscriptionId}
  usageMeters/{meterId}
  members/{userId}
  auditEvents/{eventId}

businesses/{businessId}
  locations/{locationId}
  staff/{staffId}
  inventory/{inventoryId}
  orders/{orderId}
  payments/{paymentId}
  invoices/{invoiceId}
  bookings/{bookingId}
  customers/{customerId}
  customerEvents/{eventId}
  segments/{segmentId}
  automations/{automationId}
  automationRuns/{runId}
  notifications/{notificationId}
```

Existing Core collections should be migrated incrementally. A Pro launch must
not require destructive conversion of all existing businesses.

## Delivery sequence

### Phase 0: product and measurement decisions

- Confirm pricing, trial, limits, and grandfathering.
- Define conversion, retention, revenue, and cost metrics.
- Define marketing-consent and data-retention requirements.
- Create representative South African business fixtures.

### Phase 1: Pro foundation

- Accounts, subscriptions, and entitlements
- Paystack subscription webhooks
- Usage metering
- Upgrade, billing, downgrade, and cancellation UX
- Audit events and operational monitoring

### Phase 2: revenue operations

- Cart and server-priced checkout
- Payment verification and reconciliation
- Inventory
- Fulfilment states
- Receipts/invoices
- Advanced availability and booking deposits

### Phase 3: customer operations

- CRM timeline
- Tags and segments
- Staff accounts and roles
- Transactional notifications
- Reminder and review-request templates

### Phase 4: copilot and automation

- Business-aware retrieval
- Structured proposals
- Preview and approval
- Automation templates
- Job execution, retry, and history

### Phase 5: growth

- Custom domains
- Advanced SEO
- Marketing scheduling and delivery reporting
- Conversion and retention analytics
- Branding controls

Each phase requires tests, instrumentation, migration handling, mobile parity,
and production rollback procedures before release.

## Success measures

Track product outcomes rather than feature usage alone:

- time from signup to completed business profile;
- time to first published website;
- time to first customer enquiry, order, or booking;
- percentage of requests processed within one business day;
- payment completion rate;
- booking confirmation and no-show rates;
- repeat-customer rate;
- automation success and failure rates;
- owner time saved; and
- AI and messaging cost per active Pro business.

## Explicit non-goals for the first Pro release

- unrestricted autonomous AI actions;
- unlimited AI or messaging without metering;
- a fully general workflow builder;
- enterprise accounting;
- marketplace or multi-vendor commerce;
- replacing a dedicated point-of-sale system; and
- building advanced features that exist only on desktop.

## Open product decisions

These decisions must be resolved or validated before public Pro launch:

- validate the current R299 per 30-day introductory price and define annual pricing;
- free trial or no trial;
- Core and Pro usage limits;
- staff-seat limits;
- whether existing users are grandfathered;
- supported refund flows;
- delivery integrations;
- custom-domain support model;
- WhatsApp launch timing; and
- which marketing channels require separate consent.

## Pro release definition of done

Pro is ready when:

- subscription state and entitlements are enforced server-side;
- a customer can pay for an order and receive confirmation;
- an owner can fulfil the order from mobile or desktop;
- a customer can book an available time without double booking;
- reminders and transactional notifications are observable and retryable;
- the copilot can propose useful actions without executing them silently;
- usage and provider costs are measurable;
- failures have clear recovery paths;
- existing Core businesses continue to function; and
- the same essential workflows work on desktop and mobile.

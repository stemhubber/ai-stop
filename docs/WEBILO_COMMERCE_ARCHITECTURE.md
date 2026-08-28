# Webilo Offer and Commerce Architecture

## Product principle

Webilo sells through offers rather than treating every customer action as an unrelated form submission. An offer can be a product, service, package, bundle, tier, deposit, booking, or quote-based engagement.

The Core plan uses the same transaction foundation as Pro. Core creates lightweight requests; Pro can extend them with carts, checkout, Paystack payments, inventory, fulfilment, invoices, tracking, automation, and ratings.

## Implemented foundation

### Canonical offers

New offers are stored at:

```text
businesses/{businessId}/offers/{offerId}
```

An offer records its type, pricing mode, price in minor currency units, fulfilment methods, images, status, and service duration where relevant.

The public catalogue uses a compatibility adapter:

1. Read active canonical offers.
2. Read active records from the existing `products` and `services` collections.
3. Present all three sources through one public offer interface.
4. Suppress a legacy record when a canonical offer declares it through `legacyRef`.

Existing products and services are therefore not renamed or deleted during rollout.

### Versioned order requests

Public requests are submitted to:

```text
POST /public/businesses/:slug/requests
```

The browser submits customer details, an offer reference, quantity, fulfilment method, preferred booking time, and notes. It never submits an authoritative price or total.

The backend:

1. Resolves the active business from its public slug.
2. Applies a request rate limit and honeypot check.
3. Reloads the selected offer from Firestore.
4. Calculates the order from stored pricing.
5. Writes a customer, order, initial order event, and optional booking projection in one batch.
6. Returns a customer-safe reference such as `WEB-12AB34CD`.

Version 2 orders include:

```text
schemaVersion
businessId
customerId
publicReference
orderType
items[]
pricingSnapshot
fulfilment
payment
status
source
createdAt
updatedAt
```

Each item contains an immutable offer and price snapshot. Editing the original offer does not rewrite historical transactions.

### Lifecycle

Core order status progresses through:

```text
requested → confirmed → processing → ready → completed
                                   ↘ ready → out_for_delivery → completed
          ↘ cancelled (from any open status)
```

`ready` (prepared, awaiting handoff) and `out_for_delivery` (delivery orders only)
were added for the food-ordering vertical; they are optional stages — a business
may still go `processing → completed` directly. Older `pending` orders remain
accepted by the dashboard and security rules. Payment and fulfilment states
remain separate from order state.

Booking requests create a linked booking projection. Firestore triggers synchronize status changes between the order and booking without creating separate business transactions.

### Security boundary

- Public clients may read active offers.
- Public clients cannot create customers, orders, or bookings directly in Firestore.
- The Admin SDK creates public requests after server-side validation.
- Version 2 order status changes are constrained by Firestore rules.
- Authoritative pricing comes from Firestore, not the request payload.

## Compatibility and rollout

The migration is additive:

- Existing `products`, `services`, `orders`, and `bookings` remain readable.
- Legacy products and services appear in the public offer catalogue.
- Legacy orders retain their current fields and actions.
- New orders declare `schemaVersion: 2`.
- The owner can create canonical offers without first migrating old catalogue records.

A future backfill should be idempotent. It should create canonical offers with a `legacyRef`, verify the result, and leave the source record intact until rollback is no longer required.

## Pro extensions

### Pro Phase 1: implemented

Pro businesses can enable the Payments module and expose a multi-item cart on both `/b/:slug` business pages and generated `/w/:slug` websites.

```text
POST /public/businesses/:slug/checkout-sessions
GET  /public/businesses/:slug/checkout-sessions/:sessionId
POST /payments/paystack/webhook
```

The backend checks the owner’s active Pro entitlement, enabled Payments module, and server-validated Paystack subaccount connection. It reloads every offer, calculates the complete pricing snapshot, creates an idempotent checkout session, and initializes Paystack in ZAR minor units. Only fixed-price, positive-value offers with a shared fulfilment method can enter paid checkout.

Each business must connect a Paystack subaccount before checkout can be enabled. The subaccount must belong to the configured Paystack integration, be active, and settle in ZAR. Transactions are initialized with that subaccount and `bearer: subaccount`, preventing customer revenue from silently settling only to Webilo’s platform account. Webilo stores the subaccount code and public business name, never bank-account credentials.

Paystack callbacks do not mark orders paid. The signed `charge.success` webhook validates the HMAC SHA512 signature, reference, amount, currency, business, session, and order before atomically setting the checkout session and order to paid. Duplicate webhook events are ignored through `paymentWebhookEvents`.

The callback page reads a token-protected, customer-safe session status. It never receives payment credentials or authoritative mutation permissions.

Configure this Paystack webhook URL:

```text
https://us-central1-smart-shop-bb140.cloudfunctions.net/api/payments/paystack/webhook
```

### Remaining commerce phases

The next phases should extend the current records rather than introduce a second order system:

1. Stock reservations and inventory movements.
2. Delivery addresses, zones, fees, and fulfilment workflows.
3. Invoices, receipts, refunds, and customer tracking links.
4. Fulfilment-gated service ratings.

AI token allowances apply to AI generation only. Normal orders, payment updates, and fulfilment actions use separate plan entitlements and fair-usage controls.

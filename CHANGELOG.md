# Changelog

All notable changes to this repository are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project does not yet follow strict semantic versioning — entries are
grouped by date instead of a release number.

## [Unreleased]

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
  HMAC scheme directly rather than adding the `svix` package. **Requires the
  new `firestore.indexes.json` index to actually be deployed**
  (`firebase deploy --only firestore:indexes`) before this works in
  production — the emulator doesn't enforce missing indexes the way
  production Firestore does.
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
  No `type`/`status` filtering yet (see "Not yet included").

### Not yet included

- Self-serve project/API-key management (currently manual, via the
  provisioning script).
- `type`/`status` filtering on `GET /v1/messages` — needs a composite
  Firestore index per filter field, deferred until one is actually
  declared and deployed rather than shipped unverified.
- A `functions/.secret.local` file must exist locally (gitignored, not
  committed) with placeholder provider secrets before running the Functions
  emulator, so local/emulator runs never fetch real Resend/Twilio credentials
  from Secret Manager.

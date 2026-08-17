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

### Not yet included

- Self-serve project/API-key management (currently manual, via the
  provisioning script).
- `GET /v1/messages/:id` and message history.
- Delivery-status webhooks from Resend/Twilio.
- `/v1/whatsapp`.
- A `functions/.secret.local` file must exist locally (gitignored, not
  committed) with placeholder provider secrets before running the Functions
  emulator, so local/emulator runs never fetch real Resend/Twilio credentials
  from Secret Manager.

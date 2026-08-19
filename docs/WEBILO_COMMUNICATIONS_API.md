# Webilo Communications API

A REST API for sending email, SMS, and WhatsApp through Webilo's own messaging
infrastructure (Resend + Twilio) via an API key — for other apps to call, starting
with Study Acumen. It does not require a Firebase account or ID token; it's
authenticated entirely by API key.

This document is the integration reference for a *calling* application. For how
the API itself is implemented, see `functions/developerApi/` and `CLAUDE.md`.

## Base URL

```
https://us-central1-smart-shop-bb140.cloudfunctions.net/api
```

Every path below is relative to this base — e.g. `POST /v1/email` means
`POST https://us-central1-smart-shop-bb140.cloudfunctions.net/api/v1/email`.

## Getting an API key

1. Sign in to Webilo and open **Webilo APIs** in the dashboard sidebar
   (`/webilo-apis`), or go there directly.
2. Create a project (e.g. "Study Acumen") if one doesn't exist yet.
3. Under that project, create an API key. Choose **Development** while
   integrating, **Production** when you're ready to send real messages.
4. Copy the key immediately — it's shown exactly once. If you lose it, revoke it
   from the same screen and create a new one.

Two key environments exist and are otherwise identical in behavior — they just
carry separate rate limits and separate `projects/{id}/messages` history, so test
traffic never counts against or mixes into production numbers:

| Environment | Prefix     | Rate limit    |
| ----------- | ---------- | ------------- |
| Development | `wa_test_` | 10 requests/minute |
| Production  | `wa_live_` | 100 requests/minute |

## Authentication

Send the raw key on every request as `x-api-key`. Do **not** use
`Authorization: Bearer` — that header is reserved on this API for a completely
different auth scheme (Firebase user sessions), and will not work here.

```http
x-api-key: wa_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

The key must never be sent from a browser or embedded in client-side code — call
this API from Study Acumen's own backend only.

| Status | Code | Meaning |
| --- | --- | --- |
| 401 | `API_KEY_MISSING` | No `x-api-key` header was sent. |
| 401 | `API_KEY_INVALID` | The key doesn't exist or has been revoked. |
| 401 | `PROJECT_INACTIVE` | The key is valid but its project has been deactivated. |

## Rate limits

Enforced per project **and** environment (a project's test and live keys never
share one limit) on a rolling 1-minute window. Exceeding it returns:

```json
HTTP 429
{ "error": "Too many requests. Wait a minute and try again.", "code": "RATE_LIMITED" }
```

Back off and retry after a few seconds rather than immediately re-sending.

## Idempotency

Any `POST` (`/v1/email`, `/v1/sms`, `/v1/whatsapp`) accepts an optional
`Idempotency-Key` header. Use one whenever a request might be retried — a
network timeout, a redeploy, a job re-running — so a message is never sent
twice for the same logical event:

```http
Idempotency-Key: assessment-result-<learnerId>-<assessmentId>
```

Behavior:
- First request with a given key: sends normally.
- A repeated request with the **same** key: returns the original response again
  (same `id`, same status code family) — the message is **not** sent a second
  time.
- A repeated request while the first one is still in flight: `409` with
  `IDEMPOTENCY_KEY_IN_PROGRESS`. Retry after a short delay.
- If the first attempt failed, the key is released — a retry with the same key
  sends normally rather than replaying the failure.

Pick a key that's unique per logical send and stable across retries (e.g.
`<event-type>-<learner-id>-<assessment-id>`, not a random UUID generated fresh
on every retry — that would defeat the point).

Idempotency records are retained 24 hours; don't rely on retry-safety for keys
reused after that window.

## Endpoints

### `POST /v1/email`

```http
POST /v1/email
x-api-key: wa_live_...
Content-Type: application/json

{
  "to": "learner@example.com",
  "subject": "Your assessment result",
  "text": "Your result is ready — log in to view it.",
  "html": "<p>Your result is ready — <a href=\"...\">log in to view it</a>.</p>"
}
```

- `to` — required, must be a syntactically valid email address.
- `subject` — optional.
- At least one of `text` or `html` is required; both may be sent together.

Success:

```json
HTTP 202
{ "id": "8f3c2a1e...", "status": "accepted" }
```

(`200` instead of `202` on an idempotency replay — see above.)

Errors specific to this endpoint:

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_RECIPIENT` | `to` isn't a valid email address. |
| 400 | `MISSING_CONTENT` | Neither `text` nor `html` was provided. |
| 503 | `RESEND_MISSING_KEY` / `RESEND_MISSING_FROM` | Email isn't configured on Webilo's side yet — contact Webilo, not a bug in your request. |
| 503 | `RESEND_SENDER_REJECTED` / `RESEND_INVALID_KEY` | Provider-side configuration problem. |
| 429 | `RESEND_RATE_LIMIT` | Resend itself is rate-limiting Webilo — back off and retry. |

### `POST /v1/sms`

```http
POST /v1/sms
x-api-key: wa_live_...
Content-Type: application/json

{
  "to": "+27821234567",
  "text": "Your assessment result is ready."
}
```

- `to` — required, E.164 format (`+` followed by country code and number, no
  spaces/dashes). A South African local-format number like `082...` will be
  **rejected**, not auto-corrected — normalize to `+27...` before calling.
- `text` — required, plain text, 1600 characters max.

Success shape is identical to `/v1/email`. Recipient validation happens before
any provider call, so an invalid number never reaches Twilio or counts as a
send.

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_RECIPIENT` | `to` isn't valid E.164, or `text` is missing/too long. |
| 400 | `MISSING_CONTENT` | `text` was empty. |
| 403 | `21608` | Twilio trial account restriction — the destination number isn't verified. |
| 400 | `21610` | Recipient has opted out of SMS. |
| 400 | `21614` | Recipient number can't receive SMS. |
| 503 | `TWILIO_INVALID_SID` / `TWILIO_MISSING_TOKEN` | Twilio isn't configured on Webilo's side — contact Webilo. |

### `POST /v1/whatsapp`

Identical request/response shape to `/v1/sms` (same `to`/`text` fields, same
E.164 requirement), just delivered over WhatsApp. Text limit is 4096
characters instead of 1600. Same error table as `/v1/sms` applies.

```http
POST /v1/whatsapp
x-api-key: wa_live_...
Content-Type: application/json

{ "to": "+27821234567", "text": "Your assessment result is ready." }
```

### `GET /v1/messages/:id`

Look up a single message by the `id` returned from a send. Scoped to your own
project — an id from a different project's key returns `404`, not another
project's data.

```http
GET /v1/messages/8f3c2a1e...
x-api-key: wa_live_...
```

```json
HTTP 200
{
  "id": "8f3c2a1e...",
  "type": "email",
  "destination": "learner@example.com",
  "provider": "resend",
  "status": "delivered",
  "providerMessageId": "re_abc123",
  "createdAt": "2026-08-18T09:12:03.000Z",
  "completedAt": "2026-08-18T09:12:05.000Z"
}
```

`status` starts as `"accepted"` at send time and updates asynchronously as
Resend/Twilio report delivery: `sent` → `delivered`, or `failed` / `bounced`.
There's no push notification for this yet (see "Delivery status" below) — poll
this endpoint if you need to know the outcome of a specific send.

`404` with `{ "error": "Message not found.", "code": "MESSAGE_NOT_FOUND" }` if
the id doesn't exist or belongs to another project.

### `GET /v1/messages`

Lists your project's messages, newest first, cursor-paginated.

```http
GET /v1/messages?limit=20
x-api-key: wa_live_...
```

```json
HTTP 200
{
  "data": [
    { "id": "...", "type": "email", "status": "delivered", "...": "..." },
    { "id": "...", "type": "sms", "status": "accepted", "...": "..." }
  ],
  "nextCursor": "abc123"
}
```

Query parameters:

| Param | Required | Notes |
| --- | --- | --- |
| `limit` | no | Default 20, max 100. |
| `cursor` | no | Pass the previous response's `nextCursor` to get the next page. It's just the last message's own `id` — nothing to construct or parse. |
| `type` | no | One of `email`, `sms`, `whatsapp`. Cannot be combined with `status`. |
| `status` | no | One of `accepted`, `sent`, `delivered`, `failed`, `bounced`. Cannot be combined with `type`. |

`nextCursor` is `null` on the last page. A page shorter than `limit` is also
your signal that there's nothing more — don't assume `nextCursor: null` only
happens on an exactly-empty page.

Passing both `type` and `status` together returns `400 INVALID_FILTER`.

### `GET /v1/usage`

Your project's usage for a billing period (calendar month, UTC).

```http
GET /v1/usage
x-api-key: wa_live_...
```

```json
HTTP 200
{ "period": "2026-08", "requests": 142, "emails": 80, "sms": 50, "whatsapp": 12 }
```

- Defaults to the current month. Pass `?period=2026-07` (format `YYYY-MM`) for a
  past period — a period with no activity returns all zeros, not `404`.
- `requests` counts every `/v1` call, successful or not; `emails`/`sms`/`whatsapp`
  count only successful sends on that channel.
- This is informational only — nothing here is billed automatically today.

## Delivery status

There is currently no webhook Study Acumen can register to be pushed delivery
updates. If you need to know whether a specific send actually reached the
recipient (not just that Webilo accepted the request), poll
`GET /v1/messages/:id` a short time after sending. For most integrations,
treating `202`/`200` from the send call as "queued for delivery" is enough —
only poll if your flow specifically needs confirmed delivery (e.g. before
telling a learner "check your email").

## Error response shape

Every error follows the same envelope:

```json
{ "error": "Human-readable message", "code": "MACHINE_READABLE_CODE" }
```

`code` is stable and safe to branch on in code; `error` is for logs/humans and
its exact wording may change. A `5xx` response means something is wrong on
Webilo's side (provider outage, misconfiguration) — safe to retry with backoff.
A `4xx` response means the request itself needs to change before retrying.

## Worked example: assessment result email

```bash
curl -X POST https://us-central1-smart-shop-bb140.cloudfunctions.net/api/v1/email \
  -H "x-api-key: $WEBILO_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: assessment-result-$LEARNER_ID-$ASSESSMENT_ID" \
  -d '{
    "to": "learner@example.com",
    "subject": "Your assessment result is ready",
    "text": "Hi! Your result for '"$ASSESSMENT_NAME"' is ready. Log in to Study Acumen to view it.",
    "html": "<p>Hi! Your result for <strong>'"$ASSESSMENT_NAME"'</strong> is ready. <a href=\"https://studyacumen.example/results/'"$ASSESSMENT_ID"'\">Log in to view it</a>.</p>"
  }'
```

```json
{ "id": "8f3c2a1e5b7d...", "status": "accepted" }
```

Store the returned `id` alongside the assessment record if you might want to
check delivery status or look the send up later.

## Not available yet

- No `/v1/projects` or key-management endpoints callable from Study Acumen's
  backend — key issuance is manual, through the Webilo dashboard (see "Getting
  an API key" above).
- No delivery-status webhooks — see "Delivery status" above.
- No filtering `GET /v1/messages` by both `type` and `status` at once.
- No official client SDK — these are plain HTTP/JSON calls, callable from any
  language with an HTTP client.

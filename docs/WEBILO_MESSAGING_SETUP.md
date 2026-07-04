# Webilo SMS, email, and WhatsApp setup

## Rotate exposed credentials

A Twilio Auth Token was included in a screenshot shared during development. Revoke that token in Twilio and create a replacement before deploying messaging.

Never add Twilio credentials to `.env`, frontend code, screenshots, source control, or chat. Configure them through Firebase Secret Manager's interactive prompt.

## Firebase secrets

Run each command from the project directory:

```bash
firebase functions:secrets:set TWILIO_SID
firebase functions:secrets:set TWILIO_TOKEN
firebase functions:secrets:set TWILIO_API_KEY
firebase functions:secrets:set TWILIO_API_SECRET
firebase functions:secrets:set TWILIO_FROM
firebase functions:secrets:set TWILIO_WHATSAPP_FROM
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set EMAIL_FROM
```

Values:

- `TWILIO_SID`: Twilio Account SID.
- `TWILIO_TOKEN`: newly rotated Twilio Auth Token when using Account SID authentication.
- `TWILIO_API_KEY`: Twilio API key SID beginning with `SK` when using API-key authentication.
- `TWILIO_API_SECRET`: secret belonging to `TWILIO_API_KEY`.
- `TWILIO_FROM`: SMS-capable Twilio sender in E.164 format, such as `+15551234567`.
- `TWILIO_WHATSAPP_FROM`: WhatsApp-enabled sender in E.164 format without the `whatsapp:` prefix.
- `RESEND_API_KEY`: Resend API key beginning with `re_`.
- `EMAIL_FROM`: verified sender in `Name <email@domain>` format, for example `Webilo <messages@updates.webilo.co.za>`.

## Resend email

The Resend onboarding sender (`onboarding@resend.dev`) is suitable only for initial account testing. Before emailing customers:

1. Add a sending domain or subdomain in Resend.
2. Add the SPF and DKIM records shown by Resend to the domain DNS.
3. Wait for the domain to show as verified.
4. Set `EMAIL_FROM` to an address on that verified domain.

The API key is stored only in Firebase Secret Manager. The browser sends email through the authenticated Webilo API and never receives the key.

## WhatsApp testing

For development, activate the Twilio WhatsApp Sandbox and set:

```text
TWILIO_WHATSAPP_FROM=+14155238886
```

Each test recipient must join the account's Sandbox using the join phrase shown in the Twilio Console. The Sandbox is for testing only.

For production, register or connect a WhatsApp Business sender in Twilio and replace the Sandbox number with that approved sender.

## Deploy

The combined API Function requires the OpenAI, Twilio, and Resend secrets:

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set EMAIL_FROM
firebase deploy --only functions:api
```

## Product behavior

- Business tools expose SMS and email. WhatsApp remains hidden until a sender is configured.
- SMS uses Twilio and email uses Resend through the same authenticated messaging endpoint.
- Resend email attempts consume the existing monthly message allowance.
- Recipients are normalized to E.164 South African numbers.
- Production uses Twilio API-key authentication with a separate `AC` Account SID, `SK` API key, and API secret. Account SID/Auth Token authentication remains supported as a fallback.
- Sender and recipient formats are validated before calling Twilio.
- WhatsApp channel addresses receive the required `whatsapp:` prefix server-side.
- The browser receives only the Twilio message SID and initial delivery status.
- Trial accounts may send only to eligible or verified recipients and remain subject to Twilio trial restrictions.

## Phase 1 transactional notifications

The following Resend emails are event-driven:

- Welcome email when a Webilo user document is created.
- New website order notification to the business owner.
- Order receipt confirmation to the customer.
- Order confirmed, completed, or cancelled updates to the customer.
- New website booking notification to the business owner.
- Booking request receipt to the customer.
- Booking confirmed, completed, or cancelled updates to the customer.

Only records with `source: "website"` create automatic order and booking emails. Manually captured records do not email customers automatically.

Every automatic email uses a deterministic `emailEvents` document ID. If Firestore delivers the same event more than once, the duplicate is skipped. Business notification activity is also written to the business `messages` collection so the owner can see the result.

Welcome and operational order/booking notifications are platform emails and do not consume the business's direct-message allowance. Direct emails sent manually from Messages continue to consume that allowance.

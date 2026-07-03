# Webilo SMS and WhatsApp setup

## Rotate exposed credentials

A Twilio Auth Token was included in a screenshot shared during development. Revoke that token in Twilio and create a replacement before deploying messaging.

Never add Twilio credentials to `.env`, frontend code, screenshots, source control, or chat. Configure them through Firebase Secret Manager's interactive prompt.

## Firebase secrets

Run each command from the project directory:

```bash
firebase functions:secrets:set TWILIO_SID
firebase functions:secrets:set TWILIO_TOKEN
firebase functions:secrets:set TWILIO_FROM
firebase functions:secrets:set TWILIO_WHATSAPP_FROM
```

Values:

- `TWILIO_SID`: Twilio Account SID.
- `TWILIO_TOKEN`: newly rotated Twilio Auth Token.
- `TWILIO_FROM`: SMS-capable Twilio sender in E.164 format, such as `+15551234567`.
- `TWILIO_WHATSAPP_FROM`: WhatsApp-enabled sender in E.164 format without the `whatsapp:` prefix.

## WhatsApp testing

For development, activate the Twilio WhatsApp Sandbox and set:

```text
TWILIO_WHATSAPP_FROM=+14155238886
```

Each test recipient must join the account's Sandbox using the join phrase shown in the Twilio Console. The Sandbox is for testing only.

For production, register or connect a WhatsApp Business sender in Twilio and replace the Sandbox number with that approved sender.

## Deploy

The combined API Function requires the OpenAI and Twilio secrets:

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase deploy --only functions:api
```

## Product behavior

- Business tools currently expose SMS only. WhatsApp is intentionally hidden until a sender is configured.
- Recipients are normalized to E.164 South African numbers.
- Sender and recipient formats are validated before calling Twilio.
- WhatsApp channel addresses receive the required `whatsapp:` prefix server-side.
- The browser receives only the Twilio message SID and initial delivery status.
- Trial accounts may send only to eligible or verified recipients and remain subject to Twilio trial restrictions.

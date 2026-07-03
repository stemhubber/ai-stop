# Webilo AI integration

## Security boundary

All OpenAI requests run inside the authenticated Firebase `api` Cloud Function. The browser sends a Firebase ID token and never receives the OpenAI API key.

Do not add `REACT_APP_OPENAI_API_KEY` or any other OpenAI credential to frontend environment files. Values prefixed with `REACT_APP_` are compiled into the public JavaScript bundle.

Configure the Firebase secret interactively:

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

Then deploy the API function:

```bash
firebase deploy --only functions:api
```

## Local and deployed API URLs

The frontend chooses its API endpoint from Firebase configuration:

- `REACT_APP_USE_FIREBASE_EMULATORS=true` uses `http://127.0.0.1:5001/{projectId}/us-central1/api`.
- Otherwise it uses `https://us-central1-{projectId}.cloudfunctions.net/api`.
- `REACT_APP_API_BASE_URL` is an optional explicit override.

Running only `npm start` does not start Cloud Functions. For a fully local stack, also run:

```bash
firebase emulators:start
```

Because a key was previously pasted into a conversation, revoke it in the OpenAI dashboard and configure a replacement before production deployment.

## Implemented AI paths

### Website generation

`POST /ai/website-draft`

- Accepts the approved guided website brief.
- Generates a schema-constrained theme, SEO metadata, pages, sections, and conversion-focused content.
- Converts the response into Webilo's canonical editable website model.
- Fails visibly with a retry state; it does not pretend a deterministic template was AI-generated.

### Menu, poster, and catalogue import

`POST /ai/extract-business-image`

- Accepts authenticated PNG, JPEG, or WebP data under 5 MB.
- Extracts products or services, visible prices, descriptions, categories, and confidence.
- Treats text inside images as untrusted content rather than instructions.
- Requires user review and selection before creating Firestore records.

### Voice transcription

`POST /ai/transcribe`

- Replaces the old browser-side OpenAI request.
- Accepts short authenticated audio recordings.
- Returns text to the legacy voice prompt control without exposing credentials.

## Operational protections

- Firebase authentication is required for every AI endpoint.
- Requests are limited to eight AI operations per user per minute.
- JSON and media payload sizes are bounded.
- AI responses use strict JSON schemas.
- Uploaded image content is never applied automatically.
- Errors returned to the browser do not include provider credentials or raw server internals.

## Model configuration

Structured website and visual extraction requests default to `gpt-5.4-mini`. Voice input uses `gpt-4o-mini-transcribe`.

The model default is isolated in `functions/providers/ai/openai.js`, so it can be changed without touching frontend product code.

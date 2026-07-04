# Ask Webilo business advisor

## Implemented scope

Ask Webilo is a business-aware assistant inside the Today workspace. It is deliberately a command layer over existing business tools, not a collection of separate mini-apps.

- Streams concise answers from the backend.
- Uses the active business profile, products, services, and aggregate customer activity.
- Keeps the last six conversation messages as short-term context.
- Records completed and failed conversations under the active business.
- Shows recent advisor and asset activity.
- Creates a printable A4 product/service list without using AI.
- Creates a downloadable QR code locally without using AI.
- Uses AI for promotion copy and guarded stock guidance.

Stock forecasting is not presented as available until stock quantities and sales history exist. Current product records do not collect sufficient inventory data.

## Usage and fair use

Advisor requests use the existing plan system:

- Core: 30 AI actions and 150,000 combined input/output tokens per month.
- Pro: 500 AI actions and 2,000,000 combined input/output tokens per 30-day access period.
- One advisor question reserves one AI action.
- Actual streamed input and output tokens are recorded after completion.
- The existing per-minute AI rate limit applies.
- Product-list printing and local QR generation do not consume AI usage.

When AI capacity is exhausted, business management, customer records, orders, bookings, printing, and QR generation remain available.

## Safety boundary

The advisor provides general business education, not definitive legal, tax, labour, funding, regulatory, or accounting advice. It must identify uncertainty and direct the owner to the relevant official South African authority or a qualified professional when current rules matter.

The initial version is advisory only. It does not modify records, publish websites, message customers, or perform other external actions.

## API

- `POST /ai/advisor` — authenticated server-sent event stream.
- `GET /advisor/activity?businessId=...` — recent activity for an owned business.
- `POST /advisor/activity` — records supported local asset creation.

Streaming events are `ready`, `delta`, `done`, and `error`.

import { apiBaseUrl } from "./apiConfig";

export async function submitPublicBusinessRequest({
  slug,
  requestType,
  customer,
  selection,
  fulfilmentMethod,
  requestedStartTime,
  notes,
  company = "",
}) {
  const response = await fetch(
    `${apiBaseUrl}/public/businesses/${encodeURIComponent(slug)}/requests`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType,
        customer,
        selection,
        fulfilmentMethod,
        requestedStartTime,
        notes,
        company,
      }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Could not submit this request.");
  }
  return data;
}

export async function startCommerceCheckout({
  slug,
  customer,
  selections,
  fulfilmentMethod,
  notes,
  idempotencyKey,
  clientSecret,
  returnOrigin,
  company = "",
}) {
  const response = await fetch(
    `${apiBaseUrl}/public/businesses/${encodeURIComponent(slug)}/checkout-sessions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer,
        selections,
        fulfilmentMethod,
        notes,
        idempotencyKey,
        clientSecret,
        returnOrigin,
        company,
      }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not start checkout.");
  return data;
}

export async function getCommerceCheckoutStatus({ slug, sessionId, token }) {
  const response = await fetch(
    `${apiBaseUrl}/public/businesses/${encodeURIComponent(slug)}/checkout-sessions/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(token)}`
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not check payment status.");
  return data;
}

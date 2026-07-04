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

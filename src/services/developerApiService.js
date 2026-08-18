import { auth } from "./firebase.config";
import { apiBaseUrl } from "./apiConfig";

async function authedFetch(path, options = {}) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in to manage Webilo API access.");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export function listDeveloperProjects() {
  return authedFetch("/developer/projects");
}

export function createDeveloperProject(name) {
  return authedFetch("/developer/projects", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function listApiKeys(projectId) {
  return authedFetch(`/developer/projects/${encodeURIComponent(projectId)}/api-keys`);
}

export function createApiKey(projectId, { name, environment }) {
  return authedFetch(`/developer/projects/${encodeURIComponent(projectId)}/api-keys`, {
    method: "POST",
    body: JSON.stringify({ name, environment }),
  });
}

export function revokeApiKey(projectId, keyId) {
  return authedFetch(
    `/developer/projects/${encodeURIComponent(projectId)}/api-keys/${encodeURIComponent(keyId)}`,
    { method: "DELETE" }
  );
}

export function getProjectUsage(projectId, period) {
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  return authedFetch(`/developer/projects/${encodeURIComponent(projectId)}/usage${query}`);
}

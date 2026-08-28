function withoutTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

export function resolveApiBaseUrl({
  configured,
  useEmulators,
  projectId,
}) {
  if (configured) return withoutTrailingSlash(configured);

  if (useEmulators) {
    return `http://127.0.0.1:5001/${projectId}/us-central1/api`;
  }

  return `https://us-central1-${projectId}.cloudfunctions.net/api`;
}

export function getApiBaseUrl() {
  return resolveApiBaseUrl({
    configured: process.env.REACT_APP_API_BASE_URL?.trim(),
    useEmulators:
      process.env.NODE_ENV !== "production" &&
      process.env.REACT_APP_USE_FIREBASE_EMULATORS === "true",
    projectId:
      process.env.REACT_APP_FIREBASE_PROJECT_ID || "smart-shop-bb140",
  });
}

export const apiBaseUrl = getApiBaseUrl();

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api/v1";
const apiOrigin = apiBaseUrl.replace(/\/api\/v\d+\/?$/, "");

export function resolveAssetUrl(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/uploads/")) {
    return `${apiOrigin}${trimmed}`;
  }

  if (trimmed.startsWith("/api/")) {
    return `${apiOrigin}${trimmed}`;
  }

  if (/^https?:\/\/localhost(?::\d+)?\/uploads\//i.test(trimmed)) {
    const uploadPath = trimmed.replace(/^https?:\/\/localhost(?::\d+)?/i, "");
    return `${apiOrigin}${uploadPath}`;
  }

  if (/^https?:\/\/localhost(?::\d+)?\/api\//i.test(trimmed)) {
    const apiPath = trimmed.replace(/^https?:\/\/localhost(?::\d+)?/i, "");
    return `${apiOrigin}${apiPath}`;
  }

  return trimmed;
}

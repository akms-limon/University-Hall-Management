import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api/v1";
const authEventName = "uhas:auth-expired";

export const httpClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

function shouldIgnoreAuthExpiredBroadcast(error) {
  const requestUrl = String(error?.config?.url || "");
  const status = Number(error?.response?.status || 0);

  if (import.meta.env.MODE === "test") return true;
  if (status !== 401) return true;
  if (requestUrl.includes("/auth/login")) return true;
  if (requestUrl.includes("/auth/register")) return true;
  if (requestUrl.includes("/auth/logout")) return true;
  return false;
}

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!shouldIgnoreAuthExpiredBroadcast(error) && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(authEventName));
    }

    return Promise.reject(error);
  }
);

export { authEventName };

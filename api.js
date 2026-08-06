/* eVentory — shared API client.
 *
 * Auth routes (login / register / forgot-password / reset-password) are sent
 * without a token. Every other request gets:
 *   Authorization: Bearer <token from localStorage>
 */

(function () {
  "use strict";

  const API_BASE_URL = "https://backend-group-3.onrender.com/api";

  const PUBLIC_AUTH_PATHS = [
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
  ];

  function isPublicAuthPath(path) {
    const normalized = String(path || "").split("?")[0];
    if (PUBLIC_AUTH_PATHS.includes(normalized)) return true;
    return normalized.startsWith("/auth/reset-password/");
  }

  function getToken() {
    try {
      return localStorage.getItem("token");
    } catch (err) {
      return null;
    }
  }

  function clearSession() {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("store");
    } catch (err) {
      /* ignore */
    }
  }

  function buildHeaders(path, extra) {
    const headers = {
      "Content-Type": "application/json",
      ...(extra || {}),
    };

    if (!isPublicAuthPath(path)) {
      const token = getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * @param {string} path - API path starting with `/`, e.g. `/products`
   * @param {RequestInit & { auth?: boolean }} [options]
   *   Set options.auth = false to force skipping the Bearer token.
   */
  async function apiFetch(path, options) {
    const opts = options || {};
    const { auth, headers: extraHeaders, ...rest } = opts;
    const skipAuth = auth === false || isPublicAuthPath(path);

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: skipAuth
        ? { "Content-Type": "application/json", ...(extraHeaders || {}) }
        : buildHeaders(path, extraHeaders),
    });

    if (response.status === 401 && !skipAuth) {
      clearSession();
      window.location.href = "loginPage.html";
      throw new Error("Session expired. Please log in again.");
    }

    return response;
  }

  async function apiJson(path, options) {
    const response = await apiFetch(path, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        data.message || data.error || `Request failed (${response.status})`
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  window.EvApi = {
    baseUrl: API_BASE_URL,
    getToken,
    clearSession,
    isPublicAuthPath,
    fetch: apiFetch,
    json: apiJson,
  };
})();

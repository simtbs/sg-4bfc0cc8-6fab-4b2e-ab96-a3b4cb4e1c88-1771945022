// src/services/api.js

const AUTH_BASE_URL  = import.meta.env.VITE_XANO_AUTH_BASE_URL;   // https://.../api:AUTH
const APP_BASE_URL   = import.meta.env.VITE_XANO_APP_BASE_URL;    // https://.../api:APP
const ADMIN_BASE_URL = import.meta.env.VITE_XANO_ADMIN_BASE_URL;  // https://.../api:ADMIN

const TOKEN_KEY = "authToken";
const USER_KEY  = "authUser";

// ---------------- TOKEN ----------------
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}
export function setToken(token) {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------- USER ----------------
export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
export function setUser(user) {
  if (!user) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearUser() {
  localStorage.removeItem(USER_KEY);
}

// ---------------- URL HELPERS ----------------
function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
}

function buildUrl(path) {
  if (!path) throw new Error("Path mancante");
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  let p = String(path).replace(/^\/+/, "");

  // AUTH group: "auth/..."
  if (p.startsWith("auth/")) {
    if (!AUTH_BASE_URL) throw new Error("VITE_XANO_AUTH_BASE_URL mancante");
    return joinUrl(AUTH_BASE_URL, p);
  }

  // ADMIN group: "admin/..."
  if (p.startsWith("admin/")) {
    if (!ADMIN_BASE_URL) throw new Error("VITE_XANO_ADMIN_BASE_URL mancante");
    // in Xano group "admin" gli endpoint sono "/technicians", "/import_work_logs", ecc.
    p = p.replace(/^admin\/+/, "");
    return joinUrl(ADMIN_BASE_URL, p);
  }

  // APP group
  if (!APP_BASE_URL) throw new Error("VITE_XANO_APP_BASE_URL mancante");
  return joinUrl(APP_BASE_URL, p);
}

// ---------------- FETCH ----------------
export async function apiFetch(path, options = {}) {
  const url = buildUrl(path);
  const token = getToken();

  const method = String(options.method || "GET").toUpperCase();
  const hasBody = options.body !== undefined && options.body !== null;

  const headers = {
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let body;
  if (hasBody) {
    // ✅ fondamentale: Xano deve ricevere JSON vero
    body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

  if (!res.ok) {
    const msg =
      (payload && typeof payload === "object" && (payload.message || payload.error)) ||
      (typeof payload === "string" ? payload : "") ||
      `Errore API (${res.status})`;

    // log utile in console
    console.error("API ERROR", {
      url,
      method,
      status: res.status,
      payload,
      payload_str: typeof payload === "object" ? JSON.stringify(payload, null, 2) : String(payload),
    });

    throw new Error(msg);
  }

  return payload;
}
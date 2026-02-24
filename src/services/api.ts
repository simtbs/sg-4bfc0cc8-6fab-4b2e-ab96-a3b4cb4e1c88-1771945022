// src/services/api.ts

const AUTH_BASE_URL  = process.env.NEXT_PUBLIC_XANO_AUTH_BASE_URL || "";   
const APP_BASE_URL   = process.env.NEXT_PUBLIC_XANO_APP_BASE_URL || "";    
const ADMIN_BASE_URL = process.env.NEXT_PUBLIC_XANO_ADMIN_BASE_URL || "";  

const TOKEN_KEY = "authToken";
const USER_KEY  = "authUser";

// ---------------- TOKEN ----------------
export function getToken(): string {
  if (typeof window === 'undefined') return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}
export function setToken(token: string) {
  if (typeof window === 'undefined' || !token) return;
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------- USER ----------------
export function getUser(): any {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
export function setUser(user: any) {
  if (typeof window === 'undefined' || !user) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearUser() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
}

// ---------------- URL HELPERS ----------------
function joinUrl(base: string, path: string) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
}

function buildUrl(path: string) {
  if (!path) throw new Error("Path mancante");
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  let p = String(path).replace(/^\/+/, "");

  // AUTH group: "auth/..."
  if (p.startsWith("auth/")) {
    // Fallback if env vars are missing, though they should be present
    if (!AUTH_BASE_URL) console.warn("NEXT_PUBLIC_XANO_AUTH_BASE_URL mancante");
    return joinUrl(AUTH_BASE_URL, p);
  }

  // ADMIN group: "admin/..."
  if (p.startsWith("admin/")) {
    if (!ADMIN_BASE_URL) console.warn("NEXT_PUBLIC_XANO_ADMIN_BASE_URL mancante");
    p = p.replace(/^admin\/+/, "");
    return joinUrl(ADMIN_BASE_URL, p);
  }

  // APP group
  if (!APP_BASE_URL) console.warn("NEXT_PUBLIC_XANO_APP_BASE_URL mancante");
  return joinUrl(APP_BASE_URL, p);
}

// ---------------- FETCH ----------------
interface ApiOptions extends RequestInit {
  body?: any;
}

export async function apiFetch(path: string, options: ApiOptions = {}) {
  const url = buildUrl(path);
  const token = getToken();

  const method = String(options.method || "GET").toUpperCase();
  const hasBody = options.body !== undefined && options.body !== null;

  const headers: HeadersInit = {
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  let body: BodyInit | null = null;
  if (hasBody) {
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

    console.error("API ERROR", {
      url,
      method,
      status: res.status,
      payload,
    });

    throw new Error(msg);
  }

  return payload;
}
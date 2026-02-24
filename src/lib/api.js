// src/lib/api.js
export const getToken = () => localStorage.getItem("token");

export const setToken = (t) => localStorage.setItem("token", t);
export const clearToken = () => localStorage.removeItem("token");

export const setUser = (u) => localStorage.setItem("user", JSON.stringify(u));
export const getUser = () => {
  const raw = localStorage.getItem("user");
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
};
export const clearUser = () => localStorage.removeItem("user");

export const xanoBase = () => {
  const base = import.meta.env.VITE_XANO_BASE_URL;
  if (!base) throw new Error("VITE_XANO_BASE_URL mancante nel .env");
  return base.endsWith("/") ? base : base; // in Xano di solito NON serve lo slash finale
};

export async function apiFetch(path, { method = "GET", body, headers } = {}) {
  const token = getToken();

  const res = await fetch(`${xanoBase()}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  // leggi sempre testo per debug, poi prova json
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = data?.message || data?.error || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}
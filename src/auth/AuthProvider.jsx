// src/auth/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  apiFetch,
  clearToken,
  clearUser,
  getToken,
  getUser,
  setToken,
  setUser, // storage setter
} from "@/services/api";

// ✅ default NON NULL: evita crash per destructuring anche se Provider manca
const DEFAULT_AUTH = {
  user: null,
  booting: true,
  isAuthed: false,
  login: async () => {
    throw new Error("AuthProvider mancante: login() non disponibile");
  },
  logout: () => {},
};

const AuthCtx = createContext(DEFAULT_AUTH);

function extractToken(res) {
  const tokenRaw = res?.authToken ?? res?.token;

  if (typeof tokenRaw === "string") return tokenRaw;

  if (tokenRaw && typeof tokenRaw === "object") {
    if (typeof tokenRaw.authToken === "string") return tokenRaw.authToken;
    if (typeof tokenRaw.token === "string") return tokenRaw.token;
  }

  if (typeof res?.authToken === "string") return res.authToken;
  if (typeof res?.token === "string") return res.token;

  return "";
}

function isAuthError(err) {
  const msg = String(err?.message || "").toLowerCase();

  // ⚠️ NON mettere msg.includes("token") generico: ti sloga su errori che non c’entrano
  return (
    msg.includes("401") ||
    msg.includes("unauthorized") ||
    msg.includes("access denied") ||
    msg.includes("accessdenied") ||
    msg.includes("invalid credentials") ||
    msg.includes("invalid token") ||
    msg.includes("token belongs")
  );
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => getUser());
  const [booting, setBooting] = useState(true);

  // BOOT: se ho token, provo /auth/me
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const token = getToken();

        // ✅ se non ho token: fine boot
        if (!token) {
          if (alive) {
            setUserState(null);
            setBooting(false);
          }
          return;
        }

        const me = await apiFetch("auth/me", { method: "GET" });
        if (!alive) return;

        setUser(me);        // salva su localStorage
        setUserState(me);   // salva in state
      } catch (e) {
        if (alive && isAuthError(e)) {
          clearToken();
          clearUser();
          setUserState(null);
        }
      } finally {
        if (alive) setBooting(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const login = async ({ email, password }) => {
    const res = await apiFetch("auth/login", {
      method: "POST",
      body: { email, password },
    });

    const token = extractToken(res);
    if (!token) throw new Error("Risposta login senza token valido");

    setToken(token);

    // se backend ritorna user lo salvo subito (opzionale)
    if (res?.user && typeof res.user === "object") {
      setUser(res.user);
      setUserState(res.user);
    } else {
      clearUser();
      setUserState(null);
    }

    // poi prendo SEMPRE /me per avere user coerente
    const me = await apiFetch("auth/me", { method: "GET" });
    setUser(me);
    setUserState(me);

    return true;
  };

  const logout = () => {
    clearToken();
    clearUser();
    setUserState(null);
  };

  const value = useMemo(
    () => ({
      user,
      booting,
      login,
      logout,
      isAuthed: !!user,
    }),
    [user, booting]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// ✅ guard: se qualcuno usa useAuth fuori provider te lo dice chiarissimo
export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) {
    throw new Error("useAuth() usato fuori da <AuthProvider>. Controlla App.jsx e gli import.");
  }
  return ctx;
};
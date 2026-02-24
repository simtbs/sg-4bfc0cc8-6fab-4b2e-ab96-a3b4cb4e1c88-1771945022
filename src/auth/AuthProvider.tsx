import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  apiFetch,
  clearToken,
  clearUser,
  getToken,
  getUser,
  setToken,
  setUser, 
} from "@/services/api";

interface User {
  id: number;
  email: string;
  role: string;
  name?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  booting: boolean;
  isAuthed: boolean;
  login: (creds: { email?: string; password?: string }) => Promise<boolean>;
  logout: () => void;
}

const DEFAULT_AUTH: AuthContextType = {
  user: null,
  booting: true,
  isAuthed: false,
  login: async () => {
    throw new Error("AuthProvider mancante: login() non disponibile");
  },
  logout: () => {},
};

const AuthCtx = createContext<AuthContextType>(DEFAULT_AUTH);

function extractToken(res: any): string {
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

function isAuthError(err: any): boolean {
  const msg = String(err?.message || "").toLowerCase();
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => getUser());
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const token = getToken();

        if (!token) {
          if (alive) {
            setUserState(null);
            setBooting(false);
          }
          return;
        }

        const me = await apiFetch("auth/me", { method: "GET" });
        if (!alive) return;

        setUser(me);       
        setUserState(me);   
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

  const login = async ({ email, password }: { email?: string; password?: string }) => {
    const res = await apiFetch("auth/login", {
      method: "POST",
      body: { email, password },
    });

    const token = extractToken(res);
    if (!token) throw new Error("Risposta login senza token valido");

    setToken(token);

    if (res?.user && typeof res.user === "object") {
      setUser(res.user);
      setUserState(res.user);
    } else {
      clearUser();
      setUserState(null);
    }

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

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) {
    throw new Error("useAuth() usato fuori da <AuthProvider>.");
  }
  return ctx;
};
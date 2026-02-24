// src/components/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Cable, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const { login, user, booting } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ✅ qui deve essere una stringa (pathname), non un oggetto location
  const from = loc.state?.from?.pathname || "/operatore";

  // ✅ se sei già loggato, non rimanere su /login (evita rimbalzi)
  if (!booting && user) return <Navigate to={from} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login({ email, password });
      nav(from, { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Login fallito");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 md:relative md:min-h-screen overflow-hidden bg-gradient-to-b from-white to-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md flex flex-col justify-center">
        <div className="bg-white border border-slate-100 rounded-3xl shadow-lg overflow-hidden">
          <div className="px-6 py-8 sm:px-10 sm:py-10 flex flex-col justify-center">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-xl bg-[#0062FF] flex items-center justify-center text-white">
                <Cable className="w-8 h-8" />
              </div>

              <div className="mt-4 text-center">
                <div className="text-2xl font-extrabold text-gray-900">TELCO.IA</div>
                <div className="text-sm text-gray-500 mt-1">Gestione cantieri TLC</div>
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div>
                <label className="text-xs text-gray-500">Email</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    className="pl-10 mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@azienda.it"
                    autoComplete="email"
                    aria-label="Email"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500">Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    className="pl-10 mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-label="Password"
                  />
                </div>
              </div>

              {err && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                  {err}
                </div>
              )}

              <button
                disabled={loading}
                className="w-full rounded-xl bg-[#0062FF] hover:bg-[#0051d6] text-white font-semibold py-3 disabled:opacity-60 shadow-md"
              >
                {loading ? "Accesso…" : "Accedi"}
              </button>
            </form>
          </div>

          <div className="px-6 py-4 bg-slate-50 text-center text-xs text-gray-500">
            <div>Hai problemi ad accedere? Contatta il supporto.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
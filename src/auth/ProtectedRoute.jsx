// src/auth/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  // ✅ evita crash se il context non è pronto o non esiste
  const ctx = (typeof useAuth === "function" ? useAuth() : null) || null;

  // se ctx è nullo, comportati come "non loggato" (meglio che crashare)
  const user = ctx?.user ?? null;
  const booting = ctx?.booting ?? false;

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Caricamento...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
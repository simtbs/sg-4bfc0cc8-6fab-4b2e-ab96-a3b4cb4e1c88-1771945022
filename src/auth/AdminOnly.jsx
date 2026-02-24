import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

export default function AdminOnly({ children }) {
  const { user, booting } = useAuth();

  if (booting) return <div className="p-6 text-slate-500">Caricamento…</div>;

  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  if (!isAdmin) return <Navigate to="/operatore" replace />;

  return children;
}
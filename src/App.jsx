// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import ProtectedRoute from "@/auth/ProtectedRoute";
import AdminOnly from "@/auth/AdminOnly";

import AppShell from "@/components/AppShell";
import LoginPage from "@/components/LoginPage";

import OperatorPage from "@/components/OperatorPage";
import WorksPage from "@/components/WorksPage";

import AdminDashboard from "@/components/AdminDashboard";
import AdminPage from "@/components/AdminPage";
import ImportWorkLogsPage from "@/components/ImportWorkLogsPage";

// ✅ questa è la pagina "solo visualizzazione lavori approvati"
import ApprovedWorksPage from "@/components/ApprovedWorksPage";

function roleOf(user) {
  return String(user?.role || "").toLowerCase();
}

// ✅ Redirect iniziale in base al ruolo
function DefaultRedirect() {
  const { user } = useAuth();
  const role = roleOf(user);

  if (role === "impresa") return <Navigate to="/admin/approved" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;

  return <Navigate to="/operatore" replace />;
}

// ✅ Gate: se sei "impresa" puoi vedere SOLO /admin/approved
function ImpresaOnly({ children }) {
  const { user } = useAuth();
  const role = roleOf(user);

  if (role !== "impresa") return <Navigate to="/" replace />;
  return children;
}

// ✅ Gate: blocca impresa (per tutte le pagine non consentite)
function BlockImpresa({ children }) {
  const { user } = useAuth();
  const role = roleOf(user);

  if (role === "impresa") return <Navigate to="/admin/approved" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            {/* Default */}
            <Route path="/" element={<DefaultRedirect />} />

            {/* ✅ Impresa: SOLO questa pagina */}
            <Route
              path="/admin/approved"
              element={
                <ImpresaOnly>
                  <ApprovedWorksPage />
                </ImpresaOnly>
              }
            />

            {/* Tutto il resto: impresa NON deve entrarci */}
            <Route
              path="/operatore"
              element={
                <BlockImpresa>
                  <OperatorPage />
                </BlockImpresa>
              }
            />
            <Route
              path="/lavori"
              element={
                <BlockImpresa>
                  <WorksPage />
                </BlockImpresa>
              }
            />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <BlockImpresa>
                  <AdminOnly>
                    <AdminDashboard />
                  </AdminOnly>
                </BlockImpresa>
              }
            />

            <Route
              path="/admin/approva"
              element={
                <BlockImpresa>
                  <AdminOnly>
                    <AdminPage />
                  </AdminOnly>
                </BlockImpresa>
              }
            />

            <Route
              path="/admin/import"
              element={
                <BlockImpresa>
                  <AdminOnly>
                    <ImportWorkLogsPage />
                  </AdminOnly>
                </BlockImpresa>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
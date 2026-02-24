// src/components/AppShell.jsx
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import TopTabs from "@/components/TopTabs";
import { useAuth } from "@/auth/AuthProvider";

export default function AppShell() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const role = String(user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isImpresa = role === "impresa";

  const [searchTerm, setSearchTerm] = React.useState("");

  // SEARCH solo per operatore (mai in admin, mai in impresa)
  const showSearch =
    !isAdmin &&
    !isImpresa &&
    (pathname.startsWith("/operatore") || pathname.startsWith("/lavori"));

  // reset quando esci dalle pagine con search
  React.useEffect(() => {
    if (!showSearch) setSearchTerm("");
  }, [showSearch]);

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-20 md:pb-0">
      <Header
        showSearch={showSearch}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* ✅ Impresa: NIENTE tabs/menu */}
      {!isImpresa && <TopTabs />}

      <div className="container mx-auto px-3 md:px-4 pb-10 max-w-7xl">
        <Outlet context={{ searchTerm }} />
      </div>
    </div>
  );
}
// src/components/TopTabs.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/auth/AuthProvider";

export default function TopTabs() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  const nav = useNavigate();
  const { pathname } = useLocation();

  const tabValue = React.useMemo(() => {
    // ADMIN tabs
    if (pathname.startsWith("/admin/import")) return "admin_import";
    if (pathname.startsWith("/admin/approva")) return "admin_approva";
    if (pathname.startsWith("/admin")) return "admin_home";

    // USER tabs
    if (pathname.startsWith("/lavori")) return "lavori";
    return "operatore";
  }, [pathname]);

  const onChange = (v) => {
    if (v === "operatore") nav("/operatore");
    if (v === "lavori") nav("/lavori");

    if (v === "admin_home") nav("/admin");            // AdminDashboard.jsx
    if (v === "admin_approva") nav("/admin/approva"); // AdminPage.jsx
    if (v === "admin_import") nav("/admin/import");   // ImportWorkLogsPage.jsx
  };

  return (
    <div className="container mx-auto px-3 md:px-4 pt-4 max-w-7xl">
      <Tabs value={tabValue} onValueChange={onChange} className="w-full">
        <TabsList
          className={[
            "grid w-full mx-auto mb-6 bg-white shadow-sm h-12 rounded-xl",
            isAdmin ? "max-w-3xl grid-cols-3" : "max-w-md grid-cols-2",
          ].join(" ")}
        >
          {!isAdmin ? (
            <>
              <TabsTrigger
                value="operatore"
                className="data-[state=active]:bg-[#0062FF] data-[state=active]:text-white transition-all h-10 rounded-lg text-sm md:text-base"
              >
                Operatore
              </TabsTrigger>

              <TabsTrigger
                value="lavori"
                className="data-[state=active]:bg-[#0062FF] data-[state=active]:text-white transition-all h-10 rounded-lg text-sm md:text-base"
              >
                Lavori
              </TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger
                value="admin_home"
                className="data-[state=active]:bg-[#0062FF] data-[state=active]:text-white transition-all h-10 rounded-lg text-sm md:text-base"
              >
                Admin
              </TabsTrigger>

              <TabsTrigger
                value="admin_approva"
                className="data-[state=active]:bg-[#0062FF] data-[state=active]:text-white transition-all h-10 rounded-lg text-sm md:text-base"
              >
                Check
              </TabsTrigger>

              <TabsTrigger
                value="admin_import"
                className="data-[state=active]:bg-[#0062FF] data-[state=active]:text-white transition-all h-10 rounded-lg text-sm md:text-base"
              >
                Carica
              </TabsTrigger>
            </>
          )}
        </TabsList>
      </Tabs>
    </div>
  );
}
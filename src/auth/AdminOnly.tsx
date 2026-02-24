import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/auth/AuthProvider";

export default function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, booting } = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!booting) {
      const role = String(user?.role || "").toLowerCase();
      if (role !== "admin") {
        router.replace("/operatore"); // Redirect non-admins
      } else {
        setIsReady(true);
      }
    }
  }, [user, booting, router]);

  if (booting || !isReady) {
    return <div className="p-6 text-slate-500">Verifica permessi...</div>;
  }

  return <>{children}</>;
}
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/auth/AuthProvider";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, booting } = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!booting) {
      if (!user) {
        router.replace("/login");
      } else {
        setIsReady(true);
      }
    }
  }, [user, booting, router]);

  if (booting || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span>Caricamento...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
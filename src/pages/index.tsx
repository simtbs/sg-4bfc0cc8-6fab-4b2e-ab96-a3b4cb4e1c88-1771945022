import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/auth/AuthProvider";

export default function Home() {
  const router = useRouter();
  const { user, booting } = useAuth();

  useEffect(() => {
    if (booting) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const role = String(user?.role || "").toLowerCase();
    
    if (role === "impresa") {
      router.replace("/admin/approved");
    } else if (role === "admin") {
      router.replace("/admin");
    } else {
      router.replace("/operatore");
    }
  }, [user, booting, router]);

  return (
    <div className="min-h-screen bg-[#F4F5FB] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0062FF]" />
        <p className="text-gray-500 text-sm animate-pulse">Caricamento...</p>
      </div>
    </div>
  );
}
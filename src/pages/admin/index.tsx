import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/auth/AuthProvider";
import AdminOnly from "@/auth/AdminOnly";
import { Card } from "@/components/ui/card";

export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <AdminOnly>
      <div className="min-h-screen bg-slate-50 p-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard Amministratore</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-2">Benvenuto, {user?.name}</h3>
            <p className="text-slate-500">Pannello di controllo generale.</p>
          </Card>
          {/* Altri widget verranno aggiunti qui */}
        </div>
      </div>
    </AdminOnly>
  );
}
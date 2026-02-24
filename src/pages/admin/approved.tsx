import { useEffect } from "react";
import AdminOnly from "@/auth/AdminOnly";
import { Card } from "@/components/ui/card";

export default function ApprovedWorksPage() {
  return (
    <AdminOnly>
      <div className="min-h-screen bg-slate-50 p-8">
        <h1 className="text-3xl font-bold mb-6">Lavori Approvati</h1>
        <Card className="p-6">
          <p className="text-slate-500">Lista dei lavori approvati e contabilizzati.</p>
        </Card>
      </div>
    </AdminOnly>
  );
}
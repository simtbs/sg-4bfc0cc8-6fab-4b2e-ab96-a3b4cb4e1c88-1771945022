// src/pages/admin/AdminPage.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";

// prende token salvato da AuthProvider/api.js (chiave: authToken)
function getToken() {
  try {
    return localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [declarations, setDeclarations] = React.useState([]);
  const [projectsById, setProjectsById] = React.useState(new Map());

  const [loading, setLoading] = React.useState(true);
  const [approvingId, setApprovingId] = React.useState(null);
  const [rejectingId, setRejectingId] = React.useState(null);
  const [expandedItems, setExpandedItems] = React.useState({});

  // ✅ base url
  const XANO_BASE_URL = import.meta.env.VITE_XANO_BASE_URL;

  const fetchDeclarations = React.useCallback(async () => {
    try {
      setLoading(true);

      const token = getToken();
      const res = await fetch(`${XANO_BASE_URL}/get_admin_logs`, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const text = await res.text();
      if (!res.ok) {
        throw new Error(
          `GET /get_admin_logs failed ${res.status}: ${text.slice(0, 160)}`
        );
      }

      const payload = text ? JSON.parse(text) : null;

      // ✅ supporta lista diretta o {logs, projects}
      const logs =
        Array.isArray(payload?.logs)
          ? payload.logs
          : Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.data)
          ? payload.data
          : [];

      const projects = Array.isArray(payload?.projects) ? payload.projects : [];

      setDeclarations(logs);

      const m = new Map();
      projects.forEach((p) => m.set(p.id, p));
      setProjectsById(m);
    } catch (error) {
      console.error(error);
      toast({
        title: "Errore caricamento",
        description: error?.message || "Impossibile caricare i dati",
        variant: "destructive",
      });
      setDeclarations([]);
      setProjectsById(new Map());
    } finally {
      setLoading(false);
    }
  }, [XANO_BASE_URL, toast]);

  React.useEffect(() => {
    fetchDeclarations();
  }, [fetchDeclarations]);

  const handleApprove = async (workLogId) => {
    try {
      setApprovingId(workLogId);

      const token = getToken();
      const res = await fetch(`${XANO_BASE_URL}/approva_lavoro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ work_log_id: Number(workLogId) }),
      });

      const text = await res.text();
      if (!res.ok) {
        throw new Error(
          `Approva fallito (${res.status}). ${text.slice(0, 160)}`
        );
      }

      toast({
        title: "Approvato",
        description: "Lavoro approvato correttamente.",
      });
      await fetchDeclarations();
    } catch (error) {
      console.error(error);
      toast({
        title: "Errore approvazione",
        description: error?.message || "Impossibile approvare il lavoro",
        variant: "destructive",
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (workLogId) => {
    try {
      setRejectingId(workLogId);

      const token = getToken();
      const res = await fetch(`${XANO_BASE_URL}/rifiuta_lavoro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ work_log_id: Number(workLogId) }),
      });

      const text = await res.text();
      if (!res.ok) {
        throw new Error(
          `Rifiuto fallito (${res.status}). ${text.slice(0, 160)}`
        );
      }

      toast({
        title: "Rifiutato",
        description: "Lavoro rifiutato correttamente.",
      });
      await fetchDeclarations();
    } catch (error) {
      console.error(error);
      toast({
        title: "Errore rifiuto",
        description: error?.message || "Impossibile rifiutare il lavoro",
        variant: "destructive",
      });
    } finally {
      setRejectingId(null);
    }
  };

  const getCantiereName = React.useCallback(
    (dec) => {
      // 1) se join già incluso (fallback)
      const fromJoin =
        dec?._projects?.name ||
        dec?._projects?.nome ||
        dec?._projects?.client_code ||
        dec?.projects?.name ||
        dec?.projects?.nome ||
        dec?.projects?.client_code;

      if (fromJoin) return fromJoin;

      // 2) mappa projectsById (✅ consigliata)
      const p = projectsById.get(dec?.projects_id);
      return (
        p?.name ||
        p?.nome ||
        p?.client_code ||
        (dec?.projects_id
          ? `Cantiere #${dec.projects_id}`
          : "Cantiere sconosciuto")
      );
    },
    [projectsById]
  );

  return (
    <div className="w-full min-h-screen bg-[#F4F5FB] flex flex-col">
      {/* Header Bar */}
      <div className="w-full bg-gradient-to-r from-[#0062FF] to-[#0052D9] text-white shadow-lg flex-shrink-0">
        <div className="w-full max-w-md md:max-w-none mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Approvazioni
              </h1>
              <p className="text-sm text-blue-100 mt-0.5">
                Lavori da approvare
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={fetchDeclarations}
                disabled={loading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${
                    loading ? "animate-spin" : ""
                  }`}
                />
                Aggiorna
              </Button>

              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <div className="text-sm font-bold">
                  {user?.name?.charAt(0) || "A"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-md md:max-w-none mx-auto flex flex-col items-center md:items-stretch px-0">
          <div className="w-full rounded-b-3xl md:rounded-none bg-white p-0 overflow-hidden relative border-x md:border-x-0 border-b md:border-b-0 border-[#E0E3F1]">
            <div className="px-6 md:px-8 pt-6 md:pt-8 pb-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">
                    Dichiarazioni in attesa di approvazione
                  </p>
                </div>
                <span className="bg-[#0062FF]/10 text-[#0062FF] px-3 py-1 rounded-full text-xs font-bold">
                  {declarations.length}
                </span>
              </div>
            </div>

            <div className="px-4 md:px-8 pb-4 md:pb-8">
              {/* Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 md:pb-0">
                {loading ? (
                  <div className="col-span-full py-10 text-center text-slate-500">
                    Caricamento...
                  </div>
                ) : declarations.length === 0 ? (
                  <div className="col-span-full py-10 text-center text-slate-500">
                    Nessuna dichiarazione da approvare
                  </div>
                ) : (
                  declarations.map((dec) => {
                    const cantiere = getCantiereName(dec);
                    const key = `card-${dec.id}`;
                    const open = !!expandedItems[key];

                    const isApproving = approvingId === dec.id;
                    const isRejecting = rejectingId === dec.id;

                    return (
                      <div
                        key={dec.id}
                        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all"
                      >
                        {/* Cantiere */}
                        <div className="mb-3">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                            Cantiere
                          </div>
                          <div className="text-sm text-slate-900 font-semibold">
                            {cantiere}
                          </div>
                        </div>

                        {/* Codice Cavo */}
                        <div className="mb-3">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                            Codice Cavo
                          </div>
                          <div className="text-lg font-extrabold text-blue-600 uppercase tracking-wide break-words">
                            {dec.cable_code || "-"}
                          </div>
                        </div>

                        {/* Stato */}
                        <div className="mb-4 inline-flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                          <Clock className="w-4 h-4 animate-pulse" />
                          <span className="text-xs font-bold">
                            In attesa approvazione
                          </span>
                        </div>

                        {/* Lavorazioni */}
                        <div className="mb-4">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedItems((p) => ({
                                ...p,
                                [key]: !p[key],
                              }))
                            }
                            className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            {open ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            {(dec.items || []).length} lavorazion
                            {(dec.items || []).length === 1 ? "e" : "i"}
                          </button>

                          {open && (
                            <div className="mt-3 space-y-2">
                              {(dec.items || []).map((item, i) => (
                                <div
                                  key={i}
                                  className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-bold text-slate-900">
                                      {item?._price_list_items?.item_code ||
                                        "Articolo"}
                                    </span>
                                    <span className="text-sm font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-md">
                                      {item?.quantity ?? item?.quantita ?? ""}
                                    </span>
                                  </div>
                                  {item?._price_list_items?.description && (
                                    <p className="text-xs text-slate-600 mt-2">
                                      {item._price_list_items.description}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bottoni Approva/Rifiuta */}
                        <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
                          <Button
                            type="button"
                            onClick={() => handleApprove(dec.id)}
                            disabled={isApproving || isRejecting}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-sm rounded-lg disabled:opacity-60"
                          >
                            {isApproving ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Approvando...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approva
                              </>
                            )}
                          </Button>

                          <Button
                            type="button"
                            onClick={() => handleReject(dec.id)}
                            disabled={isRejecting || isApproving}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-9 text-sm rounded-lg disabled:opacity-60"
                          >
                            {isRejecting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Rifiutando...
                              </>
                            ) : (
                              <>
                                <X className="w-4 h-4 mr-2" />
                                Rifiuta
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
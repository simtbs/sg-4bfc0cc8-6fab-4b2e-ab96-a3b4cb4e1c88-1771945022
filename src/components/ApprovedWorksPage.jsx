// src/pages/admin/ApprovedWorksPage.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  CameraOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Download,
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import * as XLSX from "xlsx";

// token (chiave: authToken)
function getToken() {
  try {
    return localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

// ✅ confronto DATA in LOCALE (no UTC)
function sameDayLocal(dateLike, yyyyMmDd) {
  if (!dateLike || !yyyyMmDd) return false;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return false;

  const [y, m, dd] = String(yyyyMmDd).split("-").map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === dd;
}

function sameMonthLocal(dateLike, yyyyMm) {
  if (!dateLike || !yyyyMm) return false;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return false;

  const [y, m] = String(yyyyMm).split("-").map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function todayYYYYMMDD() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function thisMonthYYYYMM() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export default function ApprovedWorksPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // ✅ RAW payload pieces (come escono da Xano)
  const [logsRaw, setLogsRaw] = React.useState([]);
  const [itemsRaw, setItemsRaw] = React.useState([]);
  const [photosRaw, setPhotosRaw] = React.useState([]);
  const [catalogRaw, setCatalogRaw] = React.useState([]);
  const [projectsById, setProjectsById] = React.useState(new Map());

  const [loading, setLoading] = React.useState(true);
  const [expandedItems, setExpandedItems] = React.useState({});

  // filtri
  const [mode, setMode] = React.useState("month"); // "day" | "month" | "all"
  const [day, setDay] = React.useState(() => todayYYYYMMDD());
  const [month, setMonth] = React.useState(() => thisMonthYYYYMM());
  const [projectId, setProjectId] = React.useState(""); // string
  const [search, setSearch] = React.useState("");

  const XANO_BASE_URL = import.meta.env.VITE_XANO_BASE_URL;

  const getCantiereName = React.useCallback(
    (row) => {
      const p = projectsById.get(row?.projects_id);
      return (
        p?.name ||
        p?.client_code ||
        (row?.projects_id ? `Cantiere #${row.projects_id}` : "Cantiere sconosciuto")
      );
    },
    [projectsById]
  );

  const fetchApproved = React.useCallback(async () => {
    try {
      setLoading(true);

      const token = getToken();
      const res = await fetch(`${XANO_BASE_URL}/get_approved_logs`, {
        method: "GET",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      const text = await res.text();
      if (!res.ok) {
        throw new Error(`GET /get_approved_logs failed ${res.status}: ${text.slice(0, 160)}`);
      }

      const payload = text ? JSON.parse(text) : null;

      const logs = Array.isArray(payload?.logs) ? payload.logs : [];
      const items = Array.isArray(payload?.items) ? payload.items : [];
      const photos = Array.isArray(payload?.photos) ? payload.photos : [];
      const catalog = Array.isArray(payload?.catalog) ? payload.catalog : [];
      const projects = Array.isArray(payload?.projects) ? payload.projects : [];

      setLogsRaw(logs);
      setItemsRaw(items);
      setPhotosRaw(photos);
      setCatalogRaw(catalog);

      const m = new Map();
      projects.forEach((p) => m.set(p.id, p));
      setProjectsById(m);
    } catch (e) {
      console.error(e);
      toast({
        title: "Errore caricamento",
        description: e?.message || "Impossibile caricare lavori approvati",
        variant: "destructive",
      });
      setLogsRaw([]);
      setItemsRaw([]);
      setPhotosRaw([]);
      setCatalogRaw([]);
      setProjectsById(new Map());
    } finally {
      setLoading(false);
    }
  }, [XANO_BASE_URL, toast]);

  React.useEffect(() => {
    fetchApproved();
  }, [fetchApproved]);

  // ---- Build lookup maps ----
  const catalogById = React.useMemo(() => {
    const m = new Map();
    (catalogRaw || []).forEach((c) => m.set(Number(c.id), c));
    return m;
  }, [catalogRaw]);

  const itemsByLogId = React.useMemo(() => {
    const m = new Map();
    (itemsRaw || []).forEach((it) => {
      const logId = Number(it.work_logs_id);
      if (!logId) return;
      const list = m.get(logId) || [];
      list.push({
        ...it,
        _price_list_items: catalogById.get(Number(it.price_list_items_id)) || null,
      });
      m.set(logId, list);
    });

    // opzionale: ordinamento per item_code
    for (const [k, list] of m.entries()) {
      list.sort((a, b) =>
        String(a?._price_list_items?.item_code || "").localeCompare(String(b?._price_list_items?.item_code || ""))
      );
      m.set(k, list);
    }

    return m;
  }, [itemsRaw, catalogById]);

  const photosByLogId = React.useMemo(() => {
    const m = new Map();
    (photosRaw || []).forEach((p) => {
      const logId = Number(p.work_logs_id);
      if (!logId) return;

      // work_log_photos output: photo.url ecc.
      const photoObj = p.photo || p; // safety
      const url = photoObj?.url;
      if (!url) return;

      const list = m.get(logId) || [];
      list.push({ ...photoObj });
      m.set(logId, list);
    });
    return m;
  }, [photosRaw]);

  // ---- Enrich logs for UI ----
  const logs = React.useMemo(() => {
    return (logsRaw || []).map((l) => ({
      ...l,
      items: itemsByLogId.get(Number(l.id)) || [],
      photos: photosByLogId.get(Number(l.id)) || [],
    }));
  }, [logsRaw, itemsByLogId, photosByLogId]);

  const cantieri = React.useMemo(() => {
    const arr = Array.from(projectsById.values() || []);
    arr.sort((a, b) =>
      String(a?.name || a?.client_code || "").localeCompare(String(b?.name || b?.client_code || ""))
    );
    return arr;
  }, [projectsById]);

  const approvedLabel = (row) => {
    if (!row?.approved_at) return "—";
    try {
      return new Date(row.approved_at).toLocaleDateString("it-IT");
    } catch {
      return row.approved_at;
    }
  };

  const filtered = React.useMemo(() => {
    const q = (search || "").trim().toLowerCase();

    return (logs || [])
      .filter((l) => {
        if (mode === "day") {
          if (!l.approved_at) return false;
          if (!day) return true;
          return sameDayLocal(l.approved_at, day);
        }
        if (mode === "month") {
          if (!l.approved_at) return false;
          if (!month) return true;
          return sameMonthLocal(l.approved_at, month);
        }
        return true;
      })
      .filter((l) => {
        if (!projectId) return true;
        return String(l.projects_id || "") === String(projectId);
      })
      .filter((l) => {
        if (!q) return true;

        const hay = [
          getCantiereName(l),
          l.cable_code,
          l.address,
          l.id,
          l.users_id,
          ...(Array.isArray(l.items) ? l.items.map((it) => it?._price_list_items?.item_code) : []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.approved_at || 0) - new Date(a.approved_at || 0));
  }, [logs, mode, day, month, projectId, search, getCantiereName]);

  const resetFilters = () => {
    setMode("month");
    setDay(todayYYYYMMDD());
    setMonth(thisMonthYYYYMM());
    setProjectId("");
    setSearch("");
  };

  const exportToExcel = () => {
    // tipi lavorazioni unici
    const allItemCodes = new Set();
    filtered.forEach((row) => {
      (row.items || []).forEach((item) => {
        const code = item?._price_list_items?.item_code || "Articolo";
        allItemCodes.add(code);
      });
    });

    const codes = Array.from(allItemCodes);
    codes.sort((a, b) => String(a).localeCompare(String(b)));

    const data = filtered.map((row) => {
      const rowData = {
        "Data Approvazione": approvedLabel(row),
        "Cantiere": getCantiereName(row),
        "Codice Cavo": row.cable_code || "-",
      };

      codes.forEach((code) => {
        const item = (row.items || []).find((i) => (i?._price_list_items?.item_code || "Articolo") === code);
        rowData[code] = item?.quantity ?? "";
      });

      rowData["Numero Foto"] = (row.photos || []).length;
      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lavori Approvati");

    // filename in locale
    const d = new Date();
    const fileName = `lavori_approvati_${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Export completato",
      description: `File ${fileName} scaricato con successo`,
    });
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F5FB] flex flex-col">
      {/* Header Bar */}
      <div className="w-full bg-gradient-to-r from-[#0062FF] to-[#0052D9] text-white shadow-lg flex-shrink-0">
        <div className="w-full max-w-md md:max-w-none mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Lavori approvati</h1>
              <p className="text-sm text-blue-100 mt-0.5">Benvenuto {user?.name || "Admin"}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <div className="text-sm font-bold">{user?.name?.charAt(0) || "A"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-md md:max-w-none mx-auto flex flex-col items-center md:items-stretch px-0">
          <div className="w-full rounded-b-3xl md:rounded-none bg-white p-0 overflow-hidden relative border-x md:border-x-0 border-b md:border-b-0 border-[#E0E3F1]">
            {/* header card */}
            <div className="px-6 md:px-8 pt-6 md:pt-8 pb-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">
                    Lavori con stato: <b>approvato</b>
                  </p>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                  <button
                    onClick={exportToExcel}
                    disabled={filtered.length === 0}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Esporta lavorazioni filtrate</span>
                    <span className="md:hidden">Esporta Excel</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Lavori filtrati:</span>
                    <span className="bg-[#0062FF]/10 text-[#0062FF] px-3 py-1 rounded-full text-xs font-bold">
                      {filtered.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* FILTRI */}
            <div className="px-4 md:px-8 pb-4 md:pb-6">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-slate-900 font-extrabold">
                    <Filter className="w-4 h-4" />
                    Filtri
                  </div>

                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" className="rounded-xl" onClick={fetchApproved} disabled={loading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                      Aggiorna
                    </Button>

                    <Button type="button" variant="outline" className="rounded-xl" onClick={resetFilters} disabled={loading}>
                      <X className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* periodo */}
                  <div className="md:col-span-1">
                    <div className="text-xs font-semibold text-slate-500">PERIODO</div>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="day">Giorno</option>
                      <option value="month">Mese</option>
                      <option value="all">Tutti</option>
                    </select>
                  </div>

                  {/* input day/month */}
                  <div className="md:col-span-1">
                    <div className="text-xs font-semibold text-slate-500">
                      {mode === "day" ? "DATA" : mode === "month" ? "MESE" : "—"}
                    </div>

                    {mode === "day" ? (
                      <input
                        type="date"
                        value={day}
                        onChange={(e) => setDay(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    ) : mode === "month" ? (
                      <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    ) : (
                      <input
                        disabled
                        value="Tutti"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 text-slate-400"
                      />
                    )}
                  </div>

                  {/* cantiere */}
                  <div className="md:col-span-1">
                    <div className="text-xs font-semibold text-slate-500">CANTIERE</div>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">Tutti i cantieri</option>
                      {cantieri.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name || p.client_code || `Cantiere #${p.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ricerca */}
                  <div className="md:col-span-1">
                    <div className="text-xs font-semibold text-slate-500">RICERCA</div>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="cavo, indirizzo, item…"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* LISTA */}
            <div className="px-4 md:px-8 pb-6 md:pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 md:pb-0">
                {loading ? (
                  <div className="col-span-full py-10 text-center text-slate-500">Caricamento...</div>
                ) : filtered.length === 0 ? (
                  <div className="col-span-full py-10 text-center text-slate-500">
                    Nessun lavoro approvato per i filtri selezionati
                  </div>
                ) : (
                  filtered.map((row) => {
                    const photos = row.photos || [];
                    const cantiere = getCantiereName(row);
                    const key = `c-${row.id}`;
                    const open = !!expandedItems[key];

                    return (
                      <div key={row.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all">
                        {/* Header con data e badge */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="text-xs text-slate-500 font-medium">{approvedLabel(row)}</div>
                          <div className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                            Approvato
                          </div>
                        </div>

                        {/* Cantiere */}
                        <div className="mb-2">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Cantiere</div>
                          <div className="text-sm text-slate-900 font-semibold">{cantiere}</div>
                        </div>

                        {/* Codice Cavo */}
                        <div className="mb-3">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Codice Cavo</div>
                          <div className="text-lg font-extrabold text-blue-600 uppercase tracking-wide">
                            {row.cable_code || "-"}
                          </div>
                        </div>

                        {/* Lavorazioni */}
                        <div className="mb-3">
                          <button
                            onClick={() => setExpandedItems((p) => ({ ...p, [key]: !p[key] }))}
                            className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {(row.items || []).length} lavorazion{(row.items || []).length === 1 ? "e" : "i"}
                          </button>

                          {open && (
                            <div className="mt-3 space-y-2">
                              {(row.items || []).map((item, i) => (
                                <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-900">
                                      {item?._price_list_items?.item_code || "Articolo"}
                                    </span>
                                    <span className="text-sm font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-md">
                                      {item?.quantity ?? ""}
                                    </span>
                                  </div>
                                  {item?._price_list_items?.description && (
                                    <p className="text-xs text-slate-600 mt-2">{item._price_list_items.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Foto */}
                        <div className="pt-3 border-t border-slate-100">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Foto</div>
                          <div className="flex -space-x-2">
                            {photos?.length ? (
                              photos.slice(0, 4).map((f, i) => (
                                <img
                                  key={i}
                                  src={f.url}
                                  className="h-10 w-10 rounded-full border-2 border-white object-cover cursor-pointer hover:scale-110 hover:z-10 transition-transform"
                                  onClick={() => window.open(f.url, "_blank")}
                                  alt="foto"
                                />
                              ))
                            ) : (
                              <div className="flex items-center text-slate-300 gap-1 text-xs italic">
                                <CameraOff className="w-4 h-4" /> Nessuna foto
                              </div>
                            )}

                            {photos?.length > 4 && (
                              <div className="h-10 w-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                +{photos.length - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            {/* /LISTA */}
          </div>
        </div>
      </div>
    </div>
  );
}
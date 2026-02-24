// src/components/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Calendar, CheckCircle, Filter, List } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/services/api";
import { useAuth } from "@/auth/AuthProvider";

const MONTHLY_HOURS = 24 * 21; // 504
const DAILY_HOURS = 24;

function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function formatEUR(v) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(toNumber(v));
}

function formatQty(v) {
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(toNumber(v));
}

function onlyDateTimeIT(d) {
  try {
    const date = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
}

function isSameLocalDay(iso, dayYYYYMMDD) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  const [y, m, dd] = String(dayYYYYMMDD).split("-").map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === dd;
}

function isSameMonth(iso, monthYYYYMM) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  const [y, m] = String(monthYYYYMM).split("-").map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m;
}

function itemTotalClient(it) {
  const t = toNumber(it?.total_price_client);
  if (t > 0) return t;
  return toNumber(it?.quantity) * toNumber(it?.frozen_price_client);
}

export default function AdminDashboard({ searchTerm = "" }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [scope, setScope] = useState("month"); // month | all
  const [projectId, setProjectId] = useState("");

  const [logs, setLogs] = useState([]);
  const [items, setItems] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [completionLists, setCompletionLists] = useState({ assigned: [], worked: [] });

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await apiFetch("admin_dashboard");

        if (!alive) return;

        setLogs(Array.isArray(res?.logs) ? res.logs : []);
        setItems(Array.isArray(res?.items) ? res.items : []);
        setCatalog(Array.isArray(res?.catalog) ? res.catalog : []);
        setUsers(Array.isArray(res?.users) ? res.users : []);
        setProjects(Array.isArray(res?.projects) ? res.projects : []); // se non c'è, ok

        setCompletionLists({
          assigned: Array.isArray(res?.completion?.assigned) ? res.completion.assigned : [],
          worked: Array.isArray(res?.completion?.worked) ? res.completion.worked : [],
        });
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Errore caricamento dashboard");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const catalogById = useMemo(() => {
    const m = new Map();
    for (const c of catalog) m.set(c.id, c);
    return m;
  }, [catalog]);

  const userNameById = useMemo(() => {
    const m = new Map();
    for (const u of users) {
      const name =
        u.name ||
        u.nome ||
        u.full_name ||
        [u.first_name, u.last_name].filter(Boolean).join(" ") ||
        [u.nome, u.cognome].filter(Boolean).join(" ") ||
        u.email ||
        `Tecnico #${u.id}`;
      m.set(u.id, name);
    }
    return m;
  }, [users]);

  const projectNameById = useMemo(() => {
    const m = new Map();
    for (const p of projects) m.set(p.id, p.name || p.nome || p.client_code || `Cantiere #${p.id}`);
    return m;
  }, [projects]);

  const itemsByLogId = useMemo(() => {
    const m = new Map();
    for (const it of items) {
      const id = it.work_logs_id;
      if (id === undefined || id === null) continue;
      if (!m.has(id)) m.set(id, []);
      m.get(id).push(it);
    }
    return m;
  }, [items]);

  const scopedLogs = useMemo(() => {
    const base = Array.isArray(logs) ? logs : [];
    if (scope === "all") {
      return base
        .filter((l) => l.approved_at)
        .sort((a, b) => new Date(b.approved_at).getTime() - new Date(a.approved_at).getTime());
    }
    return base
      .filter((l) => l.approved_at && isSameMonth(l.approved_at, month))
      .sort((a, b) => new Date(b.approved_at).getTime() - new Date(a.approved_at).getTime());
  }, [logs, scope, month]);

  const filteredLogs = useMemo(() => {
    let base = scopedLogs;

    if (projectId) {
      const pid = Number(projectId);
      base = base.filter((l) => Number(l.projects_id) === pid);
    }

    const q = String(searchTerm || "").trim().toLowerCase();
    if (!q) return base;

    return base.filter((l) => {
      const cantiere =
        projectNameById.get(l.projects_id) ||
        l?._projects?.name ||
        l?.projects?.name ||
        "";
      const tecnico = userNameById.get(l.users_id) || "";
      const hay = [
        l.cable_code,
        l.cable_type,
        l.address,
        cantiere,
        tecnico,
        l.id,
        l.users_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [scopedLogs, projectId, searchTerm, projectNameById, userNameById]);

  const dailyLogs = useMemo(() => {
    const base = Array.isArray(logs) ? logs : [];
    return base.filter((l) => l.approved_at && isSameLocalDay(l.approved_at, day));
  }, [logs, day]);

  const periodTotal = useMemo(() => {
    return scopedLogs.reduce((acc, l) => {
      const arr = itemsByLogId.get(l.id) || [];
      return acc + arr.reduce((s, it) => s + itemTotalClient(it), 0);
    }, 0);
  }, [scopedLogs, itemsByLogId]);

  const dailyTotal = useMemo(() => {
    return dailyLogs.reduce((acc, l) => {
      const arr = itemsByLogId.get(l.id) || [];
      return acc + arr.reduce((s, it) => s + itemTotalClient(it), 0);
    }, 0);
  }, [dailyLogs, itemsByLogId]);

  const periodHourly = useMemo(() => periodTotal / (MONTHLY_HOURS || 1), [periodTotal]);
  const dailyHourly = useMemo(() => dailyTotal / (DAILY_HOURS || 1), [dailyTotal]);

  const completion = useMemo(() => {
    const a = (completionLists.assigned || []).length;
    const w = (completionLists.worked || []).length;
    const pct = a ? Math.round((w / a) * 100) : 0;
    return { a, w, pct };
  }, [completionLists]);

  const projectOptions = useMemo(() => {
    const fromProjects = (projects || [])
      .map((p) => ({
        id: p.id,
        name: p.name || p.nome || p.client_code || `Cantiere #${p.id}`,
      }))
      .filter((p) => p.id !== undefined && p.id !== null);

    if (fromProjects.length) {
      return fromProjects.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }

    // fallback da logs (se non passi projects dal backend)
    const ids = new Map();
    for (const l of logs || []) {
      const pid = l.projects_id;
      if (pid === undefined || pid === null) continue;
      const name =
        projectNameById.get(pid) ||
        l?._projects?.name ||
        l?.projects?.name ||
        `Cantiere #${pid}`;
      ids.set(pid, name);
    }
    return Array.from(ids.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [projects, logs, projectNameById]);

  if (loading) {
    return (
      <div className="space-y-6 pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Admin</h2>
          <p className="text-sm text-gray-500">Caricamento dati…</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="space-y-6 pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Admin</h2>
          <p className="text-sm text-red-600">{err}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#F4F5FB] flex flex-col">
      {/* Header Bar */}
      <div className="w-full bg-gradient-to-r from-[#0062FF] to-[#0052D9] text-white shadow-lg flex-shrink-0 md:flex-shrink-0">
        <div className="w-full max-w-md md:max-w-none mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
              <p className="text-sm text-blue-100 mt-0.5">Admin</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <div className="text-sm font-bold">{user?.name?.charAt(0) || "A"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto md:overflow-hidden">
        <div className="w-full max-w-md md:max-w-none mx-auto flex flex-col items-center md:items-stretch px-0 h-full md:h-full md:flex-1 md:overflow-y-auto">
          {/* Main Content Card */}
          <div className="w-full rounded-b-3xl md:rounded-none bg-white p-0 overflow-hidden relative border-x md:border-x-0 border-b md:border-b-0 border-[#E0E3F1] md:flex-1 md:overflow-y-auto">
            <div className="px-6 md:px-8 pt-6 md:pt-8 pb-2">
              <p className="text-sm text-gray-500 text-center">
                Gestione lavori e approvazioni.
              </p>
            </div>

            <div className="px-4 md:px-8 pb-4 md:pb-8 overflow-y-auto md:overflow-y-auto md:flex-1">

      {/* STATS (3 card) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="rounded-2xl border-0 shadow-none bg-[#F4F5FB] p-4 flex flex-row items-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-md">
              <TrendingUp className="h-7 w-7 text-[#0062FF]" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-gray-500">Produzione {scope === "all" ? "Totale" : "Mensile"}</div>
              <div className="text-2xl font-extrabold text-gray-900">{formatEUR(periodTotal)}</div>
              <div className="text-xs text-gray-400 mt-1">≈ {formatEUR(periodHourly)}/h</div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="rounded-2xl border-0 shadow-none bg-[#F4F5FB] p-4 flex flex-row items-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-md">
              <Calendar className="h-7 w-7 text-orange-500" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-gray-500">Produzione Giornaliera</div>
              <div className="text-2xl font-extrabold text-gray-900">{formatEUR(dailyTotal)}</div>
              <div className="text-xs text-gray-400 mt-1">{dailyLogs.length} lavori oggi</div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="rounded-2xl border-0 shadow-none bg-[#F4F5FB] p-4 flex flex-row items-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-md">
              <CheckCircle className="h-7 w-7 text-green-500" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-gray-500">Completamento</div>
              <div className="text-2xl font-extrabold text-gray-900">{completion.w}/{completion.a}</div>
              <div className="text-xs text-gray-400 mt-1">{completion.pct}% completato</div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* FILTRI */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 mb-2"
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs font-semibold text-gray-500">Filtri</div>
            <div className="text-xs text-gray-400 mt-1">
              {scope === "all" ? "Storico completo" : `Mese: ${month}`} · Giorno: {day}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E0E3F1] p-4 md:bg-transparent md:border-0 md:p-0 md:rounded-none space-y-3 md:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-500 mb-2">Giorno</div>
            <input
              type="date"
              className="w-full outline-none bg-transparent text-gray-900"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </div>

          <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-500 mb-2">Mese</div>
            <input
              type="month"
              className="w-full outline-none bg-transparent text-gray-900"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              disabled={scope === "all"}
              title={scope === "all" ? "Disabilitato in modalità storico" : ""}
            />
            {scope === "all" && (
              <div className="text-[11px] text-gray-400 mt-2">Modalità “Tutto storico” attiva.</div>
            )}
          </div>

          <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-500 mb-2">Cantiere</div>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Tutti i cantieri</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (#{p.id})
                </option>
              ))}
            </select>
          </div>
        </div>
          <button
            type="button"
            onClick={() => setScope("month")}
            className={[
              "px-3 py-2 rounded-xl text-xs font-bold border transition-all",
              scope === "month"
                ? "bg-[#0062FF] text-white border-[#0062FF]"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
            ].join(" ")}
          >
            Solo mese
          </button>

          <button
            type="button"
            onClick={() => setScope("all")}
            className={[
              "px-3 py-2 rounded-xl text-xs font-bold border transition-all",
              scope === "all"
                ? "bg-[#0062FF] text-white border-[#0062FF]"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
            ].join(" ")}
          >
            Tutto storico
          </button>

          <div className="ml-auto text-xs text-gray-500">
            Lavori: <b>{filteredLogs.length}</b>
          </div>
        </div>
      </motion.div>

      {/* LISTA LAVORI */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 pb-20"
      >
        <div className="text-base font-bold text-gray-900 mb-3">Lavori completati</div>
        {filteredLogs.length === 0 ? (
          <div className="text-sm text-gray-400">Nessun lavoro nel periodo / filtro selezionato.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredLogs.map((log, index) => (
              <WorkRow
                key={log.id}
                index={index}
                log={log}
                items={itemsByLogId.get(log.id) || []}
                catalogById={catalogById}
                userNameById={userNameById}
                projectNameById={projectNameById}
              />
            ))}
          </div>
        )}
      </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkRow({ index = 0, log, items, catalogById, userNameById, projectNameById }) {
  const [open, setOpen] = useState(false);

  const approvedStr = log.approved_at ? onlyDateTimeIT(log.approved_at) : "—";
  const tecnico = userNameById?.get(log.users_id) || "—";

  const cantiere =
    projectNameById?.get(log.projects_id) ||
    log?._projects?.name ||
    log?.projects?.name ||
    (log.projects_id ? `Cantiere #${log.projects_id}` : "Cantiere sconosciuto");

  const decorated = useMemo(() => {
    return (items || []).map((it) => {
      const meta = catalogById.get(it.price_list_items_id);
      const unit = (meta?.unit || "").trim() || "u";
      const label = meta?.description || meta?.item_code || `Voce #${it.price_list_items_id}`;
      const unitPrice = toNumber(it.frozen_price_client || meta?.price_client || 0);
      const qty = toNumber(it.quantity || 0);
      const rowTotal = itemTotalClient(it);
      return { ...it, label, unit, unitPrice, qty, rowTotal };
    });
  }, [items, catalogById]);

  const totalJob = useMemo(() => (items || []).reduce((acc, it) => acc + itemTotalClient(it), 0), [items]);

  const stripeClass = index % 2 === 0 ? "bg-gray-100" : "bg-white";

  return (
    <div className={`px-4 py-4 sm:px-5 sm:py-4 ${stripeClass}`}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:bg-transparent sm:shadow-none sm:border-none sm:p-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-gray-500">{approvedStr}</div>

            <div className="mt-1 font-extrabold text-gray-900 text-lg sm:text-base truncate">{log.cable_code ? log.cable_code : `Lavoro #${log.id}`}</div>

            <div className="mt-1 text-sm text-gray-500 truncate">{cantiere}</div>
            <div className="text-sm text-gray-500 truncate">Tecnico: {tecnico}</div>

            {log.address ? <div className="text-sm text-gray-500 truncate">Indirizzo: {log.address}</div> : null}
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0 w-full sm:w-auto">
            <div className="inline-flex items-center gap-3">
              <div className="text-2xl sm:text-lg font-extrabold text-gray-900">{formatEUR(totalJob)}</div>
              <div className="hidden sm:block text-xs text-gray-500">Totale lavoro</div>
            </div>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="w-full sm:w-auto inline-flex justify-center text-xs font-bold text-white bg-[#0062FF] hover:bg-[#0051d6] px-3 py-2 rounded-lg"
            >
              {open ? "Nascondi dettaglio" : "Dettaglio"}
            </button>
          </div>
        </div>

        {open && (
          <div className="mt-4 bg-gray-50 border border-gray-100 rounded-2xl p-4">
            {decorated.length === 0 ? (
              <div className="text-sm text-gray-500">Nessun item attivo.</div>
            ) : (
              <div className="space-y-3">
                {decorated.map((it) => (
                  <div key={it.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-sm text-gray-700 w-full sm:flex-1">
                      <div className="font-semibold">{it.label}</div>
                      <div className="text-gray-500 mt-1">— {formatQty(it.qty)} {it.unit} × {formatEUR(it.unitPrice)}/{it.unit}</div>
                    </div>

                    <div className="text-sm font-extrabold text-gray-900 mt-2 sm:mt-0">{formatEUR(it.rowTotal)}</div>
                  </div>
                ))}

                <div className="pt-2 mt-2 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="text-sm text-gray-600 font-semibold">Totale lavoro</div>
                  <div className="text-sm font-extrabold">{formatEUR(totalJob)}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
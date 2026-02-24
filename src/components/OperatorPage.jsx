import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Calendar, CheckCircle, Clock, ArrowUpRight, Hammer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/services/api";
import { useAuth } from "@/auth/AuthProvider";
import DeclarationModal from "./DeclarationModal";

const MONTH_TARGET_EUR = 21000; // obiettivo mensile € (serve SOLO per la %)
const BONUS_FROM_EUR = 44;      // testo "bonus a partire da"
const MONTHLY_HOURS = 24 * 21; // 504
const DAILY_HOURS = 24;

function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function formatHourlyEUR(value) {
  const n = toNumber(value);
  return `${n.toFixed(2).replace(".", ",")} €/h`;
}

function onlyDateIT(d) {
  try {
    const date = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  } catch {
    return "";
  }
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameLocalDay(a, b) {
  const da = startOfLocalDay(a).getTime();
  const db = startOfLocalDay(b).getTime();
  return da === db;
}

function isThisMonth(dateLike) {
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function statusLabel(st) {
  const s = String(st || "").toLowerCase();
  if (s === "da_approvare") return "Da approvare";
  if (s === "rifiutato") return "Rifiutato";
  if (s === "in_attesa") return "In attesa";
  if (s === "approvato") return "Approvato";
  return st || "-";
}

function statusChip(st) {
  const s = String(st || "").toLowerCase();
  if (s === "rifiutato") return "bg-red-50 text-red-700 border border-red-100";
  if (s === "da_approvare") return "bg-yellow-50 text-yellow-700 border border-yellow-100";
  if (s === "in_attesa") return "bg-blue-50 text-blue-700 border border-blue-100";
  if (s === "approvato") return "bg-green-50 text-green-700 border border-green-100";
  return "bg-gray-50 text-gray-700 border border-gray-100";
}

export default function OperatorPage() {
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selectedWork, setSelectedWork] = useState(null);
  const [showWorkModal, setShowWorkModal] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        // ✅ endpoint corretto (APP group)
        const res = await apiFetch("operator_dashboard");

        if (!alive) return;
        setData(res);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Errore nel caricamento dashboard operatore");
        setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // arrays safe
  const approvedLogs = useMemo(() => (Array.isArray(data?.approved) ? data.approved : []), [data]);
  const recentLogs = useMemo(() => (Array.isArray(data?.recent) ? data.recent : []), [data]);
  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);

  const completion = useMemo(() => {
    const assigned = toNumber(data?.completion?.assigned);
    const worked = toNumber(data?.completion?.worked);
    return { assigned, worked };
  }, [data]);

  const approvedById = useMemo(() => new Map(approvedLogs.map((l) => [l.id, l])), [approvedLogs]);

  // TOTALI (servono per percentuale obiettivo)
  const monthlyTotal = useMemo(() => {
    if (items.length === 0 || approvedLogs.length === 0) return 0;

    return items
      .filter((i) => {
        const log = approvedById.get(i.work_logs_id);
        return log && isThisMonth(log.approved_at);
      })
      .reduce((sum, i) => sum + toNumber(i.total_price_client), 0);
  }, [items, approvedLogs, approvedById]);

  const dailyTotal = useMemo(() => {
    if (items.length === 0 || approvedLogs.length === 0) return 0;

    const today = new Date();

    return items
      .filter((i) => {
        const log = approvedById.get(i.work_logs_id);
        if (!log?.approved_at) return false;
        const d = new Date(log.approved_at);
        if (isNaN(d.getTime())) return false;
        return isSameLocalDay(d, today);
      })
      .reduce((sum, i) => sum + toNumber(i.total_price_client), 0);
  }, [items, approvedLogs, approvedById]);

  // €/h
  const monthlyHourly = useMemo(() => monthlyTotal / (MONTHLY_HOURS || 1), [monthlyTotal]);
  const dailyHourly = useMemo(() => dailyTotal / (DAILY_HOURS || 1), [dailyTotal]);

  const monthlyProgressPct = useMemo(() => {
    if (MONTH_TARGET_EUR <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((monthlyTotal / MONTH_TARGET_EUR) * 100)));
  }, [monthlyTotal]);

  const completionPct = useMemo(() => {
    if (!completion.assigned) return 0;
    return Math.max(0, Math.min(100, Math.round((completion.worked / completion.assigned) * 100)));
  }, [completion]);

  const recentThisMonth = useMemo(() => {
    return recentLogs
      .filter((l) => isThisMonth(l.created_at))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 12);
  }, [recentLogs]);

  const nav = useNavigate();

  if (loading) {
    return (
      <div className="space-y-6 pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Operatore</h2>
          <p className="text-sm text-gray-500">Caricamento dati…</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="space-y-6 pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Operatore</h2>
          <p className="text-sm text-red-600">{err}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#F4F5FB] flex flex-col">
      {/* Header Bar */}
      <div className="w-full bg-gradient-to-r from-[#0062FF] to-[#0052D9] text-white shadow-lg">
        <div className="w-full max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
              <p className="text-sm text-blue-100 mt-0.5">Operatore</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <div className="text-sm font-bold">{user?.name?.charAt(0) || "O"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-md mx-auto flex flex-col items-center px-0">
          {/* Main Content Card */}
          <div className="w-full rounded-b-3xl bg-white shadow-xl p-0 overflow-hidden relative border-x border-b border-[#E0E3F1]">
            <div className="px-6 pt-6 pb-2">
              <p className="text-sm text-gray-500 text-center">
                Benvenuto{user?.name ? `, ${user.name}` : ""}. Produzione calcolata su lavori approvati.
              </p>
            </div>
            
            <div className="px-4 pb-4">
              {/* Stats Grid (3 card) */}
              <div className="grid grid-cols-1 gap-4 mt-4">
                {/* Mensile */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="rounded-2xl border-0 shadow-none bg-[#F4F5FB] p-4 flex flex-row items-center gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-md">
                      <TrendingUp className="h-7 w-7 text-[#0062FF]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-500">Produzione Mensile</div>
                      <div className="text-2xl font-extrabold text-gray-900">{formatHourlyEUR(monthlyHourly)}</div>
                      
                    </div>
                  </Card>
                </motion.div>

                {/* Giornaliera */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="rounded-2xl border-0 shadow-none bg-[#F4F5FB] p-4 flex flex-row items-center gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-md">
                      <Calendar className="h-7 w-7 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-500">Produzione Giornaliera</div>
                      <div className="text-2xl font-extrabold text-gray-900">{formatHourlyEUR(dailyHourly)}</div>
                      <div className="text-xs text-gray-400 mt-1">Oggi (approvati)</div>
                    </div>
                  </Card>
                </motion.div>

                {/* Completamento */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <Card className="rounded-2xl border-0 shadow-none bg-[#F4F5FB] p-4 flex flex-row items-center gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-md">
                      <CheckCircle className="h-7 w-7 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-500">Completamento</div>
                      <div className="text-2xl font-extrabold text-gray-900">{completion.worked}/{completion.assigned}</div>
                      <div className="text-xs text-gray-400 mt-1">{completionPct}% completato</div>
                    </div>
                  </Card>
                </motion.div>
              </div>

              {/* Progress Target Section */}
              <div className="mt-6 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Obiettivo Mensile</div>
                    <div className="text-xs text-gray-400">Bonus da {BONUS_FROM_EUR}€/h</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-[#0062FF]">{monthlyProgressPct}%</span>
                  </div>
                </div>
                <div className="h-3 w-full bg-[#E0E3F1] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#0062FF] rounded-full relative"
                    initial={{ width: 0 }}
                    animate={{ width: `${monthlyProgressPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </motion.div>
                </div>
              </div>

              {/* Recent Activities */}
              <div className="mt-6 pb-20">
                <div className="text-base font-bold text-gray-900 mb-3">Attività Recenti</div>
                {recentThisMonth.length === 0 ? (
                  <div className="text-sm text-gray-400">Nessuna attività nel mese corrente.</div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {recentThisMonth.map((log) => {
                      const st = String(log.status || '').toLowerCase();
                      const icon =
                        st === 'rifiutato' ? (
                          <Clock className="w-5 h-5" />
                        ) : st === 'da_approvare' ? (
                          <Hammer className="w-5 h-5" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        );
                      const leftBg =
                        st === 'rifiutato'
                          ? 'bg-red-50 text-red-600'
                          : st === 'da_approvare'
                          ? 'bg-yellow-50 text-yellow-600'
                          : 'bg-blue-50 text-blue-600';
                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div
                            onClick={() => {
                              setSelectedWork({
                                id: log.id,
                                code: log.cable_code,
                                status: log.status
                              });
                              setShowWorkModal(true);
                            }}
                            className="relative bg-[#F4F5FB] rounded-2xl border border-[#E0E3F1] shadow-md flex items-center gap-4 px-4 py-3 md:hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                            role="button"
                            aria-label={log.cable_code || `Lavoro #${log.id}`}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow bg-white ${leftBg}`}>
                              {icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-semibold text-gray-900 text-base truncate">
                                  {log.cable_code || `Lavoro #${log.id}`}
                                </h4>
                                <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${statusChip(log.status)}`}>
                                  {statusLabel(log.status)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-gray-400">{onlyDateIT(log.created_at)}</p>
                                <ArrowUpRight className="w-4 h-4 text-gray-300" />
                              </div>
                            </div>
                            <div className="absolute left-0 top-0 h-full w-1 rounded-bl-2xl rounded-tl-2xl bg-[#0062FF]" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Work Detail Modal - Fullscreen on Mobile */}
      <AnimatePresence>
        {showWorkModal && selectedWork && (
          <DeclarationModal
            isOpen={showWorkModal}
            onClose={() => setShowWorkModal(false)}
            cable={{
              id: selectedWork.id,
              code: selectedWork.code,
              status: selectedWork.status
            }}
            onSuccess={() => {
              setShowWorkModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
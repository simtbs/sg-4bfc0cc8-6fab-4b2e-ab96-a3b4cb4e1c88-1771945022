import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { apiFetch } from "@/services/api";
import { useAuth } from "@/auth/AuthProvider";

// Minime richieste per import (INDIRIZZO / PROGETTO OF / RIFERIMENTI opzionali)
const REQUIRED_HEADERS = ["PFS", "FO", "TIPO CAVO", "NOME PNI CAVO"];

// ✅ opzionale: solo per debug locale se vuoi bypass auth lato Xano
const DEBUG_ADMIN_ID = import.meta.env.VITE_DEBUG_ADMIN_ID
  ? Number(import.meta.env.VITE_DEBUG_ADMIN_ID)
  : null;

function norm(v) {
  return String(v ?? "").trim();
}
function normKey(v) {
  return norm(v).toLowerCase().replace(/\s+/g, " ");
}
function asInt(x) {
  const raw = norm(x);
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}
function pick(row, headerWanted) {
  const wanted = normKey(headerWanted);
  const keys = Object.keys(row || {});
  const found = keys.find((k) => normKey(k) === wanted);
  return found ? row[found] : undefined;
}

async function readExcelFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  const sheetName = wb.SheetNames?.[0];
  if (!sheetName) return { rows: [], headers: [], sheetName: "" };

  const ws = wb.Sheets[sheetName];

  // headers riga 1
  const headerRow = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })?.[0] || [];
  const headers = headerRow.map((h) => String(h));

  // righe come oggetti
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });

  return { rows, headers, sheetName };
}

async function readCsvFile(file) {
  const text = await file.text();
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        resolve({
          rows: Array.isArray(res?.data) ? res.data : [],
          headers: Array.isArray(res?.meta?.fields) ? res.meta.fields : [],
        });
      },
      error: (err) => reject(err),
    });
  });
}

export default function ImportWorkLogsPage() {
  const { user } = useAuth();

  const [techs, setTechs] = useState([]);
  // ✅ techId NUMERICO (0 = non selezionato)
  const [techId, setTechId] = useState(0);

  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState("");
  const [fileMeta, setFileMeta] = useState(null);
  const [rawRows, setRawRows] = useState([]);

  const [loadingTechs, setLoadingTechs] = useState(true);
  const [importing, setImporting] = useState(false);

  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  // 1) carico tecnici
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingTechs(true);
        setErr("");
        setResult(null);

        const res = await apiFetch("admin/technicians");
        if (!alive) return;

        const list = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
        setTechs(list);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Errore caricamento tecnici");
      } finally {
        if (alive) setLoadingTechs(false);
      }
    })();

    return () => (alive = false);
  }, []);

  // 2) normalizzo righe (payload Xano)
  const parsed = useMemo(() => {
    const rows = Array.isArray(rawRows) ? rawRows : [];

    const normalized = rows
      .map((r) => ({
        PFS: norm(pick(r, "PFS")),
        FO: norm(pick(r, "FO")),
        "TIPO CAVO": norm(pick(r, "TIPO CAVO")),
        "NOME PNI CAVO": norm(pick(r, "NOME PNI CAVO")),
        INDIRIZZO: norm(pick(r, "INDIRIZZO")),
        "PROGETTO OF": norm(pick(r, "PROGETTO OF")),
        RIFERIMENTI: norm(pick(r, "RIFERIMENTI")),
      }))
      .filter((r) => Object.values(r).some((v) => v !== ""));

    const issues = normalized.map((r, idx) => {
      const errors = [];
      if (!r.PFS) errors.push("PFS mancante");
      if (!r["NOME PNI CAVO"]) errors.push("NOME PNI CAVO mancante");
      if (!r["TIPO CAVO"]) errors.push("TIPO CAVO mancante");
      if (r.FO && !asInt(r.FO)) errors.push("FO non valido");
      return { idx, errors };
    });

    const hasErrors = issues.some((x) => x.errors.length > 0);
    return { normalized, issues, hasErrors };
  }, [rawRows]);

  // 3) upload file Excel/CSV
  const onFileChange = async (file) => {
    setResult(null);
    setErr("");
    setRawRows([]);
    setFileMeta(null);
    setFileName(file?.name || "");

    if (!file) return;

    const name = (file.name || "").toLowerCase();

    try {
      let rows = [];
      let headers = [];
      let meta = { type: "" };

      if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const out = await readExcelFile(file);
        rows = out.rows;
        headers = out.headers;
        meta = { type: "excel", sheetName: out.sheetName || "" };
      } else if (name.endsWith(".csv")) {
        const out = await readCsvFile(file);
        rows = out.rows;
        headers = out.headers;
        meta = { type: "csv" };
      } else {
        setErr("Formato non supportato. Carica .xlsx / .xls / .csv");
        return;
      }

      // verifica intestazioni minime (case/spazi insensitive)
      const normalizedHeaders = headers.map((h) => normKey(h));
      const missing = REQUIRED_HEADERS.filter((h) => !normalizedHeaders.includes(normKey(h)));

      if (missing.length) {
        setErr(`Intestazioni mancanti nel file: ${missing.join(", ")}`);
        setFileMeta(meta);
        return;
      }

      setRawRows(rows);
      setFileMeta(meta);
    } catch (e) {
      setErr(e?.message || "File non valido o non leggibile");
    }
  };

  // 4) invio import
  const onImport = async () => {
    setResult(null);
    setErr("");

    // ✅ users_id deve essere int vero
    const uid = Number(techId);
    if (!Number.isFinite(uid) || uid <= 0) {
      setErr("Tecnico non valido (ID). Seleziona un tecnico dall’elenco.");
      return;
    }

    const rows = Array.isArray(parsed.normalized) ? parsed.normalized : [];
    if (!rows.length) {
      setErr("Carica un file con almeno una riga.");
      return;
    }
    if (parsed.hasErrors) {
      setErr("Correggi gli errori evidenziati prima di importare.");
      return;
    }

    setImporting(true);
    try {
      const body = {
        users_id: uid,
        rows_json: rows,
        // ✅ SOLO DEV: se vuoi bypass auth su Xano debug
        ...(import.meta.env.DEV && Number.isFinite(DEBUG_ADMIN_ID) && DEBUG_ADMIN_ID > 0
          ? { debug_admin_id: DEBUG_ADMIN_ID }
          : {}),
      };

      console.log("IMPORT payload (types)", {
        users_id: body.users_id,
        users_id_type: typeof body.users_id,
        rows_json_is_array: Array.isArray(body.rows_json),
        rows_json_len: body.rows_json.length,
        debug_admin_id: body.debug_admin_id ?? null,
      });

      const res = await apiFetch("admin/import_work_logs", {
        method: "POST",
        body,
      });

      setResult(res);
    } catch (e) {
      setErr(e?.message || "Errore import");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F5FB] flex flex-col">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-[#0062FF] to-[#0052D9] text-white shadow-lg flex-shrink-0">
        <div className="w-full max-w-md md:max-w-none mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Import Lavori</h1>
              <p className="text-sm text-blue-100 mt-0.5">Carica file Excel/CSV</p>
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
            <div className="px-6 md:px-8 pt-6 md:pt-8 pb-2">
              <p className="text-sm text-gray-500">
                Colonne richieste: <b>PFS</b>, <b>FO</b>, <b>TIPO CAVO</b>, <b>NOME PNI CAVO</b>
              </p>
              {fileMeta?.sheetName ? (
                <p className="text-xs text-gray-400 mt-1">Foglio: {fileMeta.sheetName}</p>
              ) : null}
            </div>

            <div className="px-4 md:px-8 pb-6 md:pb-8 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                {/* Tecnico */}
                <div className="md:col-span-1">
                  <label className="text-xs font-semibold text-gray-500">TECNICO</label>
                  <select
                    value={techId || 0}
                    onChange={(e) => setTechId(Number(e.target.value) || 0)}
                    disabled={loadingTechs}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value={0}>{loadingTechs ? "CARICO..." : "SELEZIONA TECNICO"}</option>
                    {techs.map((t) => (
                      <option key={t.id} value={Number(t.id) || 0}>
                        {(t.name || t.email) ? `${t.name || t.email} (#${t.id})` : `#${t.id}`}
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-gray-400 mt-1">
                    Endpoint: <b>GET admin/technicians</b>
                  </div>
                </div>

                {/* File */}
                <div className="md:col-span-3">
                  <label className="text-xs font-semibold text-gray-500">FILE EXCEL / CSV</label>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      const f = e.dataTransfer?.files?.[0];
                      if (f) onFileChange(f);
                    }}
                    className={
                      "mt-1 w-full rounded-xl border-2 p-4 flex items-center justify-between gap-4 cursor-pointer " +
                      (dragging ? "border-dashed border-blue-300 bg-blue-50/40" : "border-gray-200 bg-white")
                    }
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-700 truncate">
                        {fileName || "Trascina qui il file o clicca per selezionare"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Accetta .xlsx, .xls, .csv</div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="shrink-0 inline-flex items-center px-4 py-2 bg-white border rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Scegli file
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                      onChange={(e) => onFileChange(e.target.files?.[0])}
                    />
                  </div>

                  {err && (
                    <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
                      {String(err)}
                    </div>
                  )}

                  {result && (
                    <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">
                      Import OK — creati: <b>{result.created ?? "?"}</b> · saltati: <b>{result.skipped ?? "?"}</b>
                      {typeof result.errors !== "undefined" ? (
                        <>
                          {" "}
                          · errori: <b>{result.errors}</b>
                        </>
                      ) : null}
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={onImport}
                      disabled={importing || techId <= 0 || parsed.normalized.length === 0 || parsed.hasErrors}
                      className="w-full md:w-auto inline-flex items-center justify-center rounded-xl bg-[#0062FF] text-white px-5 py-2.5 text-sm font-extrabold disabled:opacity-60"
                    >
                      {importing ? "IMPORT IN CORSO..." : "IMPORTA"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-lg font-extrabold text-gray-900">PREVIEW</div>
                    <div className="text-sm text-gray-500">
                      Righe lette: <b>{parsed.normalized.length}</b>
                      {parsed.hasErrors ? <span className="text-red-600"> · ERRORI PRESENTI</span> : null}
                    </div>
                  </div>
                </div>

                {parsed.normalized.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">Carica un file per vedere l’anteprima.</div>
                ) : (
                  <div className="mt-4 overflow-auto rounded-xl border border-gray-100">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="text-left px-3 py-2">#</th>
                          <th className="text-left px-3 py-2">PFS</th>
                          <th className="text-left px-3 py-2">FO</th>
                          <th className="text-left px-3 py-2">TIPO CAVO</th>
                          <th className="text-left px-3 py-2">NOME PNI CAVO</th>
                          <th className="text-left px-3 py-2">INDIRIZZO</th>
                          <th className="text-left px-3 py-2">PROGETTO OF</th>
                          <th className="text-left px-3 py-2">RIFERIMENTI</th>
                          <th className="text-left px-3 py-2">ESITO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsed.normalized.slice(0, 50).map((r, i) => {
                          const issue = parsed.issues[i];
                          const hasErr = issue?.errors?.length > 0;
                          return (
                            <tr key={i} className={hasErr ? "bg-red-50/50" : ""}>
                              <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                              <td className="px-3 py-2">{r.PFS}</td>
                              <td className="px-3 py-2">{r.FO}</td>
                              <td className="px-3 py-2">{r["TIPO CAVO"]}</td>
                              <td className="px-3 py-2">{r["NOME PNI CAVO"]}</td>
                              <td className="px-3 py-2">{r.INDIRIZZO}</td>
                              <td className="px-3 py-2">{r["PROGETTO OF"]}</td>
                              <td className="px-3 py-2">{r.RIFERIMENTI}</td>
                              <td className="px-3 py-2">
                                {hasErr ? (
                                  <span className="text-red-700 font-bold">{issue.errors.join(" · ")}</span>
                                ) : (
                                  <span className="text-green-700 font-bold">OK</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {parsed.normalized.length > 50 && (
                      <div className="p-3 text-[11px] text-gray-400">
                        Mostro le prime 50 righe (totale: {parsed.normalized.length}).
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* /Preview */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
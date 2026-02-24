// src/components/WorksPage.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Ruler, Cable, ArrowRightLeft, Calendar } from "lucide-react";
import { useLocation } from "react-router-dom";
import CableCard from "@/components/CableCard";
import DeclarationModal from "@/components/DeclarationModal";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/services/api";

const WorksPage = ({ searchTerm = "" }) => {
  const [cables, setCables] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedCable, setSelectedCable] = React.useState(null);
  const [showDeclare, setShowDeclare] = React.useState(false);
  const { toast } = useToast();
  const location = useLocation();

  React.useEffect(() => {
    fetchCables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCables = async () => {
    try {
      setLoading(true);

      // ✅ usa la tua API Xano (auth users)
      // Endpoint: GET /app/cavi  (o /cavi in base a come l’hai pubblicata)
      const data = await apiFetch("/cavi");

      // Xano può tornare list direttamente oppure {items: [...]}
      const list = Array.isArray(data) ? data : data?.items || [];

      // ✅ Mostra SOLO in_attesa e rifiutato (come richiesto)
      const filtered = list.filter((item) =>
        ["in_attesa", "rifiutato"].includes(String(item?.status || "").toLowerCase())
      );

      const mappedData = filtered.map((item) => ({
        id: item.id,
        code: item.cable_code || "Codice Mancante",

        // ✅ Nome cantiere dalla relation projects.name
        location: item.projects?.name || "Cantiere sconosciuto",

        // ✅ Indirizzo dal work_logs.address
        address: item.address || "Indirizzo non specificato",

        installation_date: item.created_at
          ? new Date(item.created_at).toLocaleDateString("it-IT")
          : "N/D",

        status: item.status,

        // (questi campi li usi nel modal; se non esistono, restano N/D)
        start_point: item.start_point || "N/D",
        end_point: item.end_point || "N/D",
        calculated_length: item.calculated_length || "0",
        cable_type: item.cable_type || "N/D",
      }));

      setCables(mappedData);
      // note: do not open modal here; use effect below to react to navigation state
    } catch (error) {
      console.error("Errore nel caricamento dei lavori:", error);
      toast({
        title: "Errore",
        description: error?.message || "Errore nel caricamento dei lavori",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!cables || cables.length === 0) return;
    const openCode = location.state?.openCableCode;
    if (openCode) {
      const found = cables.find((c) => String(c.code || "").toLowerCase() === String(openCode || "").toLowerCase());
      if (found) {
        setSelectedCable(found);
        try {
          window.history.replaceState({}, "", window.location.pathname + window.location.search);
        } catch (e) {
          // ignore
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cables]);

  const normalizedSearch = String(searchTerm || "").trim().toLowerCase();

  const filteredCables = cables.filter((cable) => {
    if (!normalizedSearch) return true;
    return (
      String(cable.code || "").toLowerCase().includes(normalizedSearch) ||
      String(cable.location || "").toLowerCase().includes(normalizedSearch) ||
      String(cable.address || "").toLowerCase().includes(normalizedSearch)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F5FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0062FF]" />
          <p className="text-gray-500 text-sm animate-pulse">Caricamento lavori...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5FB] flex flex-col items-center px-0 pt-0 pb-20">
      {/* Header Bar */}
      <div className="w-full bg-gradient-to-r from-[#0062FF] to-[#0052D9] text-white shadow-lg">
        <div className="w-full max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Lavori</h1>
              <p className="text-sm text-blue-100 mt-0.5">Assegnati</p>
            </div>
            <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
              {filteredCables.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="w-full max-w-md mx-auto rounded-b-3xl bg-white shadow-xl p-0 overflow-hidden relative border-x border-b border-[#E0E3F1]">
        <div className="px-4 py-4">
          {filteredCables.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="bg-[#F4F5FB] rounded-2xl border border-[#E0E3F1] shadow-none p-8 text-center">
                <p className="text-gray-400 text-sm">Nessun lavoro trovato con questo filtro</p>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredCables.map((cable, index) => (
                <motion.div
                  key={cable.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  {/* CableCard usa cable.code/location/status ecc. */}
                  <CableCard cable={cable} onUpdate={fetchCables} onSelect={() => setSelectedCable(cable)} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL DETTAGLI --- */}
      <AnimatePresence>
        {selectedCable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCable(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-[#E0E3F1]"
            >
              {/* Header Modal */}
              <div className="px-6 pt-6 pb-2 flex flex-col items-center border-b border-[#E0E3F1]">
                <h3 className="font-extrabold text-gray-900 text-xl">Dettagli Lavoro</h3>
                <button
                  onClick={() => setSelectedCable(null)}
                  className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Chiudi"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Contenuto Dettagli */}
              <div className="px-6 py-4 space-y-4">

                {/* NOME CAVO */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0062FF] shadow-sm">
                    <Cable size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-400 uppercase">Nome Cavo</p>
                    <p className="text-lg font-bold text-gray-900 break-words whitespace-normal">{selectedCable.code}</p>
                  </div>
                </div>

                {/* CANTIERE */}
                <div className="bg-[#F4F5FB] rounded-2xl border border-[#E0E3F1] p-3">
                  <p className="text-xs font-bold text-gray-400 uppercase">Cantiere</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{selectedCable.location}</p>
                </div>

                {/* INDIRIZZO */}
                <div className="bg-[#F4F5FB] rounded-2xl border border-[#E0E3F1] p-3">
                  <p className="text-xs font-bold text-gray-400 uppercase">Indirizzo</p>
                  <p className="text-sm text-gray-700 break-words whitespace-normal mt-1">{selectedCable.address || "N/D"}</p>
                </div>

                {/* RIFERIMENTI */}
                <div className="bg-[#F4F5FB] rounded-2xl border border-[#E0E3F1] p-3">
                  <p className="text-xs font-bold text-gray-400 uppercase">Riferimenti</p>
                  <p className="text-sm text-gray-700 break-words whitespace-normal mt-1">{selectedCable.references || selectedCable.start_point || selectedCable.end_point || "N/D"}</p>
                </div>

                {/* DATA */}
                <div className="bg-[#F4F5FB] rounded-2xl border border-[#E0E3F1] p-3 flex items-center gap-2">
                  <Calendar size={18} className="text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Data</p>
                    <p className="text-sm font-bold text-gray-900">{selectedCable.installation_date}</p>
                  </div>
                </div>

                {/* TIPOLOGIA */}
                <div className="bg-[#F4F5FB] rounded-2xl border border-[#E0E3F1] p-3 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500">Tipologia</span>
                  <span className="px-3 py-1 bg-[#0062FF]/10 text-[#0062FF] text-xs font-bold rounded-full uppercase">{selectedCable.cable_type}</span>
                </div>

              </div>

              {/* Pulsanti Azione */}
              <div className="px-6 py-4 bg-[#F4F5FB] border-t border-[#E0E3F1] rounded-b-3xl flex gap-3">
                <button
                  onClick={() => setShowDeclare(true)}
                  className="flex-1 py-3 bg-white border border-[#E0E3F1] text-gray-900 rounded-2xl font-bold transition-all hover:bg-gray-50 shadow-sm"
                >
                  Dichiara metri
                </button>

                <button
                  onClick={() => setSelectedCable(null)}
                  className="flex-1 py-3 bg-[#0062FF] hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-md shadow-blue-200"
                >
                  Ho capito
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <DeclarationModal
        isOpen={showDeclare}
        onClose={() => setShowDeclare(false)}
        cable={selectedCable}
        onSuccess={() => {
          setShowDeclare(false);
          setSelectedCable(null);
          fetchCables();
        }}
      />
    </div>
  );
};

export default WorksPage;
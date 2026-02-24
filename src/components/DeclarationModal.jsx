// src/components/DeclarationModal.jsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Construction,
  Cable,
  Network,
  FileText,
} from "lucide-react";
import { apiFetch } from "@/services/api";

const CollapsibleSection = ({ title, icon: Icon, isOpen, onToggle, children, summary }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
    <div className="border border-[#E0E3F1] rounded-2xl overflow-hidden bg-[#F4F5FB] shadow-sm mb-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-[#F9F9FF] transition-colors rounded-t-2xl"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isOpen ? "bg-[#0062FF] text-white shadow-md" : "bg-[#F4F5FB] text-[#0062FF]"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {summary && <p className="text-xs text-gray-500 mt-0.5">{summary}</p>}
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-[#0062FF]" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-[#E0E3F1] space-y-4 animate-in slide-in-from-top-2 duration-200 bg-[#F4F5FB]">
          {children}
        </div>
      )}
    </div>
  </motion.div>
);

export default function DeclarationModal({ isOpen, onClose, cable, onSuccess }) {
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(false);
  const [openSection, setOpenSection] = React.useState("posa");
  const [showSummary, setShowSummary] = React.useState(false);

  const initialForm = React.useMemo(
    () => ({
      // Posa Cavo
      cavoTubazione: "",
      cavoInfascettato: "",
      tipologiaCavo: "CPR",

      // Giunzione
      posaPte: false,
      giunzionePte: false,

      // Opere Civili
      posaTubazionePvc: "",
      posaCanalettaVtr: "",
      posaMicrotubo: "",
      scavoAsfalto: "",
      scavoTerreno: "",
      ripristinoPregiato: "",
      ricercaPozzetto: "",
      puliziaPozzetto: "",
      ripristinoTubazione: "",

      // Note
      note: "",
    }),
    []
  );

  const [formData, setFormData] = React.useState(initialForm);

  const resetAll = React.useCallback(() => {
    setFormData(initialForm);
    setOpenSection("posa");
    setShowSummary(false);
    setLoading(false);
  }, [initialForm]);

  React.useEffect(() => {
    if (!isOpen) resetAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen) resetAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cable?.id]);

  const handleInputChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const calculateTotalMeters = () => {
    const tubazione = parseFloat(formData.cavoTubazione) || 0;
    const infascettato = parseFloat(formData.cavoInfascettato) || 0;
    return (tubazione + infascettato).toFixed(2);
  };

  const buildItemsToSend = () => {
    const itemsToSend = [];
    const tipoCavo = formData.tipologiaCavo;

    // 1) POSA CAVO
    const tubazione = parseFloat(formData.cavoTubazione) || 0;
    const infascettato = parseFloat(formData.cavoInfascettato) || 0;

    if (tubazione > 0) {
      let idPrezzo = null;
      if (tipoCavo === "CPR") idPrezzo = 1;
      if (tipoCavo === "Microcavo") idPrezzo = 3;
      if (tipoCavo === "Multifibra") idPrezzo = 4;
      if (idPrezzo) itemsToSend.push({ id_prezzo: idPrezzo, quantita: tubazione });
    }

    if (infascettato > 0) {
      itemsToSend.push({ id_prezzo: 2, quantita: infascettato });
    }

    // 2) GIUNZIONI
    if (formData.posaPte) itemsToSend.push({ id_prezzo: 5, quantita: 1 });
    if (formData.giunzionePte) itemsToSend.push({ id_prezzo: 6, quantita: 1 });

    // 3) OPERE CIVILI
    const civiliMapping = {
      posaTubazionePvc: 7,
      posaCanalettaVtr: 8,
      posaMicrotubo: 9,
      scavoAsfalto: 10,
      scavoTerreno: 11,
      ripristinoPregiato: 12,
      ricercaPozzetto: 13,
      ripristinoTubazione: 14,
      // Se hai una voce nel listino, aggiungi l'id:
      // puliziaPozzetto: 15,
    };

    Object.keys(civiliMapping).forEach((key) => {
      const val = parseFloat(formData[key]) || 0;
      if (val > 0) itemsToSend.push({ id_prezzo: civiliMapping[key], quantita: val });
    });

    return itemsToSend;
  };

  const toggleSection = (section) => setOpenSection((prev) => (prev === section ? null : section));

  const handleSubmit = (e) => {
    e.preventDefault();
    const itemsToSend = buildItemsToSend();

    if (itemsToSend.length === 0) {
      toast({
        title: "Attenzione",
        description: "Inserisci almeno una lavorazione.",
        variant: "destructive",
      });
      return;
    }

    setShowSummary(true);
  };

  const handleConfirmSubmit = async () => {
    const itemsToSend = buildItemsToSend();

    // Work log id: preferisci work_logs_id se esiste, altrimenti fallback su cable.id
    const workLogId = cable.work_logs_id ?? cable.id; // fallback solo se sei SICURO

    console.log("DEBUG cable:", cable);
    console.log("DEBUG workLogId:", workLogId);

    if (!workLogId) {
      toast({
        title: "Errore",
        description: "work_logs_id mancante. Controlla la lista cavi.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const submissionToken =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const payload = {
        work_logs_id: Number(workLogId),
        cable_code: String(cable?.code || cable?.cable_code || ""),
        items: JSON.stringify(itemsToSend),
        submission_token: submissionToken,
      };

      await apiFetch("dichiara_lavoro", {
        method: "POST",
        body: payload,
      });

      toast({ title: "Successo!", description: "Dichiarazione salvata correttamente." });
      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "Non salvato",
        description: error?.message || "Errore sconosciuto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const codeLabel = React.useMemo(() => {
    const code = cable?.code || cable?.cable_code || "N/A";
    const parts = String(code).split("-");
    return parts.length > 1 ? parts[parts.length - 1] : code;
  }, [cable]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-full h-[88vh] md:h-auto md:max-w-md p-0 gap-0 overflow-hidden bg-[#F4F5FB] md:max-h-[95vh] flex flex-col rounded-none md:rounded-3xl border-0 md:border border-[#E0E3F1] shadow-none md:shadow-xl"
        hideClose={true}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Nuova Dichiarazione</DialogTitle>
          <DialogDescription>Compila e invia la dichiarazione del lavoro.</DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-6 pb-4 flex flex-col items-center bg-[#0062FF] text-white rounded-none md:rounded-t-3xl shadow-md">
          <h3 className="text-2xl font-extrabold tracking-tight text-center">Nuova Dichiarazione</h3>

          <span className="text-sm font-bold bg-white/20 text-white px-3 py-1 rounded-full mt-2 mb-2 text-center">
            {codeLabel}
          </span>

          <p className="text-xs text-white/80 text-center">{cable?.location || ""}</p>
        </div>

        {showSummary ? (
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#F4F5FB] space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Riepilogo Dichiarazione</h3>
              <p className="text-sm text-gray-500 mt-1">Verifica i dati prima di confermare</p>
            </div>

            {(parseFloat(formData.cavoTubazione) > 0 || parseFloat(formData.cavoInfascettato) > 0) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-[#E0E3F1] p-4 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Cable className="w-5 h-5 text-[#0062FF]" />
                  Posa Cavo
                </h4>

                <div className="space-y-2 text-sm">
                  {parseFloat(formData.cavoTubazione) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">In Tubazione</span>
                      <span className="font-semibold text-gray-900">{parseFloat(formData.cavoTubazione).toFixed(2)} m</span>
                    </div>
                  )}

                  {parseFloat(formData.cavoInfascettato) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Infascettato</span>
                      <span className="font-semibold text-gray-900">{parseFloat(formData.cavoInfascettato).toFixed(2)} m</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-[#E0E3F1] pt-2 mt-2">
                    <span className="text-gray-600">Tipologia</span>
                    <span className="font-semibold text-gray-900">{formData.tipologiaCavo}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Totale</span>
                    <span className="font-bold text-[#0062FF]">{calculateTotalMeters()} m</span>
                  </div>
                </div>
              </motion.div>
            )}

            {(formData.posaPte || formData.giunzionePte) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-[#E0E3F1] p-4 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Network className="w-5 h-5 text-[#0062FF]" />
                  Giunzioni
                </h4>

                <div className="space-y-2 text-sm">
                  {formData.posaPte && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Posa PTE</span>
                      <span className="font-semibold">✓</span>
                    </div>
                  )}
                  {formData.giunzionePte && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Giunzione PTE</span>
                      <span className="font-semibold">✓</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {formData.note && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-[#E0E3F1] p-4 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#0062FF]" />
                  Note
                </h4>
                <p className="text-sm text-gray-600 italic">{formData.note}</p>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#F4F5FB]">
            <form id="declaration-form" onSubmit={handleSubmit} className="space-y-3">
              <CollapsibleSection
                title="Posa Cavo"
                icon={Cable}
                isOpen={openSection === "posa"}
                onToggle={() => toggleSection("posa")}
                summary={`${calculateTotalMeters()} m totali`}
              >
                <div className="space-y-6">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="cavoTubazione" className="text-sm font-semibold text-gray-700">
                        In Tubazione (metri)
                      </Label>
                      <Input
                        id="cavoTubazione"
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.cavoTubazione}
                        onChange={(e) => handleInputChange("cavoTubazione", e.target.value)}
                        className="bg-white h-12 text-base rounded-xl px-4 border-2 border-[#E0E3F1] focus:border-[#0062FF] focus:ring-0"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <Label htmlFor="cavoInfascettato" className="text-sm font-semibold text-gray-700">
                        Infascettato (metri)
                      </Label>
                      <Input
                        id="cavoInfascettato"
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.cavoInfascettato}
                        onChange={(e) => handleInputChange("cavoInfascettato", e.target.value)}
                        className="bg-white h-12 text-base rounded-xl px-4 border-2 border-[#E0E3F1] focus:border-[#0062FF] focus:ring-0"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <Label htmlFor="tipologiaCavo" className="text-sm font-semibold text-gray-700">
                        Tipologia Cavo
                      </Label>
                      <select
                        id="tipologiaCavo"
                        value={formData.tipologiaCavo}
                        onChange={(e) => handleInputChange("tipologiaCavo", e.target.value)}
                        className="h-12 w-full rounded-xl border-2 border-[#E0E3F1] bg-white px-4 py-2 text-base focus:border-[#0062FF] focus:ring-0"
                      >
                        <option value="CPR">CPR</option>
                        <option value="Microcavo">Microcavo</option>
                        <option value="Multifibra">Multifibra</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Giunzione"
                icon={Network}
                isOpen={openSection === "giunzione"}
                onToggle={() => toggleSection("giunzione")}
                summary={formData.posaPte || formData.giunzionePte ? "Selezionato" : ""}
              >
                <div className="flex flex-col gap-5">
                  <label className="flex items-center gap-4 p-4 border-2 border-[#E0E3F1] rounded-xl bg-white hover:bg-[#F9F9FF] cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.posaPte}
                      onChange={(e) => handleInputChange("posaPte", e.target.checked)}
                      className="w-6 h-6 text-[#0062FF] rounded border-[#E0E3F1] focus:ring-[#0062FF]"
                    />
                    <span className="text-base font-semibold text-gray-900">Posa PTE</span>
                  </label>

                  <label className="flex items-center gap-4 p-4 border-2 border-[#E0E3F1] rounded-xl bg-white hover:bg-[#F9F9FF] cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.giunzionePte}
                      onChange={(e) => handleInputChange("giunzionePte", e.target.checked)}
                      className="w-6 h-6 text-[#0062FF] rounded border-[#E0E3F1] focus:ring-[#0062FF]"
                    />
                    <span className="text-base font-semibold text-gray-900">Giunzione PTE</span>
                  </label>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Opere Civili"
                icon={Construction}
                isOpen={openSection === "civili"}
                onToggle={() => toggleSection("civili")}
              >
                <div className="flex flex-col gap-5">
                  {[
                    { id: "posaTubazionePvc", label: "Posa Tubazione PVC (m)" },
                    { id: "posaCanalettaVtr", label: "Posa Canaletta VTR (m)" },
                    { id: "posaMicrotubo", label: "Posa Microtubo (m)" },
                    { id: "scavoAsfalto", label: "Scavo su Asfalto (m)" },
                    { id: "scavoTerreno", label: "Scavo su Terreno (m)" },
                    { id: "ripristinoPregiato", label: "Ripristino Pregiato (m)" },
                    { id: "ricercaPozzetto", label: "Ricerca Pozzetto (pz)" },
                    { id: "puliziaPozzetto", label: "Pulizia Pozzetto (pz)" },
                    { id: "ripristinoTubazione", label: "Ripristino Tubazione (m)" },
                  ].map((field) => (
                    <div key={field.id} className="flex flex-col gap-1">
                      <Label htmlFor={field.id} className="text-sm font-semibold text-gray-700 block" title={field.label}>
                        {field.label}
                      </Label>
                      <Input
                        id={field.id}
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        placeholder="0"
                        value={formData[field.id]}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className="bg-white h-12 text-base rounded-xl px-4 border-2 border-[#E0E3F1] focus:border-[#0062FF] focus:ring-0"
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Note"
                icon={FileText}
                isOpen={openSection === "note"}
                onToggle={() => toggleSection("note")}
                summary={formData.note ? "Compilato" : ""}
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="note" className="text-sm font-semibold text-gray-700">
                    Note
                  </Label>
                  <textarea
                    id="note"
                    value={formData.note}
                    onChange={(e) => handleInputChange("note", e.target.value)}
                    placeholder="Inserisci eventuali note o osservazioni..."
                    className="w-full min-h-[100px] rounded-xl border-2 border-[#E0E3F1] bg-white px-4 py-3 text-base placeholder:text-gray-400 focus:border-[#0062FF] focus:ring-0"
                  />
                </div>
              </CollapsibleSection>
            </form>
          </div>
        )}

        <DialogFooter className="px-4 py-4 bg-[#F4F5FB] border-t border-[#E0E3F1] rounded-none md:rounded-b-3xl flex-shrink-0">
          <div className="flex gap-3 w-full">
            {showSummary ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSummary(false)}
                  disabled={loading}
                  className="flex-1 h-12 text-base font-semibold border-2 border-[#E0E3F1] text-gray-900 rounded-2xl hover:bg-white bg-white"
                >
                  Modifica
                </Button>

                <Button
                  type="button"
                  onClick={handleConfirmSubmit}
                  className="flex-[2] h-12 text-base font-semibold bg-[#0062FF] hover:bg-blue-700 rounded-2xl shadow-md shadow-blue-200 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Invio...
                    </>
                  ) : (
                    "Conferma e Salva"
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 h-12 text-base font-semibold border-2 border-[#E0E3F1] text-gray-900 rounded-2xl hover:bg-white bg-white"
                >
                  Annulla
                </Button>

                <Button
                  type="submit"
                  form="declaration-form"
                  className="flex-[2] h-12 text-base font-semibold bg-[#0062FF] hover:bg-blue-700 rounded-2xl shadow-md shadow-blue-200 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Invio...
                    </>
                  ) : (
                    "Riepilogo"
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
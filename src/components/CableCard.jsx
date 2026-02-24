import React from 'react';
import { MapPin, Calendar, Ruler, Cable, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DeclarationModal from '@/components/DeclarationModal';

const CableCard = ({ cable, onUpdate, onSelect }) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const getCableName = (code) => {
    if (!code) return 'N/A';
    const parts = String(code).split('-');
    return parts.length > 1 ? parts.slice(1).join('-').trim() : String(code).trim();
  };

  // Determiniamo se il lavoro è già stato completato/approvato su Xano
  const isApproved = cable.status === 'approved' || cable.status === 'completato';

  return (
    <>
      <div
        onClick={() => onSelect?.(cable)}
        role="button"
        aria-label={cable.code || 'Lavoro'}
        className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 cursor-pointer"
      >
        <div className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-[#0062FF] flex-shrink-0">
                <Cable className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#0062FF] truncate">{getCableName(cable.code)}</span>
                  {isApproved && (
                    <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                      Approvato
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-700 truncate">{cable.location || 'Posizione non specificata'}</div>
              </div>
            </div>

            <ArrowUpRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </div>

          <div className="flex items-center justify-between mt-3 gap-3">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="truncate">{cable.address || 'Indirizzo non specificato'}</span>
            </div>

            <div className="text-sm text-gray-500">{cable.installation_date}</div>
          </div>

          <div className="mt-3 space-y-2">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                const via = String(cable.address || '').trim();
                const city = String(cable.location || '').trim();
                const destStr = `${via} ${city}`.trim();
                const dest = encodeURIComponent(destStr);
                const url = destStr
                  ? `https://www.google.com/maps/dir/?api=1&destination=${dest}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city || '')}`;
                window.open(url, '_blank');
              }}
              className="w-full h-11 text-sm bg-white border border-gray-200 text-gray-800 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 hover:bg-white hover:shadow-none hover:text-gray-800"
            >
              <MapPin className="w-4 h-4" />
              Navigatore
            </Button>

            <Button
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="w-full h-11 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-sm shadow-green-200 transition-all flex items-center justify-center gap-2"
              disabled={isApproved}
            >
              <Ruler className="w-4 h-4" />
              {isApproved ? 'Lavoro Completato' : 'Dichiara metri'}
            </Button>
          </div>
        </div>
      </div>

      <DeclarationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cable={cable} // Passa l'intero oggetto cantiere al Modal
        onSuccess={onUpdate} // Ricarica la lista dopo l'invio
      />
    </>
  );
};

export default CableCard;
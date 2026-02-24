import React from 'react';
import { motion } from 'framer-motion';

const CallToAction = () => {
  return (
    <div className="bg-[#0062FF] rounded-2xl p-8 md:p-12 text-center text-white">
      <h2 className="text-2xl md:text-3xl font-bold mb-4">
        Pronto a ottimizzare il tuo lavoro?
      </h2>
      <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
        Unisciti alle aziende che hanno già digitalizzato la gestione dei loro cantieri.
      </p>
      <button className="bg-white text-[#0062FF] px-8 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors">
        Richiedi una demo
      </button>
    </div>
  );
};

export default CallToAction;
const XANO_BASE_URL = "https://x8ki-letl-twmt.n7.xano.io/api:42UxvCSQ"; // Il tuo URL dallo screenshot

export const xanoService = {
  // Recupera i log filtrati per status "da_approvare"
  getAdminLogs: async () => {
    const response = await fetch(`${XANO_BASE_URL}/get_admin_logs`);
    if (!response.ok) throw new Error("Errore nel recupero dei log");
    return await response.json();
  },

  // Approva il lavoro cambiando lo stato
  approvaLavoro: async (workLogId) => {
    const response = await fetch(`${XANO_BASE_URL}/approva_lavoro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ work_log_id: workLogId })
    });
    if (!response.ok) throw new Error("Errore durante l'approvazione");
    return await response.json();
  }
};
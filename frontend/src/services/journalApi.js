import api from './api.js';

export async function obtenirJournal({ action, utilisateurId, debut, fin, limite = 50, decalage = 0 } = {}) {
  const { data } = await api.get('/journal', {
    params: { action, utilisateurId, debut, fin, limite, decalage },
  });
  return data;
}

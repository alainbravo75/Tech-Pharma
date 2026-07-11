import api from './api.js';

export async function envoyerVente(vente) {
  const { data } = await api.post('/ventes', vente);
  return data;
}

export async function obtenirStatutSms() {
  const { data } = await api.get('/ventes/sms/statut');
  return data.configure;
}

export async function envoyerRecuSms(venteId, telephone) {
  const { data } = await api.post(`/ventes/${venteId}/sms`, { telephone });
  return data;
}

export async function obtenirTauxChange() {
  const { data } = await api.get('/taux-change');
  return data.taux_cdf_par_usd;
}

export async function definirTauxChange(tauxCdfParUsd) {
  const { data } = await api.put('/taux-change', { tauxCdfParUsd });
  return data.taux_cdf_par_usd;
}

import api from './api.js';

export async function obtenirRapport(periode, date) {
  const { data } = await api.get('/rapports', { params: { periode, date } });
  return data;
}

export async function telechargerRapportPdf(periode, date) {
  const reponse = await api.get('/rapports/pdf', {
    params: { periode, date },
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([reponse.data], { type: 'application/pdf' }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = `rapport-${periode}-${date.slice(0, 10)}.pdf`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.URL.revokeObjectURL(url);
}

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

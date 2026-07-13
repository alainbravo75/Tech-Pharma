import api from './api.js';

export async function listerSauvegardes() {
  const { data } = await api.get('/sauvegardes');
  return data.sauvegardes;
}

export async function creerSauvegarde() {
  const { data } = await api.post('/sauvegardes');
  return data;
}

export async function telechargerSauvegarde(nomFichier) {
  const reponse = await api.get(`/sauvegardes/${nomFichier}/telecharger`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([reponse.data]));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.URL.revokeObjectURL(url);
}

export async function obtenirStatutEmailSauvegarde() {
  const { data } = await api.get('/sauvegardes/email/statut');
  return data.configure;
}

export async function envoyerSauvegardeParEmail(nomFichier) {
  const { data } = await api.post(`/sauvegardes/${nomFichier}/email`);
  return data;
}

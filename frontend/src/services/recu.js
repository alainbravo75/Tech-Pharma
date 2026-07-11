function formaterMontant(montant) {
  return new Intl.NumberFormat('fr-FR').format(montant || 0);
}

/**
 * Génère le même format de texte que le backend (services/recu.js), à
 * partir de la vente telle que stockée localement (Dexie). Permet
 * d'envoyer le reçu par WhatsApp même si la vente n'est pas encore
 * synchronisée avec le serveur.
 */
export function genererTexteRecu(vente, nomPharmacie = 'Pharmacie') {
  const dateVente = new Date(vente.createdAt).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const lignesTexte = vente.lignes
    .map((l) => `${l.quantite} x ${l.nom} - ${formaterMontant(l.prixUnitaire * l.quantite)} ${vente.devise}`)
    .join('\n');

  return [
    nomPharmacie,
    `Reçu du ${dateVente}`,
    '',
    lignesTexte,
    '',
    `Total : ${formaterMontant(vente.total)} ${vente.devise}`,
    '',
    'Merci de votre confiance.',
  ].join('\n');
}

/**
 * Normalise vers le format international (+243 par défaut pour la RDC),
 * identique à la logique backend, pour que le lien wa.me soit valide.
 */
export function normaliserTelephone(numero) {
  const nettoye = numero.replace(/[^\d+]/g, '');
  if (nettoye.startsWith('+')) return nettoye;
  if (nettoye.startsWith('243')) return `+${nettoye}`;
  if (nettoye.startsWith('0')) return `+243${nettoye.slice(1)}`;
  return `+243${nettoye}`;
}

/**
 * Construit un lien wa.me avec le message pré-rempli. Solution "simple et
 * rapide" retenue au départ : aucune configuration d'API WhatsApp Business
 * n'est nécessaire, ça ouvre directement WhatsApp (app ou web) avec le
 * message prêt à envoyer.
 */
export function construireLienWhatsApp(telephone, texte) {
  const numero = normaliserTelephone(telephone).replace('+', '');
  return `https://wa.me/${numero}?text=${encodeURIComponent(texte)}`;
}

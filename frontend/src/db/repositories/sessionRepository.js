import db from '../dexie.js';
import { chiffrer, dechiffrer } from '../cryptoLocal.js';

const ID_SESSION = 'session_courante';

/**
 * Sauvegarde la session (token + infos utilisateur) chiffrée en local,
 * pour permettre une reconnexion automatique en mode hors ligne.
 */
export async function sauvegarderSession({ token, utilisateur }) {
  const chiffree = await chiffrer({ token, utilisateur, enregistre_le: new Date().toISOString() });
  await db.session.put({ id: ID_SESSION, ...chiffree });
}

/**
 * Récupère la session locale déchiffrée, ou null si absente/corrompue.
 */
export async function lireSession() {
  const enregistrement = await db.session.get(ID_SESSION);
  if (!enregistrement) return null;

  try {
    const { iv, donnees } = enregistrement;
    return await dechiffrer({ iv, donnees });
  } catch {
    // Clé locale changée/corrompue : on efface la session invalide
    await db.session.delete(ID_SESSION);
    return null;
  }
}

export async function effacerSession() {
  await db.session.delete(ID_SESSION);
}

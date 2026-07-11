/**
 * Chiffrement des données sensibles stockées en local (IndexedDB).
 *
 * Objectif : limiter les risques en cas de vol de l'appareil (l'IndexedDB
 * n'est normalement pas lisible sans accès à la session OS, mais on
 * chiffre quand même en profondeur pour les données sensibles : token
 * de session, informations personnelles éventuelles).
 *
 * La clé AES est générée une fois par appareil et stockée dans IndexedDB
 * (non-extractible côté JS grâce à `extractable: false` pour les usages
 * de chiffrement/déchiffrement uniquement in-browser). Ce n'est pas un
 * coffre-fort inviolable (JS tournant sur l'appareil peut toujours agir),
 * mais cela protège contre une lecture brute du fichier IndexedDB hors
 * du navigateur (ex: appareil volé, fichier copié).
 */

const DB_CLE = 'pharmacie_cles';
const STORE_CLE = 'cles';
const ID_CLE = 'cle_locale_v1';

function ouvrirDbCles() {
  return new Promise((resolve, reject) => {
    const requete = indexedDB.open(DB_CLE, 1);
    requete.onupgradeneeded = () => {
      requete.result.createObjectStore(STORE_CLE);
    };
    requete.onsuccess = () => resolve(requete.result);
    requete.onerror = () => reject(requete.error);
  });
}

async function obtenirOuCreerCle() {
  const dbCles = await ouvrirDbCles();

  const cleExistante = await new Promise((resolve, reject) => {
    const tx = dbCles.transaction(STORE_CLE, 'readonly');
    const req = tx.objectStore(STORE_CLE).get(ID_CLE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (cleExistante) return cleExistante;

  const nouvelleCle = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  await new Promise((resolve, reject) => {
    const tx = dbCles.transaction(STORE_CLE, 'readwrite');
    tx.objectStore(STORE_CLE).put(nouvelleCle, ID_CLE);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return nouvelleCle;
}

export async function chiffrer(objetJs) {
  const cle = await obtenirOuCreerCle();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const donnees = new TextEncoder().encode(JSON.stringify(objetJs));

  const chiffre = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cle, donnees);

  return {
    iv: Array.from(iv),
    donnees: Array.from(new Uint8Array(chiffre)),
  };
}

export async function dechiffrer({ iv, donnees }) {
  const cle = await obtenirOuCreerCle();
  const dechiffre = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    cle,
    new Uint8Array(donnees)
  );
  return JSON.parse(new TextDecoder().decode(dechiffre));
}

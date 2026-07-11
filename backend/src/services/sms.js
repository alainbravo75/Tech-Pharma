import dotenv from 'dotenv';

dotenv.config();

let clientSms = null;
let tentativeChargement = false;

/**
 * Le SDK Africa's Talking est chargé de façon paresseuse : si les
 * identifiants ne sont pas configurés (cas par défaut en développement),
 * le service SMS est simplement indisponible plutôt que de faire planter
 * le serveur au démarrage.
 */
async function obtenirClient() {
  if (clientSms) return clientSms;
  if (tentativeChargement) return null;
  tentativeChargement = true;

  if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
    return null;
  }

  const { default: AfricasTalking } = await import('africastalking');
  const instance = AfricasTalking({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME,
  });
  clientSms = instance.SMS;
  return clientSms;
}

export function smsConfigure() {
  return !!(process.env.AT_API_KEY && process.env.AT_USERNAME);
}

/**
 * Normalise un numéro vers le format international attendu par l'API SMS.
 * Hypothèse RDC par défaut (+243) si aucun indicatif n'est fourni —
 * ajuster si la pharmacie opère dans un autre pays.
 */
export function normaliserTelephone(numero) {
  const nettoye = numero.replace(/[^\d+]/g, '');
  if (nettoye.startsWith('+')) return nettoye;
  if (nettoye.startsWith('243')) return `+${nettoye}`;
  if (nettoye.startsWith('0')) return `+243${nettoye.slice(1)}`;
  return `+243${nettoye}`;
}

export async function envoyerSms(telephone, message) {
  const client = await obtenirClient();
  if (!client) {
    const erreur = new Error(
      "Service SMS non configuré. Renseignez AT_API_KEY et AT_USERNAME dans le fichier .env du backend."
    );
    erreur.statusCode = 503;
    throw erreur;
  }

  const options = { to: [normaliserTelephone(telephone)], message };
  if (process.env.AT_SENDER_ID) options.from = process.env.AT_SENDER_ID;

  return client.send(options);
}

import dotenv from 'dotenv';

dotenv.config();

let transporteur = null;
let tentativeChargement = false;

export function emailConfigure() {
  return !!(process.env.SMTP_HOTE && process.env.SMTP_UTILISATEUR && process.env.SMTP_MOT_DE_PASSE && process.env.SAUVEGARDE_EMAIL_DESTINATAIRE);
}

/**
 * Chargement paresseux du transporteur SMTP, sur le même principe que le
 * service SMS : si les identifiants ne sont pas configurés, la fonctionnalité
 * est simplement indisponible plutôt que de faire planter le serveur.
 */
async function obtenirTransporteur() {
  if (transporteur) return transporteur;
  if (tentativeChargement) return null;
  tentativeChargement = true;

  if (!emailConfigure()) return null;

  const { default: nodemailer } = await import('nodemailer');
  transporteur = nodemailer.createTransport({
    host: process.env.SMTP_HOTE,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: parseInt(process.env.SMTP_PORT, 10) === 465,
    auth: {
      user: process.env.SMTP_UTILISATEUR,
      pass: process.env.SMTP_MOT_DE_PASSE,
    },
  });

  return transporteur;
}

/**
 * Envoie un fichier de sauvegarde en pièce jointe à l'adresse configurée.
 * Le point important : ça part directement du serveur, donc peu importe si
 * l'admin déclenche l'envoi depuis un PC ou un téléphone - le résultat est
 * le même, une copie hors site arrive dans la boîte mail configurée.
 */
export async function envoyerSauvegardeParEmail({ cheminFichier, nomFichier }) {
  const client = await obtenirTransporteur();
  if (!client) {
    const erreur = new Error(
      'Service email non configuré. Renseignez SMTP_HOTE, SMTP_UTILISATEUR, SMTP_MOT_DE_PASSE et SAUVEGARDE_EMAIL_DESTINATAIRE dans le fichier .env du backend.'
    );
    erreur.statusCode = 503;
    throw erreur;
  }

  await client.sendMail({
    from: process.env.SMTP_EXPEDITEUR || process.env.SMTP_UTILISATEUR,
    to: process.env.SAUVEGARDE_EMAIL_DESTINATAIRE,
    subject: `Sauvegarde Tech-Pharma - ${nomFichier}`,
    text: `Sauvegarde de la base de données en pièce jointe (${nomFichier}). Envoyée automatiquement depuis Tech-Pharma.`,
    attachments: [{ filename: nomFichier, path: cheminFichier }],
  });
}

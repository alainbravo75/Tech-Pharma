import { watch } from 'vue';
import { statutReseau, operationsEnAttente, verifierConnexionReelle } from './syncStatus.js';
import {
  listerNonSynchronisees,
  marquerSynchronisee,
  marquerErreur,
  compterEnAttente,
} from '../db/repositories/ventesLocalesRepository.js';
import { envoyerVente } from '../services/ventesApi.js';

let synchronisationEnCours = false;

async function rafraichirCompteur() {
  operationsEnAttente.value = await compterEnAttente();
}

/**
 * Envoie au serveur toutes les ventes enregistrées localement mais pas
 * encore confirmées. Traitement séquentiel (pas en parallèle) pour rester
 * simple et éviter de saturer une connexion faible - le volume attendu
 * (3 utilisateurs, une pharmacie) ne justifie pas plus de complexité.
 */
export async function synchroniserVentes() {
  if (synchronisationEnCours) return;

  const enAttente = await listerNonSynchronisees();
  if (enAttente.length === 0) {
    await rafraichirCompteur();
    return;
  }

  synchronisationEnCours = true;
  statutReseau.value = 'synchronisation';

  let erreurRencontree = false;

  for (const vente of enAttente) {
    try {
      const { id, statutSync, tentatives, derniereErreur, ...payload } = vente;
      await envoyerVente({ id, ...payload });
      await marquerSynchronisee(id);
    } catch (err) {
      // Erreur réseau probable (connexion coupée ou délai dépassé en cours
      // de synchro) : on arrête la boucle, la vente reste 'local' et sera
      // retentée automatiquement plus tard, sans limite - c'est purement
      // temporaire, pas une erreur de la vente elle-même.
      erreurRencontree = true;
      if (err.response) {
        // Le serveur A répondu (donc a bien reçu la requête) mais avec une
        // erreur - peut être transitoire (surcharge momentanée) ou une
        // vraie donnée invalide. On la retente quand même, mais avec une
        // limite (voir listerNonSynchronisees) pour ne pas boucler à l'infini.
        const messageErreur = err.response.data?.erreur || `Erreur serveur (${err.response.status})`;
        await marquerErreur(vente.id, messageErreur);
      }
      break;
    }
  }

  await rafraichirCompteur();
  synchronisationEnCours = false;

  if (erreurRencontree) {
    const encoreEnLigne = await verifierConnexionReelle();
    statutReseau.value = encoreEnLigne ? 'erreur' : 'hors_ligne';
  } else {
    statutReseau.value = 'en_ligne';
  }
}

let moteurDemarre = false;

/**
 * Démarre la surveillance automatique : dès que le statut réseau passe à
 * "en_ligne", on tente de vider la file d'attente. Appelé une seule fois
 * au démarrage de l'application.
 */
export function demarrerMoteurSync() {
  if (moteurDemarre) return;
  moteurDemarre = true;

  rafraichirCompteur();

  watch(statutReseau, (nouveauStatut, ancienStatut) => {
    if (nouveauStatut === 'en_ligne' && ancienStatut !== 'en_ligne') {
      synchroniserVentes();
    }
  });

  // Filet de sécurité : nouvelle tentative périodique si des ventes
  // restent en attente alors que le statut affiché est déjà "en_ligne"
  // (ex: échec silencieux précédent).
  setInterval(() => {
    if (statutReseau.value === 'en_ligne') {
      synchroniserVentes();
    }
  }, 30000);
}

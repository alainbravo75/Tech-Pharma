# Schéma de synchronisation offline/online

## Principe

File d'opérations locale (event queue) plutôt qu'une synchro bidirectionnelle complexe.

1. Chaque action critique (vente, mouvement de stock...) est écrite immédiatement dans Dexie (`sync_queue`) avec un `id` UUID généré côté client, appliquée en local tout de suite (optimistic UI).
2. Détection de connexion réelle : `navigator.onLine` **+** ping périodique vers `/api/health` (plus fiable que `navigator.onLine` seul).
3. Dès que la connexion revient : envoi des opérations `pending` par lot, dans l'ordre chronologique. Le serveur traite chaque opération et répond avec un statut individuel.
4. Résolution de conflits :
   - **Ventes** : jamais de conflit réel (UUID unique par vente) → simple insertion.
   - **Stock** : le serveur reste la source de vérité. En cas de stock local insuffisant détecté à la synchro (deux caissiers ont vendu le dernier article hors ligne), la vente est acceptée quand même et le stock négatif déclenche une alerte admin — refuser une vente déjà remise au client serait pire.
   - **Modifications produit/prix** : dernier écrit gagne (`updated_at`), tracé dans `journal_activite`.
5. Indicateur visuel (`StatutSync.vue`) : 🟢 En ligne / ⚪ Hors ligne / 🔄 Synchronisation / 🔴 Erreur, avec compteur d'opérations en attente.
6. Robustesse : Dexie/IndexedDB persiste au-delà d'une fermeture inattendue du navigateur — rien n'est perdu.

## État actuel (étape 1)

Cette étape pose les fondations : `sync_queue` (Dexie) et `syncStatus.js` existent, mais aucune opération métier (vente, stock) n'y est encore poussée — ce sera fait à l'étape 3 (point de vente offline).

La session utilisateur, elle, est déjà pleinement offline-capable : après une première connexion en ligne, elle est mise en cache chiffrée (AES-GCM) et permet de rouvrir l'app sans réseau.

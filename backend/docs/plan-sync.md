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

## État actuel (étape 3)

Implémenté :
- `ventes_locales` (Dexie) : écriture immédiate de chaque vente avant tout appel réseau.
- `syncEngine.js` : synchronise automatiquement dès que `statutReseau` passe à `en_ligne` (watcher Vue), avec une nouvelle tentative de sécurité toutes les 30s tant qu'il reste des ventes en attente.
- `produits_cache` (Dexie) : copie locale du catalogue, utilisée par la caisse quand l'API est injoignable — la vente reste possible hors ligne du début à la fin.
- Déduction de stock FEFO côté serveur (premier périmé, premier sorti), avec tolérance au stock négatif + alerte journalisée plutôt que rejet de la vente.
- Idempotence : l'id de vente est généré côté client (UUID), donc un renvoi après coupure réseau ne crée pas de doublon.

À venir (étape 4+) : file `sync_queue` générique pour d'autres types d'opérations (actuellement les ventes utilisent leur propre table dédiée, suffisant pour ce volume).

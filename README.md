# Tech-Pharma — Application de gestion de pharmacie (Kinshasa, RDC)

Application web progressive (PWA) de gestion de pharmacie, conçue pour fonctionner **entièrement hors ligne** et se synchroniser automatiquement à la reconnexion.

## État d'avancement — MVP

- [x] Étape 1 — Authentification + gestion des utilisateurs
- [x] Étape 2 — Gestion de stock (produits, lots, alertes péremption)
- [x] Étape 3 — Point de vente offline + synchronisation
- [x] Étape 4 — Envoi de reçu par WhatsApp / SMS
- [x] **Rapports (journalier/hebdomadaire/mensuel) + export PDF** *(cette version)*
- [ ] Ordonnances et suivi patients (post-MVP, sur demande)

## Stack technique

- **Frontend** : Vue 3 + Vite, PWA (vite-plugin-pwa), Pinia, Dexie.js (IndexedDB)
- **Backend** : Node.js + Express, SQLite (better-sqlite3)
- **Auth** : JWT + bcrypt, verrouillage de compte après échecs répétés, session offline chiffrée (Web Crypto AES-GCM)

## Démarrage rapide

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:init     # crée la pharmacie + le compte admin par défaut
npm run dev          # démarre sur http://localhost:4000
```

Le compte administrateur par défaut (téléphone/mot de passe) est affiché dans la console après `npm run db:init`. **Changez-le immédiatement** en production (voir `.env`).

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev           # démarre sur http://localhost:5173
```

## Rôles utilisateurs

| Rôle | Permissions |
|---|---|
| **Admin** | Tout, y compris gestion des utilisateurs et suppression de produits |
| **Pharmacien** | Stock, ventes, ordonnances (pas de gestion des comptes) |
| **Caissier** | Point de vente uniquement |

## Sécurité

- Mots de passe hashés avec bcrypt (jamais stockés en clair)
- Verrouillage de compte après plusieurs échecs de connexion (configurable dans `.env`)
- Session locale chiffrée (AES-GCM) dans IndexedDB pour permettre la connexion hors ligne
- Validation stricte des données côté backend (Zod), même si déjà validées côté client
- Journal d'activité pour toute action sensible (création/modification/suppression d'utilisateur)

## Architecture

Voir `docs/schema-bdd.md` et `docs/plan-sync.md` pour le détail du schéma de données et de la stratégie de synchronisation offline/online.

## Envoi de reçu (WhatsApp / SMS)

- **WhatsApp** : fonctionne immédiatement, sans configuration — ouvre un lien `wa.me` avec le message du reçu pré-rempli. Fonctionne même si la vente n'est pas encore synchronisée (le texte est généré depuis les données locales).
- **SMS** (Africa's Talking) : optionnel. Renseignez `AT_API_KEY` et `AT_USERNAME` (et `AT_SENDER_ID` si vous avez un expéditeur validé) dans `backend/.env`. Sans ces variables, le bouton SMS reste désactivé dans l'interface — aucune erreur, juste une fonctionnalité en moins. Nécessite que la vente soit déjà synchronisée avec le serveur (donc une connexion internet).

## Prochaine étape

MVP terminé. Prochaines étapes possibles (post-MVP, sur demande) : ordonnances et suivi patients, rapports avancés (export CSV/PDF, chiffre d'affaires par période), gestion multi-succursales (le champ `pharmacy_id` est déjà prévu partout dans le schéma).

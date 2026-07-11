<template>
  <LayoutPrincipal>
    <div class="entete-vue">
      <div>
        <h1>Rapports</h1>
        <p class="texte-attenue">Chiffre d'affaires, produits les plus vendus, valeur du stock.</p>
      </div>
      <button class="bouton bouton--secondaire" :disabled="chargementPdf" @click="telecharger">
        {{ chargementPdf ? 'Génération...' : '⬇ Télécharger le PDF' }}
      </button>
    </div>

    <div class="barre-filtres">
      <div class="bascule-periode">
        <button
          v-for="p in periodes"
          :key="p.valeur"
          :class="{ actif: periode === p.valeur }"
          @click="changerPeriode(p.valeur)"
        >
          {{ p.libelle }}
        </button>
      </div>
      <input v-model="date" type="date" @change="charger" />
    </div>

    <p v-if="erreur" class="message-erreur" role="alert">{{ erreur }}</p>

    <template v-if="rapport">
      <p class="libelle-periode">
        Du {{ formaterDate(rapport.debut) }} au {{ formaterDate(rapport.fin) }}
      </p>

      <div class="grille-cartes">
        <div class="carte carte-chiffre">
          <span class="etiquette">Chiffre d'affaires CDF</span>
          <strong>{{ formaterMontant(rapport.chiffreAffaires.CDF) }} CDF</strong>
        </div>
        <div class="carte carte-chiffre">
          <span class="etiquette">Chiffre d'affaires USD</span>
          <strong>{{ formaterMontant(rapport.chiffreAffaires.USD) }} USD</strong>
        </div>
        <div class="carte carte-chiffre carte-chiffre--accent">
          <span class="etiquette">CA total consolidé</span>
          <strong>{{ formaterMontant(rapport.chiffreAffairesTotalCdf) }} CDF</strong>
          <span class="sous-valeur">≈ {{ formaterMontant(rapport.chiffreAffairesTotalUsd) }} USD</span>
        </div>
        <div class="carte carte-chiffre" :class="rapport.beneficeCdf >= 0 ? 'carte-chiffre--positif' : 'carte-chiffre--negatif'">
          <span class="etiquette">Bénéfice estimé</span>
          <strong>{{ formaterMontant(rapport.beneficeCdf) }} CDF</strong>
          <span class="sous-valeur">≈ {{ formaterMontant(rapport.beneficeUsd) }} USD</span>
        </div>
        <div class="carte carte-chiffre">
          <span class="etiquette">Nombre de ventes</span>
          <strong>{{ rapport.nombreVentes }}</strong>
        </div>
        <div class="carte carte-chiffre">
          <span class="etiquette">Pertes (casse)</span>
          <strong>{{ formaterMontant(rapport.pertes.valeur_perte_cdf) }} CDF</strong>
        </div>
      </div>

      <p class="note-benefice">
        Le bénéfice est estimé à partir du prix d'achat renseigné sur chaque produit (recette − coût d'achat des articles vendus). S'il vous semble incorrect, vérifiez que le prix d'achat est bien renseigné pour vos produits dans le Stock.
      </p>

      <div class="grille-deux-colonnes">
        <div class="carte">
          <h2>Produits les plus vendus</h2>
          <table v-if="rapport.produitsPlusVendus.length > 0">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Qté</th>
                <th>CDF</th>
                <th>USD</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in rapport.produitsPlusVendus" :key="p.id">
                <td>{{ p.nom }}</td>
                <td>{{ p.quantite_vendue }}</td>
                <td>{{ formaterMontant(p.montant_cdf) }}</td>
                <td>{{ formaterMontant(p.montant_usd) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="etat-vide">Aucune vente sur cette période.</p>
        </div>

        <div class="carte">
          <h2>Produits les plus rentables</h2>
          <table v-if="rapport.produitsPlusRentables.length > 0">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Qté</th>
                <th>Bénéfice</th>
                <th>Marge</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in rapport.produitsPlusRentables" :key="p.id">
                <td>{{ p.nom }}</td>
                <td>{{ p.quantite_vendue }}</td>
                <td :class="{ 'valeur-negative': p.benefice_cdf < 0 }">{{ formaterMontant(p.benefice_cdf) }} CDF</td>
                <td :class="{ 'valeur-negative': p.marge_pourcent < 0 }">{{ p.marge_pourcent.toFixed(0) }}%</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="etat-vide">Aucune donnée sur cette période.</p>
        </div>
      </div>

      <div class="grille-deux-colonnes grille-deux-colonnes--stock">
        <div class="carte">
          <h2>Valeur du stock actuel</h2>
          <div class="ligne-info">
            <span>Au prix d'achat</span>
            <strong>{{ formaterMontant(rapport.valeurStock.valeur_achat_cdf) }} CDF</strong>
          </div>
          <div class="ligne-info">
            <span>Au prix de vente</span>
            <strong>{{ formaterMontant(rapport.valeurStock.valeur_vente_cdf) }} CDF</strong>
          </div>
          <p class="note-stock">
            Valorisation à la date du jour (indépendante de la période sélectionnée ci-dessus).
          </p>
        </div>

        <div class="carte">
          <h2>Pertes sur la période</h2>
          <div class="ligne-info">
            <span>Quantité perdue</span>
            <strong>{{ rapport.pertes.quantite_perdue }}</strong>
          </div>
          <div class="ligne-info">
            <span>Valeur (prix d'achat)</span>
            <strong>{{ formaterMontant(rapport.pertes.valeur_perte_cdf) }} CDF</strong>
          </div>
        </div>
      </div>
    </template>

    <p v-else-if="chargement" class="etat-vide">Chargement du rapport...</p>
  </LayoutPrincipal>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import LayoutPrincipal from '../components/communs/LayoutPrincipal.vue';
import { obtenirRapport, telechargerRapportPdf } from '../services/ventesApi.js';

const periodes = [
  { valeur: 'jour', libelle: 'Journalier' },
  { valeur: 'semaine', libelle: 'Hebdomadaire' },
  { valeur: 'mois', libelle: 'Mensuel' },
];

const periode = ref('jour');
const date = ref(new Date().toISOString().slice(0, 10));
const rapport = ref(null);
const chargement = ref(false);
const chargementPdf = ref(false);
const erreur = ref('');

onMounted(charger);

function changerPeriode(valeur) {
  periode.value = valeur;
  charger();
}

async function charger() {
  chargement.value = true;
  erreur.value = '';
  try {
    rapport.value = await obtenirRapport(periode.value, date.value);
  } catch (err) {
    erreur.value = err.response?.data?.erreur || 'Impossible de charger le rapport (connexion requise).';
  } finally {
    chargement.value = false;
  }
}

async function telecharger() {
  chargementPdf.value = true;
  erreur.value = '';
  try {
    await telechargerRapportPdf(periode.value, date.value);
  } catch (err) {
    erreur.value = "Impossible de générer le PDF (connexion requise).";
  } finally {
    chargementPdf.value = false;
  }
}

function formaterDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'long' });
}

function formaterMontant(montant) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(montant || 0));
}
</script>

<style scoped>
.entete-vue {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--espace-md);
  gap: var(--espace-md);
  flex-wrap: wrap;
}

.texte-attenue { color: var(--texte-secondaire); }

.barre-filtres {
  display: flex;
  align-items: center;
  gap: var(--espace-md);
  margin-bottom: var(--espace-md);
  flex-wrap: wrap;
}

.bascule-periode {
  display: flex;
  background: var(--fond-neutre);
  border-radius: 999px;
  padding: 3px;
}
.bascule-periode button {
  border: none;
  background: none;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--texte-secondaire);
}
.bascule-periode button.actif {
  background: var(--couleur-primaire);
  color: #fff;
}

.barre-filtres input[type="date"] {
  padding: 0.5rem 0.8rem;
  border: 1.5px solid var(--bordure);
  border-radius: var(--rayon);
  font-size: 0.9rem;
}

.libelle-periode {
  color: var(--texte-secondaire);
  font-size: 0.9rem;
  margin-bottom: var(--espace-md);
}

.grille-cartes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--espace-md);
  margin-bottom: var(--espace-lg);
}

.carte-chiffre {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border-left: 4px solid var(--couleur-primaire);
}
.carte-chiffre strong { font-size: 1.4rem; }
.carte-chiffre .sous-valeur { font-size: 0.85rem; color: var(--texte-secondaire); font-weight: 600; }

.carte-chiffre--accent { border-left-color: var(--couleur-accent); }
.carte-chiffre--positif { border-left-color: var(--couleur-succes); }
.carte-chiffre--positif strong { color: var(--couleur-succes); }
.carte-chiffre--negatif { border-left-color: var(--couleur-danger); }
.carte-chiffre--negatif strong { color: var(--couleur-danger); }

.note-benefice {
  font-size: 0.8rem;
  color: var(--texte-secondaire);
  background: var(--fond-neutre);
  border-radius: var(--rayon);
  padding: var(--espace-sm) var(--espace-md);
  margin: calc(-1 * var(--espace-md)) 0 var(--espace-lg);
}

.etiquette {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--texte-secondaire);
}

.grille-deux-colonnes {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: var(--espace-lg);
  align-items: start;
}
.grille-deux-colonnes--stock { margin-top: var(--espace-lg); grid-template-columns: 1fr 1fr; }

.grille-deux-colonnes h2 { font-size: 1rem; margin-bottom: var(--espace-md); }
.titre-secondaire { margin-top: var(--espace-lg); }

.valeur-negative { color: var(--couleur-danger); font-weight: 700; }

.ligne-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--bordure);
  font-size: 0.92rem;
}

.note-stock {
  font-size: 0.78rem;
  color: var(--texte-secondaire);
  margin-top: var(--espace-sm);
}

.etat-vide { text-align: center; color: var(--texte-secondaire); padding: var(--espace-lg); }

@media (max-width: 900px) {
  .grille-deux-colonnes { grid-template-columns: 1fr; }
}
</style>

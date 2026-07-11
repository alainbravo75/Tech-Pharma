import PDFDocument from 'pdfkit';

const LIBELLES_PERIODE = { jour: 'journalier', semaine: 'hebdomadaire', mois: 'mensuel' };

function formaterMontant(montant) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(montant || 0));
}

function formaterDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'long' });
}

/**
 * Génère le PDF et l'écrit directement dans le flux de réponse HTTP
 * (streaming, pas de fichier temporaire sur le disque — reste léger et
 * ne laisse pas de traces sur un vieux PC à l'espace disque limité).
 */
export function genererPdfRapport({ rapport, nomPharmacie, res }) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  // En-tête
  doc.fontSize(18).fillColor('#0f6e63').text(nomPharmacie || 'Pharmacie', { align: 'left' });
  doc.fontSize(13).fillColor('#1c2321').text(`Rapport ${LIBELLES_PERIODE[rapport.periode] || ''}`);
  doc
    .fontSize(9)
    .fillColor('#5b6663')
    .text(`Période du ${formaterDate(rapport.debut)} au ${formaterDate(rapport.fin)}`);
  doc.moveDown(1.2);

  ligneSeparatrice(doc);

  // Chiffre d'affaires
  doc.fontSize(12).fillColor('#1c2321').text('Chiffre d\'affaires', { underline: false });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#334155');
  doc.text(`Franc congolais (CDF) : ${formaterMontant(rapport.chiffreAffaires.CDF)} CDF`);
  doc.text(`Dollar américain (USD) : ${formaterMontant(rapport.chiffreAffaires.USD)} USD`);
  doc.moveDown(0.2);
  doc.font('Helvetica-Bold');
  doc.text(`Total consolidé : ${formaterMontant(rapport.chiffreAffairesTotalCdf)} CDF  (≈ ${formaterMontant(rapport.chiffreAffairesTotalUsd)} USD)`);
  doc.font('Helvetica');
  doc.text(`Nombre de ventes : ${rapport.nombreVentes}`);
  doc.moveDown(0.4);
  doc.fillColor(rapport.beneficeCdf >= 0 ? '#1a7d43' : '#b3261e');
  doc.font('Helvetica-Bold').text(
    `Bénéfice estimé : ${formaterMontant(rapport.beneficeCdf)} CDF  (≈ ${formaterMontant(rapport.beneficeUsd)} USD)`
  );
  doc.font('Helvetica').fillColor('#334155');
  doc.moveDown(1);

  ligneSeparatrice(doc);

  // Produits les plus vendus
  doc.fontSize(12).fillColor('#1c2321').text('Produits les plus vendus');
  doc.moveDown(0.4);

  if (rapport.produitsPlusVendus.length === 0) {
    doc.fontSize(10).fillColor('#5b6663').text('Aucune vente sur cette période.');
  } else {
    const colonnes = [220, 90, 100, 100];
    const yDepart = doc.y;
    doc.fontSize(9).fillColor('#5b6663');
    enteteTableau(doc, ['Produit', 'Quantité', 'Montant CDF', 'Montant USD'], colonnes);

    doc.fontSize(9.5).fillColor('#1c2321');
    for (const p of rapport.produitsPlusVendus) {
      ligneTableau(
        doc,
        [p.nom, String(p.quantite_vendue), formaterMontant(p.montant_cdf), formaterMontant(p.montant_usd)],
        colonnes
      );
    }
  }

  doc.moveDown(1);
  ligneSeparatrice(doc);

  // Produits les plus rentables
  doc.fontSize(12).fillColor('#1c2321').text('Produits les plus rentables');
  doc.moveDown(0.4);

  if (rapport.produitsPlusRentables.length === 0) {
    doc.fontSize(10).fillColor('#5b6663').text('Aucune donnée sur cette période.');
  } else {
    const colonnesRentab = [220, 90, 100, 100];
    doc.fontSize(9).fillColor('#5b6663');
    enteteTableau(doc, ['Produit', 'Qté', 'Bénéfice CDF', 'Marge %'], colonnesRentab);

    doc.fontSize(9.5).fillColor('#1c2321');
    for (const p of rapport.produitsPlusRentables) {
      ligneTableau(
        doc,
        [p.nom, String(p.quantite_vendue), formaterMontant(p.benefice_cdf), `${p.marge_pourcent.toFixed(0)}%`],
        colonnesRentab
      );
    }
  }

  doc.moveDown(1);
  ligneSeparatrice(doc);

  // Stock et pertes
  doc.fontSize(12).fillColor('#1c2321').text('Stock et pertes');
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#334155');
  doc.text(`Valeur du stock actuel (prix d'achat) : ${formaterMontant(rapport.valeurStock.valeur_achat_cdf)} CDF`);
  doc.text(`Valeur du stock actuel (prix de vente) : ${formaterMontant(rapport.valeurStock.valeur_vente_cdf)} CDF`);
  doc.moveDown(0.4);
  doc.text(`Quantité perdue (casse) sur la période : ${rapport.pertes.quantite_perdue}`);
  doc.text(`Valeur des pertes : ${formaterMontant(rapport.pertes.valeur_perte_cdf)} CDF`);

  doc.moveDown(1.5);
  doc
    .fontSize(8)
    .fillColor('#94a3b8')
    .text(`Généré le ${new Date().toLocaleString('fr-FR')}`, { align: 'right' });

  doc.end();
}

function ligneSeparatrice(doc) {
  doc
    .moveTo(doc.x, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor('#dde3e1')
    .stroke();
  doc.moveDown(0.6);
}

function enteteTableau(doc, textes, largeurs) {
  const xDepart = doc.x;
  let x = xDepart;
  textes.forEach((texte, i) => {
    doc.text(texte, x, doc.y, { width: largeurs[i], continued: false });
    x += largeurs[i];
  });
  doc.moveDown(0.3);
  ligneSeparatrice(doc);
}

function ligneTableau(doc, textes, largeurs) {
  const xDepart = doc.x;
  const yDepart = doc.y;
  let x = xDepart;
  textes.forEach((texte, i) => {
    doc.text(texte, x, yDepart, { width: largeurs[i] });
    x += largeurs[i];
  });
  doc.moveDown(0.4);
}

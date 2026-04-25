# Frontend — Documents

## Vue
Bibliothèque de tous les `documents` de l'agence (mandats, courriers, présentations, résiliations, fiches…).

## Filtres
- Par `kind`, par agent producteur, par date, par bien lié, par statut signature

## Détail document
- Aperçu inline (PDF embed)
- Métadonnées (qui, quand, lien bien/prospect)
- Actions :
  - Télécharger PDF / Word
  - Envoyer signature (Yousign) — si mandat draft
  - Versions précédentes (V2)
  - Partager (lien signed URL court)

## Bulk
- Export ZIP (sélection multiple)
- Archivage

## Sécurité
- Storage path : `{agency_id}/{kind}/{doc_id}.{ext}`
- Signed URLs 5 min, jamais public
- RBAC : `agent` voit ses docs + ceux liés à ses biens, manager+ voit tout

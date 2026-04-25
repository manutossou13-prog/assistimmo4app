---
name: generation_resiliation
description: Génère une lettre de résiliation conforme à un contrat (préavis, mentions, LRAR) à partir d'une ligne de charge ou de paramètres saisis.
agents: [gabriel, sarah]
inputs: [vendor, contract_ref, amount, last_renewal, termination_notice, reason]
outputs: [letter_pdf, letter_docx]
---

# Skill — generation_resiliation

## Champs obligatoires
- Coordonnées agence (expéditeur)
- Coordonnées fournisseur
- Référence contrat / numéro client
- Date d'entrée du contrat (si connue)
- Préavis applicable (jours/mois)
- Date de fin demandée (calculée)
- Motif (libre, optionnel — sauf clause)
- Mention LRAR

## Templates
Vivent dans `/templates/resiliations/` :
- `resiliation_assurance.md`
- `resiliation_saas.md`
- `resiliation_telecom.md`
- `resiliation_prestataire.md`
- `resiliation_loyer_pro.md`
- `resiliation_generique.md`

## Garde-fous
- **Validation humaine obligatoire** avant impression/envoi.
- Ne déclenche **jamais** d'envoi automatique.
- Vérification du préavis contractuel (si saisi).
- Ne fait pas de conseil juridique : signale "à valider par un pro" sur cas complexes.

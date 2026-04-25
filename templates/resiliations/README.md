# Templates — Résiliations

## Fichiers
- `resiliation_assurance.md`
- `resiliation_saas.md`
- `resiliation_telecom.md`
- `resiliation_prestataire.md`
- `resiliation_loyer_pro.md`
- `resiliation_generique.md`

## Structure
1. Coordonnées agence
2. Coordonnées fournisseur
3. Référence contrat
4. Objet : Résiliation du contrat n°…
5. Corps : motif + préavis + date de fin demandée
6. Mention LRAR + bordereau
7. Demande de confirmation écrite
8. Signature dirigeant

## Variables
`{{ vendor }}`, `{{ contract_ref }}`, `{{ start_date }}`, `{{ notice_months }}`, `{{ end_date }}`, `{{ reason }}`, `{{ amount_monthly }}`

## Garde-fous
- Validation humaine **obligatoire** avant impression.
- Aucun envoi automatique.
- Si clause complexe → escalade à un pro signalée dans le rapport.

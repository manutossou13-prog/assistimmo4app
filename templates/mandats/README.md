# Templates — Mandats

Templates Hoguet validés par avocat partenaire (à signer avant prod).

## Fichiers à créer
- `mandat_simple.md` — mandat de vente non exclusif
- `mandat_exclusif.md` — mandat exclusif (3 mois min, faculté dénonciation LRAR)
- `mandat_semi_exclusif.md` — mandat semi-exclusif à terme
- `avenant.md` — avenant (prorogation / modification prix / honoraires)
- `fiche_renseignements_vendeur.md`
- `checklist_dossier_mandat.md`

## Variables Mustache standardisées
`{{ agency.name }}`, `{{ agency.carte_t }}`, `{{ agency.address }}`,
`{{ negociator.full_name }}`,
`{{ sellers[0].full_name }}`, `{{ sellers[0].id_ref }}`,
`{{ property.address }}`, `{{ property.designation }}`,
`{{ mandate.type }}`, `{{ mandate.price | euro }}`,
`{{ mandate.commission_amount | euro }}`, `{{ mandate.commission_payer }}`,
`{{ mandate.start_date }}`, `{{ mandate.end_date }}`,
`{{ mandate.registry_number }}`

## Mentions obligatoires (loi Hoguet)
- Identification parties
- Désignation du bien (cadastre + adresse)
- Prix de mise en vente
- Honoraires TTC + qui les paye
- Durée
- Faculté de dénonciation
- Inscription au registre des mandats
- Carte T agence

## Garde-fous
- Validation juridique avant prod commerciale.
- Versioning par template (champ `template_version` dans frontmatter).

# Templates — Comptes rendus

## Fichiers
- `cr_visite_acheteur.md`
- `cr_visite_vendeur.md`
- `cr_estimation.md`
- `cr_reunion_equipe.md`
- `cr_appel_client.md`

## Structure type
- Contexte (date, lieu, participants, objectif)
- Points clés
- Intentions exprimées
- Objections / freins
- Engagements pris (qui/quoi/quand)
- Email retour client (draft)
- Tâches à créer
- Vigilance / signaux faibles
- Prochain rdv suggéré

## Variables
`{{ meeting.date }}`, `{{ meeting.kind }}`, `{{ participants }}`, `{{ property.address }}`, `{{ negociator }}`

## Garde-fous
- Filtrer les éléments perso (santé, situation conjugale) avant export client.
- Email retour **toujours en draft**.

# Frontend — CRM (prospects)

## Vue
Tableau filtré des `prospects` avec :
- Colonnes : nom, type, source, dernier contact, owner, score, actions
- Filtres : type, source, statut consentement, owner, dernière activité

## Détail prospect
- Identité + coordonnées (selon RBAC)
- Consentements RGPD (email/SMS/téléphone) avec date
- Biens d'intérêt (N-N avec `properties`)
- Historique communications (réuni avec `messages`)
- Notes internes (free text)
- Tâches liées

## Actions
- "Préparer un message" → SARAH
- "Programmer une visite" → calendar + LÉA pour CR
- "Marquer comme client perdu" (avec motif)

## Bulk actions
- Export CSV (RBAC : admin/manager)
- Tagging
- Création séquence relance (V2)

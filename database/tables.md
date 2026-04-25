# Database — Tables (récap)

> Liste exhaustive des tables. Spec colonnes dans `docs/DATA_MODEL.md`.

## Tenant & users
- `organizations` — groupes immobiliers (optionnel)
- `agencies` — agences (cœur tenant)
- `users` — comptes (Supabase auth)
- `memberships` — user × agency × role

## Métier cœur
- `properties` — biens
- `prospects` — vendeurs/acheteurs/locataires
- `mandates` — mandats
- `documents` — docs générés (PDF, Word, MD)
- `tasks` — to-do liées à un bien/prospect
- `messages` — communications (email, SMS, courrier, …)
- `meeting_reports` — comptes rendus visites/réunions

## Communication & contenu
- `presentations` — decks (EMMA)
- `social_posts` — posts (STELLA)
- `videos` — scripts/storyboards (FRANCK)

## Pilotage & RH & finance
- `kpi_records` — snapshots KPI (HUGO)
- `jobs` — postes ouverts (V3)
- `candidates` — candidatures (INÈS)
- `financial_records` — lignes financières (GABRIEL)

## Plateforme
- `agent_runs` — exécutions OSCAR
- `agent_steps` — étapes par run
- `audit_logs` — journal immutable
- `feature_flags` — modules activés par tenant
- `quotas` — limites par plan
- `subscriptions` — sync Stripe

## Triggers automatiques
- `set_updated_at` (avant chaque update)
- `set_agency_id_from_jwt` (en insert sur tables tenant si non fourni)
- `audit_critical_actions` (mandate.signed, document.deleted, etc.)

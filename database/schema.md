# Database — Schema

> Voir `docs/DATA_MODEL.md` pour la spec complète des tables. Ce fichier décrit l'organisation et le pipeline de migration.

## Stack
- **Postgres** (Supabase)
- Extensions : `uuid-ossp`, `pgvector`, `pg_trgm`, `pgcrypto`
- **RLS** activée sur toutes les tables tenant
- Migrations gérées via **Supabase CLI** (`supabase/migrations/*.sql`)

## Convention nommage
- snake_case pour tables et colonnes
- Pluriel pour les tables (`properties`, `mandates`)
- FK : `<table_singulier>_id` (ex. `property_id`, `agency_id`)
- Toute table tenant a `agency_id uuid not null references agencies(id)`
- Toute table a `created_at`, `updated_at` (trigger auto)

## Pipeline migration
1. Migration créée localement → committée
2. CI lint + test sur DB éphémère
3. Apply staging → tests E2E
4. Apply prod (off-peak)

## Types ENUM communs
```sql
create type user_role as enum ('admin','manager','agent','assistant');
create type property_status as enum ('lead','prospect','mandate','sold','withdrawn');
create type property_type as enum ('apartment','house','land','commercial');
create type mandate_type as enum ('simple','exclusif','semi_exclusif');
create type mandate_status as enum ('draft','signed','active','expired','terminated');
create type document_kind as enum ('mandate','courrier','email','presentation','sms','resiliation','fiche','autre');
create type message_channel as enum ('email','sms','whatsapp','linkedin','courrier','appel');
create type meeting_kind as enum ('visit_buyer','visit_seller','estimation','team','client_call');
create type social_channel as enum ('linkedin','instagram','facebook','tiktok','youtube_short');
create type run_status as enum ('running','done','failed','needs_input');
```

## Indices critiques
- `properties (agency_id, status, city)`
- `prospects (agency_id, type, owner_user_id)`
- `mandates (agency_id, status, end_date)`
- `agent_runs (agency_id, started_at desc)`
- pgvector `properties.embedding` (cosine)

## Vector search (V2)
Embedding par bien (description + adresse + équipements) pour recherche sémantique :
> "Maison 4 chambres avec jardin et garage proche école 15e" → top biens similaires

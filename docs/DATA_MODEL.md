# DATA_MODEL — Schéma de base de données

> Postgres (Supabase). Toutes les tables ont `id uuid pk`, `created_at`, `updated_at`, et `agency_id` indexé. Les RLS isolent par `agency_id`.

## Vue d'ensemble (ER simplifié)

```
organizations 1─N agencies 1─N users (via memberships)
agencies      1─N properties 1─N mandates 1─N documents
agencies      1─N prospects  N─N properties (interest)
properties    1─N visits 1─1 meeting_reports
agencies      1─N social_posts / videos / presentations
agencies      1─N kpi_records (snapshot par période)
agencies      1─N candidates   1─N candidate_notes
agencies      1─N financial_records (charges, revenus)
agencies      1─N agent_runs   1─N agent_steps
all tables    →  audit_logs (immuable)
```

## Tables

### organizations
| col | type | note |
|---|---|---|
| id | uuid | PK |
| name | text | groupe immobilier |
| stripe_customer_id | text | facturation consolidée |
| created_at | timestamptz | |

### agencies
| col | type | note |
|---|---|---|
| id | uuid | PK |
| organization_id | uuid | FK nullable |
| name | text | |
| siren | text | |
| carte_t_number | text | loi Hoguet |
| address, city, zipcode | text | |
| brand_settings | jsonb | logo, palette, ton |
| modules_enabled | text[] | ex. `['prospection','mandats']` |
| stripe_subscription_id | text | |

### users
| col | type | note |
|---|---|---|
| id | uuid | = auth.users.id Supabase |
| email, full_name, avatar_url | text | |
| locale | text | défaut `fr` |

### memberships
| col | type | note |
|---|---|---|
| user_id | uuid | FK |
| agency_id | uuid | FK |
| role | enum | `admin\|manager\|agent\|assistant` |
| PRIMARY KEY | (user_id, agency_id) | |

### properties (biens)
| col | type | note |
|---|---|---|
| id | uuid | PK |
| agency_id | uuid | FK |
| owner_user_id | uuid | négociateur référent |
| status | enum | `lead\|prospect\|mandate\|sold\|withdrawn` |
| type | enum | `apartment\|house\|land\|commercial` |
| address, city, zipcode | text | |
| lat, lng | numeric | |
| surface_habitable | numeric | m² |
| surface_terrain | numeric | m² |
| rooms | int | |
| floor | int | |
| dpe_letter | char(1) | A→G |
| ges_letter | char(1) | |
| dpe_date | date | |
| price | numeric | EUR |
| source_url | text | annonce d'origine |
| confidence_score | int | 0-100, calculé par TOM |
| metadata | jsonb | photos, équipements, … |

### prospects
| col | type | note |
|---|---|---|
| id | uuid | PK |
| agency_id | uuid | FK |
| type | enum | `seller\|buyer\|tenant\|landlord` |
| first_name, last_name | text | |
| email, phone | text | |
| consent_email, consent_sms, consent_phone | bool | RGPD |
| consent_date | timestamptz | |
| source | text | "boîtage", "site", "sphère"… |
| notes | text | |
| owner_user_id | uuid | |

### mandates
| col | type | note |
|---|---|---|
| id | uuid | PK |
| agency_id | uuid | FK |
| property_id | uuid | FK |
| seller_prospect_id | uuid | FK |
| type | enum | `simple\|exclusif\|semi_exclusif` |
| start_date, end_date | date | |
| price | numeric | mise en vente |
| commission | numeric | honoraires |
| commission_payer | enum | `seller\|buyer` |
| status | enum | `draft\|signed\|active\|expired\|terminated` |
| document_id | uuid | FK vers documents |
| registry_number | text | n° au registre Hoguet |
| signed_at | timestamptz | |
| yousign_envelope_id | text | |

### documents
| col | type | note |
|---|---|---|
| id | uuid | PK |
| agency_id | uuid | FK |
| owner_user_id | uuid | |
| kind | enum | `mandate\|courrier\|email\|presentation\|sms\|resiliation\|fiche\|autre` |
| title | text | |
| storage_path | text | clé S3/Supabase |
| format | enum | `pdf\|docx\|md\|html\|txt` |
| metadata | jsonb | |
| linked_property_id | uuid | nullable |
| linked_prospect_id | uuid | nullable |

### tasks
| col | type | note |
|---|---|---|
| id | uuid | PK |
| agency_id | uuid | FK |
| assignee_user_id | uuid | |
| linked_property_id, linked_prospect_id | uuid | nullable |
| title | text | |
| due_at | timestamptz | |
| status | enum | `open\|done\|cancelled` |
| created_by_agent | text | slug agent qui l'a créée (si IA) |

### messages
| col | type | note |
|---|---|---|
| id | uuid | PK |
| agency_id | uuid | FK |
| channel | enum | `email\|sms\|whatsapp\|linkedin\|courrier\|appel` |
| direction | enum | `outbound\|inbound` |
| linked_prospect_id, linked_property_id | uuid | |
| body | text | |
| status | enum | `draft\|sent\|delivered\|read\|failed` |
| sent_at | timestamptz | |

### meeting_reports
| col | type | note |
|---|---|---|
| id | uuid | PK |
| agency_id | uuid | FK |
| kind | enum | `visit_buyer\|visit_seller\|estimation\|team\|client_call` |
| linked_property_id | uuid | |
| participants | jsonb | [{name, role}] |
| audio_storage_path | text | nullable |
| transcript | text | |
| summary_md | text | |
| next_actions | jsonb | |

### presentations
| col | type | note |
|---|---|---|
| id | uuid | PK |
| agency_id | uuid | FK |
| topic, audience, format | text | |
| slides_md | text | export markdown |
| pdf_path | text | |

### social_posts
| col | type | note |
|---|---|---|
| id | uuid | PK |
| agency_id | uuid | FK |
| channel | enum | `linkedin\|instagram\|facebook\|tiktok\|youtube_short` |
| body, hashtags | text | |
| visual_prompts | jsonb | |
| scheduled_at | timestamptz | |
| status | enum | `draft\|approved\|published\|archived` |
| linked_property_id | uuid | nullable |

### videos
| col | type | note |
|---|---|---|
| id | uuid | PK |
| agency_id | uuid | FK |
| kind | enum | `bien\|estimation\|recrutement\|temoignage\|avant_apres` |
| script_md | text | |
| storyboard | jsonb | |
| linked_property_id | uuid | nullable |

### kpi_records
| col | type | note |
|---|---|---|
| id | uuid | PK |
| agency_id | uuid | FK |
| user_id | uuid | nullable (KPI individuel ou collectif) |
| period_start, period_end | date | |
| metrics | jsonb | { mandats, estimations, ca, transformations, … } |

### candidates (recrutement)
| col | type | note |
|---|---|---|
| id | uuid | PK |
| agency_id | uuid | FK |
| job_id | uuid | FK vers jobs (à créer) |
| full_name, email, phone | text | |
| linkedin_url, cv_storage_path | text | |
| score | int | 0-100 |
| score_breakdown | jsonb | |
| status | enum | `new\|contacted\|interview\|offered\|hired\|rejected` |

### financial_records
| col | type | note |
|---|---|---|
| id | uuid | PK |
| agency_id | uuid | FK |
| period | date | mois |
| kind | enum | `revenue\|charge_fixe\|charge_variable\|facture_agent\|prestataire` |
| label, vendor | text | |
| amount | numeric | |
| category | text | |
| optimization_flag | bool | |
| source_file_path | text | Excel d'origine |

### agent_runs
| col | type | note |
|---|---|---|
| id | uuid | PK |
| agency_id, user_id | uuid | |
| intent | text | |
| plan | jsonb | { agents: [...], chain: "seq\|par" } |
| status | enum | `running\|done\|failed\|needs_input` |
| started_at, ended_at | timestamptz | |
| total_tokens, total_cost_eur | numeric | |

### agent_steps
| col | type | note |
|---|---|---|
| id | uuid | PK |
| run_id | uuid | FK |
| agent_slug | text | |
| input, output | jsonb | |
| duration_ms | int | |
| error | text | nullable |

### audit_logs
| col | type | note |
|---|---|---|
| id | bigserial | PK |
| agency_id, user_id | uuid | |
| action | text | ex. `mandate.signed` |
| target_table, target_id | text/uuid | |
| ip, user_agent | text | |
| created_at | timestamptz | |
| **Immuable** : aucune update, aucun delete (RLS bloquant) | | |

## Indices recommandés

- `properties (agency_id, status, city)`
- `prospects (agency_id, type, owner_user_id)`
- `mandates (agency_id, status, end_date)`
- `agent_runs (agency_id, started_at desc)`
- pgvector sur `properties.embedding` (recherche sémantique de bien)

## RLS — exemple

```sql
create policy "tenant_isolation" on properties
  for all
  using (agency_id = (auth.jwt() ->> 'agency_id')::uuid);
```

À répliquer sur **toutes** les tables ayant `agency_id`.

# Workflow — `workflow_kpi`

> Pilotage KPI agence. Agent : **HUGO**.

## Trigger
- "Comment va l'agence ce mois ?", "Ranking négos", "Prépare la réunion commerciale"

## Inputs
- `period`, `team_or_user`, `data_source`

## Étapes

```mermaid
flowchart LR
  A[Demande] --> S[Source: CRM / Excel / Airtable]
  S --> H[HUGO: ingestion + calc]
  H --> D[Dashboard JSON]
  H --> R[Weekly/Monthly report]
  H --> AL[Alerts]
  R --> E[EMMA: deck si besoin]
```

## Outputs
- `kpi_records` (snapshot)
- Dashboard widgets
- Alertes
- Plan de réunion + actions correctives

## Validation humaine
Non.

## Persistence
- `kpi_records` (insert par période)

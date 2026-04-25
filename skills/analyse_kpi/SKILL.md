---
name: analyse_kpi
description: Ingestion CRM/Excel/Airtable, calcul des KPI immobiliers (mandats, estimations, transformations, CA), comparaison vs objectifs, détection d'écarts.
agents: [hugo]
inputs: [period, data_source, targets]
outputs: [dashboard, weekly_summary, alerts, action_plan]
---

# Skill — analyse_kpi

## KPI calculés
- Mandats rentrés (par type + secteur)
- Estimations réalisées
- Compromis · ventes · CA encaissé
- Taux transformation (estim → mandat → vente)
- Pipeline : âge moyen, dossiers dormants
- Activité prospection (boîtages, appels)
- Ranking individuel

## Sources
- CRM Apimo / Hektor (V2)
- Upload Excel / CSV
- Google Sheets / Airtable (V3)

## Algos
- Tendances : moyenne mobile 4 semaines
- Alertes : écart >15 % vs N-1 ou vs cible
- Détection dossiers dormants (>14j sans activité)

## Output
```json
{
  "period": "2026-03",
  "tiles": {
    "mandates": { "value": 8, "target": 10, "trend_pct": -20 },
    "ca_encaisse": { "value": 142000, "trend_pct": 8 }
  },
  "alerts": [...],
  "ranking": [...]
}
```

## Garde-fous
- Pas de chiffre inventé (donnée manquante = signalée).
- Anonymisation possible pour rapports investisseurs.

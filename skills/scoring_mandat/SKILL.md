---
name: scoring_mandat
description: Score 0-100 d'opportunité commerciale d'un mandat à partir de la fiabilité d'adresse + signaux secondaires (prix vs marché, DPE, ancienneté annonce, agence concurrente).
agents: [tom, hugo]
inputs: [property_data, market_data]
outputs: [score, priority, recommendation]
---

# Skill — scoring_mandat

## Composantes du score
| Critère | Poids |
|---|---|
| Fiabilité adresse (sortie `recherche_adresse`) | 35 % |
| Cohérence prix vs DVF (médiane secteur) | 20 % |
| DPE (rénovation = lever) | 10 % |
| Ancienneté annonce (>30j = vendeur frustré) | 15 % |
| Multi-listing (visibilité = mandat simple = opportunité d'aller en exclu) | 10 % |
| Historique interne (déjà tenté ?) | 10 % |

## Sortie
```json
{
  "score": 78,
  "priority": "haute",
  "recommendation": "boitage_immediat",
  "factors": [
    {"name": "address_confidence", "value": 84, "weight": 0.35},
    {"name": "price_vs_dvf", "value": 65, "weight": 0.20}
  ]
}
```

## Limites
- Données DVF en retard de 6-12 mois.
- Score à recalibrer trimestriellement par marché.

---
name: analyse_financiere
description: Catégorise les charges depuis un Excel/CSV, détecte les anomalies, propose des optimisations chiffrées, projette la trésorerie.
agents: [gabriel]
inputs: [excel_or_csv, period, contracts, agent_billing_rules]
outputs: [synthese, charges_table, alerts, recommendations, prevision_treso]
---

# Skill — analyse_financiere

## Pipeline
1. Lecture Excel/CSV → normalisation colonnes (montant, fournisseur, date, libellé).
2. Catégorisation auto (LLM + dictionnaire prédéfini).
3. Détection anomalies : pic >2σ, doublons fournisseurs, charges sous-utilisées.
4. Calcul KPI : taux marge, charge fixe vs variable, ratio charges/CA.
5. Recommandations chiffrées : économie annuelle estimée par action.
6. Projection trésorerie 3 mois (régression simple sur historique + saisonnalité).

## Catégories standard
Loyer · télécom · SaaS · marketing · véhicule · prestataires · assurance · banque · sous-traitance · personnel · fiscalité · autres.

## Output (extrait)
```json
{
  "synthese": "...",
  "charges_table": [...],
  "alerts": [...],
  "recommendations": [
    { "action": "Résilier ProBox SaaS", "saving_year": 1068, "effort": "low" }
  ],
  "prevision_treso": [218000, 225000, 232000]
}
```

## Garde-fous
- Pas de conseil fiscal/comptable réglementé.
- Validation humaine avant toute action contractuelle.
- Données chiffrées au repos (Postgres TLS + pgcrypto).

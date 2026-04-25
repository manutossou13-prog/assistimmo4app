---
name: recherche_adresse
description: Croise DPE/ADEME, DVF, cadastre, Google Maps, Street View pour estimer l'adresse probable d'un bien à partir de caractéristiques d'annonce.
agents: [tom]
inputs: [structured_listing]
outputs: [candidates_with_scores, justification]
---

# Skill — recherche_adresse

## Sources publiques
- **ADEME / DPE** — `api.koumoul.com/data-fair/api/v1` (DPE par commune + caractéristiques)
- **DVF** — `api.dvf.etalab.gouv.fr` (mutations foncières par parcelle)
- **Cadastre** — `apicarto.ign.fr/api/cadastre`
- **Adresse** — `api-adresse.data.gouv.fr` (BAN)
- **Google Maps Geocoding + Street View Static API**
- **IGN Géoportail**

## Pipeline
1. Filtrer DPE par commune + lettre + date (± 6 mois) + surface (± 2 m²) → ensemble réduit.
2. Géocoder + intersect cadastre → parcelles candidates.
3. Vérification visuelle Street View vs photos annonce (vision LLM) → score similarité.
4. Cross-check DVF (transaction récente cohérente avec mise en vente ?).
5. Pondération multi-sources → top 3-5 candidats.

## Garde-fous
- Aucune affirmation à 100 %.
- Respect robots.txt et CGU des sites.
- Pas d'identification du propriétaire.

## Output
```json
{
  "candidates": [
    { "address": "12 rue X, 75015 Paris", "score": 84, "sources": ["dpe","streetview","dvf"], "explanation": "..." }
  ]
}
```

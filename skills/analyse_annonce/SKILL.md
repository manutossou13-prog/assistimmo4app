---
name: analyse_annonce
description: Extrait des données structurées (surface, DPE, prix, type, équipements) depuis une URL ou un texte d'annonce immobilière. Utilisée par TOM.
agents: [tom]
inputs: [annonce_url | annonce_text | annonce_images]
outputs: [structured_listing]
---

# Skill — analyse_annonce

## Rôle
Extraire fiable et structuré les caractéristiques d'une annonce immobilière (URL, texte, images).

## Sources
SeLoger, LeBonCoin, PAP, Bien'ici, Logic-Immo, Avendrealouer, sites d'agences.

## Pipeline
1. URL → fetch (UA legit, robots.txt) ; sinon demander texte.
2. Texte → extraction JSON Schema via LLM.
3. Images → vision LLM (équipements, état, pièces).
4. Fusion + score de confiance par champ.

## Output (extrait)
```json
{
  "type": "apartment",
  "city": "Paris",
  "zipcode": "75015",
  "surface_habitable": 62,
  "rooms": 3,
  "floor": 4,
  "dpe_letter": "D",
  "ges_letter": "D",
  "dpe_date": "2023-07-15",
  "price": 690000,
  "features": ["balcon","parquet"],
  "confidence_per_field": { "surface_habitable": 0.95 }
}
```

## Limites
- Sites protégés Cloudflare → fallback manuel.
- Description trop vague → confiance basse signalée.

## Évolutions
- Auto-detection source.
- Watch des modifs annonce.

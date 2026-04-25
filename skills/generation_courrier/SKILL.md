---
name: generation_courrier
description: Génère des courriers commerciaux ou administratifs (boîtage, relance, résiliation, suivi) à partir de templates et d'un brief.
agents: [sarah, gabriel]
inputs: [type, target, objective, tone, brand_voice]
outputs: [letter_md, pdf, docx, variants]
---

# Skill — generation_courrier

## Types
- Boîtage (prospection vendeur)
- Relance (vendeur, ancien client)
- Suivi (post-visite, post-estimation)
- Résiliation (utilisé par GABRIEL)
- Mise en demeure douce (impayés)

## Frameworks copy
AIDA · PAS · BAB · FAB · Hook-Story-Offer

## Variantes auto
- courte (≤ 60 mots)
- longue (storytelling)
- premium (haut de gamme)
- directe (action immédiate)
- douce (relation)

## Templates
Vivent dans `/templates/courriers/` (boîtage, relance, expirés, ancien client) et `/templates/resiliations/` (pour GABRIEL).

## Garde-fous
- Pas de jargon creux.
- Pas de promesse chiffrée non sourcée.
- Mention canal légal (postal vs SMS vs email B2C).

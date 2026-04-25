---
name: generation_script_appel
description: Produit un script d'appel structuré (ouverture, qualification, objections, closing) adapté au contexte (vendeur, expirés, ancien client, candidat).
agents: [sarah, ines]
inputs: [target, objective, tone, context]
outputs: [script_md, objections_handling, closing_options]
---

# Skill — generation_script_appel

## Structure
1. **Ouverture** (≤ 10 sec) — accroche claire, présentation, raison de l'appel
2. **Qualification** (questions ouvertes)
3. **Découverte besoin / freins**
4. **Pitch** adapté à la découverte
5. **Objections** (top 5 préparées)
6. **Closing** : options selon le niveau d'engagement

## Objections types (immobilier)
- "Je ne suis pas pressé" · "J'ai déjà une agence" · "Vos honoraires sont chers" · "Je vais essayer en direct" · "Le marché est mauvais"

## Garde-fous
- **Bloctel** : rappeler la vérification obligatoire pour appels B2C.
- Pas de pression abusive.
- Toujours laisser sortie de courtoisie.

## Format
```
> 📞 Script — Relance vendeur expiré (3 min)
[Ouverture] ...
[Qualification] ...
[Pitch] ...
[Objection 1] ...
[Closing A — RDV] ...
```

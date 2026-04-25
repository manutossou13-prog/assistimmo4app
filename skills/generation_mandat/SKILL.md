---
name: generation_mandat
description: Génère un mandat de vente (simple, exclusif, semi-exclusif) ou un avenant à partir d'un template loi Hoguet, avec contrôle de complétude et préparation Yousign.
agents: [nora]
inputs: [property, sellers, mandate_type, price, commission, duration]
outputs: [pdf, docx, conformity_report, registry_entry]
---

# Skill — generation_mandat

## Templates
Vivent dans `/templates/mandats/` :
- `mandat_simple.md`
- `mandat_exclusif.md`
- `mandat_semi_exclusif.md`
- `avenant.md`

## Pipeline
1. Charger le template approprié.
2. Injecter les variables (Mustache/Handlebars).
3. Vérifier mentions obligatoires Hoguet :
   - Identification parties · désignation bien · prix · honoraires + payeur · durée · faculté de dénonciation · inscription au registre.
4. Générer PDF (Puppeteer + CSS print) + DOCX (`docx` lib).
5. Attribuer numéro de registre séquentiel.
6. Status `draft` → en attente validation humaine.

## Conformity report
```
✅ Mentions obligatoires : OK
⚠ Pièces : DPE manquant
📋 Registre #2026-0042 réservé
```

## Yousign
Sur clic "Envoyer signature" :
- Création envelope avec position champs signature
- Niveau eIDAS avancé minimum
- Webhook callback pour `signed_at`

## Limites
- Modèles à valider par avocat partenaire avant prod.
- Pas de signature manuscrite scannée.

---
name: generation_presentation
description: Produit un deck slide-par-slide (markdown structuré) avec speaker notes, prêt à exporter PDF/PPTX/Gamma.
agents: [emma]
inputs: [topic, audience, objective, duration_minutes, data_sources]
outputs: [slides_md, speaker_notes, visual_prompts, pdf]
---

# Skill — generation_presentation

## Structures recommandées
- **SCQA** (pitch)
- **Pyramide de Minto** (exec)
- **Before/After/Bridge**
- **5-slide pitch** (investisseur)

## Format slide_md
```markdown
## Slide 1 — Titre auto-portant
[Layout] 2 colonnes — image à droite
[Visuel] prompt → "appartement parisien 15e, lumière naturelle, 16:9"
[Body]
- Bullet 1 complet
- Bullet 2 complet
[Notes orateur] ...
[Durée] 60s
```

## Règle lisibilité (héritée Présentateur NAIOM)
- Pas d'acronyme nu première occurrence
- Body obligatoire sur slides data-viz
- Verdict explicite après chaque chart
- Vocabulaire accessible (pas de TL;DR)

## Export
- PDF (Puppeteer)
- PPTX (V2)
- Gamma export (markdown compatible)

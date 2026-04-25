---
name: analyse_cv
description: Parse un CV (PDF, Word, image, URL LinkedIn), score le candidat vs un profil cible, produit un breakdown explicite et une grille d'entretien.
agents: [ines]
inputs: [cv_file | linkedin_url, job_target, ideal_profile]
outputs: [parsed_cv, score, breakdown, interview_kit]
---

# Skill — analyse_cv

## Parsing
- PDF → texte (pdf-parse) puis structuration LLM
- Word → mammoth + LLM
- Image → vision LLM
- LinkedIn URL → fetch profil public (respect CGU)

## Critères de score
1. Adéquation expérience (sectorielle + ancienneté)
2. Compétences vs job target
3. Mobilité géographique
4. Adéquation culture/valeurs (signaux faibles)
5. Présentation CV (clarté, chiffrage)

## Anti-discrimination
**Filtrage obligatoire** des 25 critères interdits :
- Ne jamais utiliser dans le score : âge, sexe, origine, état civil, photo, adresse exacte, nom de famille marqueur, etc.
- Audit log si l'utilisateur tente d'imposer un critère illégal.

## Output
```json
{
  "score_global": 78,
  "breakdown": {
    "experience_immo": 85,
    "competences": 75,
    "mobilite": 80,
    "culture": 70,
    "presentation_cv": 80
  },
  "strengths": [...],
  "to_explore": [...],
  "interview_kit": { "questions": [...], "grille": {...} }
}
```

## Garde-fous
- Conservation 2 ans max (RGPD).
- Validation humaine **obligatoire** avant proposition d'embauche.

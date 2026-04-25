# Workflow — `workflow_recrutement`

> Recrutement immobilier de bout en bout. Agent : **INÈS** (+ STELLA + FRANCK).

## Trigger
- "Fiche de poste pour…", "Score ce CV", "Campagne recrutement négo"

## Étapes

```mermaid
flowchart LR
  A[Brief poste] --> I[INÈS: fiche de poste]
  I --> P[Posts STELLA + Vidéo FRANCK]
  P --> V[Validation humaine]
  V --> O[Publication]
  O --> CV[Réception CV]
  CV --> SC[INÈS: scoring]
  SC --> KIT[Grille entretien + questions]
  KIT --> H[Décision humaine]
```

## Outputs
- `candidates` (insert + update)
- `documents` (fiches de poste, grilles d'entretien)
- `social_posts`, `videos` (recrutement)

## Validation humaine
**Obligatoire** sur :
- Publication des posts
- Décision finale d'embauche
- Toute fiche de poste publique
- Filtrage anti-discrimination automatique sur input ET output

## Persistence
- `candidates`, `documents`, `social_posts`, `videos`

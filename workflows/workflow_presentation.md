# Workflow — `workflow_presentation`

> Générer un deck de présentation. Agent : **EMMA** (+ HUGO pour data, FRANCK/STELLA pour visuels).

## Trigger
- "Fais un deck pour…", "Pitch pour rdv estimation", "Support de réunion équipe"

## Inputs
- `topic`, `audience`, `objective`, `duration_minutes`
- `data_sources` (HUGO si KPI, NORA si mandat, fiches bien)

## Étapes

```mermaid
flowchart LR
  A[Demande deck] --> H{Data needed?}
  H -->|oui| D[HUGO: KPI fetch]
  H -->|non| E[EMMA: structure]
  D --> E
  E --> S[slides_md]
  S --> V[FRANCK/STELLA: visual prompts]
  V --> P[PDF/PPTX/Gamma export]
```

## Outputs
- `slides_md`, `pdf`, `gamma_export`
- `speaker_notes`, `visual_prompts`
- Persisté dans `presentations`

## Validation humaine
Non obligatoire (interne). Si présentation client → relire.

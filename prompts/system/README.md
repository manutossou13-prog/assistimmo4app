# Prompts — System

> Prompts système globaux : règles transverses appliquées à tous les agents.

## Fichiers attendus
- `global_rules.md` — règles plateforme (français, validation humaine, anti-hallucination, format de sortie)
- `legal_disclaimers.md` — disclaimers à injecter dans les sorties sensibles
- `brand_voice_default.md` — voix par défaut si l'agence n'a pas configuré la sienne
- `safety.md` — refus de prompts hors-scope, anti-discrimination, RGPD

## Convention
Chaque prompt a un frontmatter :
```yaml
---
name: global_rules
version: 1.0.0
applies_to: ["*"]      # ou liste d'agents
---
```

## Composition
Les system prompts d'agents = `global_rules` + `agent_specific` + `brand_voice` (concaténés au build).

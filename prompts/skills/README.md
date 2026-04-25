# Prompts — Skills

> Prompts spécifiques à chaque skill (capacité réutilisable).

## Convention
- 1 fichier par skill : nom = nom de la skill.
- Frontmatter : `name`, `version`, `model`, `temperature`, `output_schema_ref`.

## Particularité
Les skills doivent retourner du **JSON structuré** (validé contre un JSON Schema dans `skills/<slug>/schema.json`). Les prompts incluent donc une instruction stricte de format avec exemple.

## Tests
Tests unitaires sur le schéma de sortie (Vitest) + golden inputs/outputs.

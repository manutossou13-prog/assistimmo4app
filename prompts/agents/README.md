# Prompts — Agents

> System prompts spécifiques à chaque agent. Versionnés comme du code.

## Convention
- 1 fichier par agent : `oscar.md`, `tom.md`, `nora.md`, `sarah.md`, `lea.md`, `emma.md`, `stella.md`, `franck.md`, `hugo.md`, `ines.md`, `gabriel.md`.
- Frontmatter : `name`, `version`, `model`, `tools`, `last_review_date`, `legal_review` (bool pour agents juridiques).

## Process de modification
1. PR avec diff prompt
2. Tests golden (10 inputs canoniques) doivent passer
3. Review obligatoire pour NORA, INÈS, GABRIEL (impact légal/RH/finance)
4. Bump version sémantique :
   - `patch` : reformulation, typo
   - `minor` : nouvelle capacité interne
   - `major` : changement de comportement utilisateur

## Tests golden
Vivent dans `agents/<slug>/tests/`. Exécutés en CI.

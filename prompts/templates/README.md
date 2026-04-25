# Prompts — Templates

> Patterns de prompts génériques réutilisables (extraction structurée, classification, résumé, traduction…).

## Fichiers
- `extract_structured_json.md` — pattern d'extraction → JSON validé schema
- `classify_intent.md` — multi-label classification (utilisé par OSCAR)
- `summarize_long.md` — résumé hiérarchique (chunks → meta-summary)
- `translate_with_glossary.md` — traduction avec glossaire métier immo
- `redact_pii.md` — masquage PII avant envoi LLM externe
- `chain_of_thought_judge.md` — pattern d'évaluation auto-judge pour tests golden

## Usage
Appelés via fonction utilitaire `renderPrompt(name, vars)` côté backend.

# Assistimo AI

> **Operating System immobilier** — plateforme multi-agent pour agences, dirigeants et agents indépendants.

## Vision

Regrouper tous les outils métier d'une agence immobilière dans une seule plateforme pilotée par un agent orchestrateur central (**OSCAR**) qui comprend l'intention de l'utilisateur et active le ou les bons agents spécialisés.

## Roster (10 agents + 1 orchestrateur)

| Agent | Rôle | MVP |
|---|---|---|
| **OSCAR** | Orchestrateur central | V1 |
| **TOM** | Enquêteur mandat (recherche d'adresse) | V1 |
| **NORA** | Administratif & génération mandats | V1 |
| **SARAH** | Copywriter terrain (courriers, scripts, emails) | V1 |
| **LÉA** | Comptes rendus visites & réunions | V1 |
| **EMMA** | Présentations & pitchs | V2 |
| **STELLA** | Réseaux sociaux | V2 |
| **FRANCK** | Vidéaste immobilier IA | V2 |
| **HUGO** | Manager & analyste KPI | V2 |
| **INÈS** | Recrutement immobilier | V3 |
| **GABRIEL** | Pilote financier | V3 |

## Documentation

Tout le projet est documenté dans [`/docs`](./docs). Point d'entrée : [`docs/ARCHITECTURE_ASSISTIMO_AI.md`](./docs/ARCHITECTURE_ASSISTIMO_AI.md).

- [Architecture globale](./docs/ARCHITECTURE_ASSISTIMO_AI.md)
- [Agents — vue d'ensemble](./docs/AGENTS_OVERVIEW.md)
- [OSCAR — l'orchestrateur](./docs/ORCHESTRATOR_OSCAR.md)
- [Modèle de données](./docs/DATA_MODEL.md)
- [Workflows](./docs/WORKFLOWS.md)
- [Sécurité & conformité](./docs/SECURITY_AND_COMPLIANCE.md)
- [Roadmap](./docs/ROADMAP.md)
- [Périmètre MVP](./docs/MVP_SCOPE.md)

## Arborescence

```
assistimo-ai/
├── docs/             # documentation produit & architecture
├── agents/           # 1 dossier par agent (system prompt + spec)
├── skills/           # capacités réutilisables (transverses)
├── prompts/          # bibliothèque de prompts versionnés
├── templates/        # gabarits documents (mandats, courriers, …)
├── workflows/        # chaînes d'agents formalisées
├── database/         # schéma, tables, permissions
└── frontend/         # spec UI/UX (dashboard, CRM, …)
```

## Principes

1. **Architecture modulaire** — chaque agent est vendable seul.
2. **OSCAR oriente** — l'utilisateur ne choisit pas l'agent, il décrit son besoin.
3. **Validation humaine obligatoire** sur tout document juridique, financier ou contractuel.
4. **Multi-tenant natif** — agence ↔ utilisateurs ↔ rôles (admin/manager/agent/assistant).
5. **Garde-fous légaux** — RGPD, loi Hoguet, ALUR, anti-discrimination.
6. **Pas de chiffres inventés** — toute donnée marché est sourcée (DVF, ADEME, cadastre…).

## Statut

> Phase 1 — Documentation & architecture. **Aucun code applicatif** à ce stade.

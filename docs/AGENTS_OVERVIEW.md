# AGENTS_OVERVIEW — Vue d'ensemble des agents

> Pour la spec détaillée d'un agent, voir `agents/<nom>/README.md`.

## Table récap

| # | Slug | Nom | Rôle | Module | Phase | Modèle | Validation humaine |
|---|---|---|---|---|---|---|---|
| 0 | `oscar` | OSCAR | Orchestrateur central | core | MVP | Sonnet | — |
| 1 | `tom` | Tom | Enquêteur mandat | Prospection | MVP | Sonnet (vision) | non |
| 2 | `nora` | Nora | Administratif & mandats | Mandats | MVP | Sonnet | **oui** |
| 3 | `sarah` | Sarah | Copywriter terrain | Communication | MVP | Sonnet | partiel |
| 4 | `lea` | Léa | Comptes rendus & relation client | Relation client | MVP | Sonnet | non |
| 5 | `emma` | Emma | Présentations & pitch | Présentation | V2 | Sonnet | non |
| 6 | `stella` | Stella | Réseaux sociaux | Communication | V2 | Sonnet | **oui** (publication) |
| 7 | `franck` | Franck | Vidéaste IA | Communication | V2 | Sonnet | non |
| 8 | `hugo` | Hugo | Manager & KPI | Pilotage | V2 | Opus | non |
| 9 | `ines` | Inès | Recrutement | Recrutement | V3 | Sonnet | **oui** |
| 10 | `gabriel` | Gabriel | Pilote financier | Finance | V3 | Opus | **oui** |

## Logique de couleurs / accents UI (recommandée)

| Module | Accent | Idée |
|---|---|---|
| core (OSCAR) | bleu nuit | autorité, neutralité |
| Prospection | ambre | énergie, chasse |
| Mandats | vert sapin | sérieux, confiance |
| Communication | rose poudré | créatif, chaleureux |
| Présentation | violet | premium |
| Pilotage | acier | analytique |
| Recrutement | corail | humain |
| Finance | doré | rigueur |
| Relation client | turquoise | écoute |

## Inputs/outputs : pattern commun

Tous les agents respectent ce contrat :

```ts
type AgentInput = {
  run_id: string;
  agency_id: string;
  user_id: string;
  payload: Record<string, unknown>;   // spec dans agents/<slug>/README.md
  context?: {
    property_id?: string;
    prospect_id?: string;
    mandate_id?: string;
  };
};

type AgentOutput = {
  status: "ok" | "needs_input" | "error";
  deliverables: Deliverable[];        // documents, messages, fichiers générés
  next_actions?: string[];            // suggestions à OSCAR
  questions?: string[];               // si needs_input
  metadata: { tokens: number; model: string; duration_ms: number };
};
```

## Skills par agent (matrice)

| Skill | TOM | NORA | SARAH | LÉA | EMMA | STELLA | FRANCK | HUGO | INÈS | GABRIEL |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| analyse_annonce | ✅ | | | | | | | | | |
| recherche_adresse | ✅ | | | | | | | | | |
| scoring_mandat | ✅ | | | | | | | ✅ | | |
| generation_mandat | | ✅ | | | | | | | | |
| generation_courrier | | | ✅ | | | | | | | ✅ |
| generation_script_appel | | | ✅ | | | | | | ✅ | |
| generation_presentation | | | | | ✅ | | | | | |
| generation_post_social | | | | | | ✅ | | | ✅ | |
| generation_script_video | | | | | | ✅ | ✅ | | ✅ | |
| analyse_kpi | | | | | | | | ✅ | | ✅ |
| analyse_cv | | | | | | | | | ✅ | |
| analyse_financiere | | | | | | | | | | ✅ |
| generation_resiliation | | | | | | | | | | ✅ |
| transcription_audio | | | | ✅ | | | | | | |
| compte_rendu_visite | | | | ✅ | | | | | | |

## Dépendances inter-agents (séquentielles fréquentes)

- TOM → SARAH (adresse trouvée → courrier de prospection)
- TOM → NORA (prospect chaud → mandat préparé)
- LÉA → SARAH (compte rendu visite → email de retour vendeur)
- HUGO → EMMA (KPI mensuel → support de réunion équipe)
- GABRIEL → SARAH (charge à résilier → courrier de résiliation)
- INÈS → STELLA → FRANCK (campagne recrutement complète)
- TOM → STELLA (bien rentré → post de valorisation)

# OSCAR — Orchestrator Central Agent for Real-estate

> Le cerveau de la plateforme. Un seul point d'entrée, N agents derrière.

---

## 1. Mission

OSCAR reçoit la demande utilisateur (texte, voix, fichier, action UI) et **prend en charge tout le cycle** :

1. **Comprendre** l'intention.
2. **Vérifier** que les inputs nécessaires sont présents.
3. **Demander une clarification** si un input critique manque.
4. **Planifier** : 1 agent, N agents en chaîne, ou N agents en parallèle.
5. **Dispatcher** vers les agents.
6. **Agréger** les sorties.
7. **Persister** les livrables (DB + Storage).
8. **Synthétiser** une réponse utilisateur claire avec liens vers livrables.
9. **Logger** le run complet (audit + observabilité).

OSCAR **peut produire lui-même** les réponses triviales (FAQ, factuel) sans réveiller un agent — pour ne pas gaspiller du tool-use.

---

## 2. Modèle d'exécution

Pattern : **tool-use Claude natif**. Chaque agent est exposé à OSCAR comme un tool typé.

```ts
// pseudo-code
const tools = {
  invoke_tom: { description: "...", input_schema: {...} },
  invoke_nora: { description: "...", input_schema: {...} },
  invoke_sarah: { ... },
  // ...
  ask_user: { description: "Pose une question de clarification", input_schema: { question, options } },
  finish: { description: "Termine le run avec une synthèse", input_schema: { summary, deliverables } },
};

streamText({
  model: anthropic("claude-sonnet-4-7"),
  system: OSCAR_SYSTEM_PROMPT,
  messages,
  tools,
  stopWhen: stepCountIs(8),
});
```

OSCAR boucle tant qu'il appelle des tools, et termine par `finish` ou `ask_user`.

---

## 3. Catalogue d'intentions

OSCAR doit reconnaître au minimum ces intentions :

| Intention user | Agent(s) ciblé(s) | Workflow |
|---|---|---|
| "Trouve l'adresse de ce bien : <url>" | TOM | `workflow_recherche_mandat` |
| "Génère-moi un mandat exclusif pour <bien>" | NORA | `workflow_generation_mandat` |
| "Écris un courrier de prospection pour le 15e" | SARAH | `workflow_prospection` |
| "Prospecte ce quartier" | TOM → SARAH | `workflow_prospection` (chaîné) |
| "Prépare le rdv de demain avec M. Dupont" | LÉA + HUGO | brief client |
| "Résume cet enregistrement de visite" (audio) | LÉA | `workflow_compte_rendu` |
| "Fais un post LinkedIn sur ce bien vendu" | STELLA | `workflow_social_media` |
| "Génère 3 idées de Reels pour ce bien" | FRANCK + STELLA | `workflow_video` |
| "Présentation pour le rdv estimation jeudi" | EMMA (+ HUGO data) | `workflow_presentation` |
| "Comment va l'agence ce mois ?" | HUGO | `workflow_kpi` |
| "Score ce CV pour le poste de négociateur" | INÈS | `workflow_recrutement` |
| "Analyse mes charges et propose des optimisations" | GABRIEL | `workflow_financier` |
| "Résilie ce contrat" | GABRIEL → SARAH | `workflow_financier` (résiliation) |

---

## 4. Décision : 1 agent vs chaîne

OSCAR utilise une **heuristique de planification** :

- **Mono-agent** si la demande tombe clairement dans le périmètre d'un seul agent.
- **Séquentiel** si l'agent B a besoin de la sortie de A (TOM → SARAH).
- **Parallèle** si les agents sont indépendants (STELLA + FRANCK pour un bien).
- **Workflow nommé** si la demande matche un workflow pré-câblé → meilleure prévisibilité.

OSCAR **explique son plan en 1 ligne** avant d'exécuter (transparence).

---

## 5. Clarification : quand poser une question

OSCAR pose une question **uniquement si** un input est :
- **bloquant** (ex. NORA sans prix de mise en vente),
- **non-récupérable depuis le contexte** (DB, dossier bien actif, mandat ouvert…),
- **non-déductible** raisonnablement.

Sinon : OSCAR fait une **hypothèse explicite** et la note dans la synthèse, plutôt que d'ennuyer l'utilisateur.

Format question : ≤ 1 question à la fois, propose 2-4 options quand pertinent.

---

## 6. Persistance

Chaque run OSCAR crée :

- 1 ligne dans `agent_runs` (id, user_id, agency_id, intent, plan, status, started_at, ended_at, cost_tokens).
- N lignes dans `agent_steps` (run_id, agent_slug, input, output, duration_ms, error).
- N entrées dans la table livrable concernée (`mandates`, `social_posts`, `meeting_reports`, …).
- N fichiers dans Storage (PDF/Word/audio) avec path = `{agency_id}/{run_id}/...`.
- 1 entrée `audit_logs` par action sensible (création doc, envoi email, signature).

---

## 7. Garde-fous

1. **Quotas** par tenant (runs/jour, tokens/mois) — refus poli quand dépassé.
2. **Validation humaine** automatique pour : mandats, compromis, courriers juridiques, posts publics, envoi email à client, courriers de résiliation. OSCAR **prépare** mais ne **publie/envoie** jamais sans clic utilisateur.
3. **Filtrage discrimination** sur INÈS — OSCAR refuse les critères illégaux même si demandés.
4. **Pas d'invention de données** — OSCAR signale "donnée manquante" plutôt que de combler.
5. **Boucles infinies** — `stopWhen: stepCountIs(8)` + timeout 60s.

---

## 8. System prompt squelette

> Vit dans `/agents/oscar_orchestrator/system_prompt.md`. Voir ce fichier pour la version complète.

Structure :
- Identité (qui tu es, à qui tu parles)
- Catalogue agents disponibles (généré dynamiquement depuis `/agents/*`)
- Règles de décision (mono / chaîne / parallèle)
- Règles de clarification
- Règles de validation humaine
- Format de sortie (toujours synthèse + liens livrables)
- Ton (vouvoiement pro, court, direct, français)

---

## 9. Métriques OSCAR (KPI internes)

- **Taux de mono-call** (demandes résolues en 1 agent) — cible > 70 %
- **Taux de clarification** — cible < 20 % (sinon trop intrusif)
- **Latence p95** — cible < 8 s pour mono, < 25 s pour chaîne
- **Taux d'erreur agent** — cible < 2 %
- **Coût moyen par run** — à monitorer (Langfuse)
- **Satisfaction perçue** (👍/👎 post-run) — cible > 85 %

---

## 10. Évolutions futures

- **Mémoire long-terme** par utilisateur (préférences, biens habituels, ton) via pgvector.
- **Mode autonome** : OSCAR exécute des tâches récurrentes (relances J+7, scan annonces hebdo).
- **Voix-to-voix** : entrée micro + TTS pour usage terrain.
- **Mode "co-pilot"** : OSCAR observe le CRM en arrière-plan et suggère.
- **Multi-modèle routing** : Haiku pour intent, Sonnet pour rédaction, Opus pour stratégie.

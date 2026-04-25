# Workflow — `route_user_request`

> Workflow universel : entrée de toute requête utilisateur. Exécuté par **OSCAR**.

## Trigger
Toute interaction utilisateur (chat, action UI, voix).

## Inputs
- `user_message` (text/audio)
- `context` (auto) : agence, dossier ouvert, modules activés, rôle utilisateur

## Étapes

```mermaid
flowchart TD
  A[User input] --> B[OSCAR: classify intent]
  B -->|simple factuel| Z[Réponse directe]
  B -->|missing critical input| Q[ask_user]
  Q --> B
  B -->|mono-agent| M[invoke_agent_X]
  B -->|chain| C1[invoke_agent_1]
  C1 --> C2[invoke_agent_2]
  B -->|parallel| P1[agent_A]
  B -->|parallel| P2[agent_B]
  M --> S[Synthèse + persist]
  C2 --> S
  P1 --> S
  P2 --> S
  S --> END[finish]
```

## Règles
1. Si la demande est factuelle simple → OSCAR répond sans réveiller un agent.
2. Si un input critique manque → 1 seule question (pas plus).
3. Sinon plan + dispatch.
4. Toujours `finish` avec synthèse + livrables + 1-3 next_actions.

## Persistence
- `agent_runs` (1 ligne par run)
- `agent_steps` (N lignes)
- `audit_logs` (actions sensibles)

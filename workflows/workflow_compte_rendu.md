# Workflow — `workflow_compte_rendu`

> Audio/notes → compte rendu structuré. Agent : **LÉA** (+ SARAH pour email retour).

## Trigger
- Upload audio, "Résume cette visite", "Compte rendu de la réunion"

## Inputs
- `audio` ou `transcript` ou `notes`
- `meeting_kind`, `participants[]`, `objective`
- `consent_check` ✅ obligatoire pour audio

## Étapes

```mermaid
flowchart LR
  A[Audio/notes] --> T[skill:transcription_audio]
  T --> R[skill:compte_rendu_visite]
  R --> M[Markdown CR + tâches]
  M --> E[SARAH: email retour client]
  E --> V[Validation humaine email]
```

## Outputs
- `meeting_reports.summary_md`
- `tasks` créées
- Email vendeur/acheteur en draft
- Points de vigilance
- Prochain rdv suggéré

## Validation humaine
- **Pour l'envoi de l'email** : oui.
- Pour le CR interne : non (il reste interne).

## Persistence
- `meeting_reports`, `tasks`, `messages` (draft)

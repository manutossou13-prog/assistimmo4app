---
name: compte_rendu_visite
description: Transforme une transcription ou des notes brutes en compte rendu structuré (intentions, objections, engagements, prochaines actions) + email de suivi.
agents: [lea]
inputs: [transcript_or_notes, meeting_kind, participants, objective]
outputs: [summary_md, internal_summary, client_email_draft, tasks, vigilance_points]
---

# Skill — compte_rendu_visite

## Structure de sortie
- **Contexte** (1 ligne)
- **Points clés** (3-7 bullets)
- **Intentions exprimées** (signaux d'achat / vente)
- **Objections** (top 3)
- **Engagements** (qui, quoi, quand)
- **Email retour client** (draft)
- **Tâches** (avec assignee + due date)
- **Vigilance** (risques, signaux faibles)
- **Prochain rdv** suggéré

## Adaptation par `meeting_kind`
- `visit_buyer` → focus motivation acheteur, capacité financière, objections
- `visit_seller` → focus prix, urgence, exclusivité possible
- `estimation` → focus valeur, comparables, attentes vendeur
- `team` → focus actions par personne
- `client_call` → focus suivi pipeline

## Garde-fous
- Filtrer les éléments perso (santé, situation conjugale) avant export client.
- Email de retour **toujours en draft**, jamais envoyé auto.

# Frontend — Dashboard

## Layout (3 zones)

```
┌──────────────────────────────────────────────────────────────────┐
│  Topbar : agence active · search · notifs · user                │
├──────────┬──────────────────────────────────────┬────────────────┤
│ Sidebar  │     CHAT OSCAR (au centre)           │ Activity feed  │
│ - Home   │                                      │ - Runs récents │
│ - Biens  │     [Composer multi-modal]           │ - Tâches due   │
│ - CRM    │     [Streaming réponse]              │ - Alertes      │
│ - Docs   │     [Liens vers livrables]           │                │
│ - Présent│                                      │                │
│ - Social │                                      │                │
│ - KPI    │                                      │                │
│ - Recrut │                                      │                │
│ - Finance│                                      │                │
│ - Settings│                                     │                │
└──────────┴──────────────────────────────────────┴────────────────┘
```

## Composants clés
- `<OscarChat />` — composer + stream + tool-call display
- `<AgentBadge />` — quand OSCAR délègue, affiche l'agent actif
- `<DeliverableCard />` — preview d'un livrable (PDF, mandat, post…)
- `<RunTimeline />` — historique des étapes du run en cours
- `<QuickActionsBar />` — raccourcis : "Trouver adresse", "Mandat express", "CR audio", "Post LinkedIn"

## États
- Idle → message d'accueil contextuel ("Bonjour Marie, 3 mandats expirent cette semaine")
- En cours → bulle de stream + spinner par tool-call
- Needs input → carte de question + boutons options
- Done → synthèse + livrables + next actions cliquables

## Mobile
- Layout single-column, sidebar en drawer
- Composer en bas + clavier
- Voix-to-OSCAR : bouton micro central (V2)

## Accessibilité
- Contrastes AA min
- Navigation clavier complète
- ARIA labels sur tous les composants interactifs
- Texte alternatif sur visuels générés

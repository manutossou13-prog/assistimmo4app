# Frontend — Dossier bien

> Vue à 360° d'une `property`. Cœur de la valeur agence.

## Layout

```
┌─ Bandeau bien ──────────────────────────────────────────┐
│ adresse · type · prix · DPE · mandat actif · score TOM  │
└────────────────────────────────────────────────────────┘
[Onglets] Vue · Mandats · Documents · Communications · Tâches · Historique · Données

VUE
- Photo principale + galerie
- Caractéristiques (surfaces, pièces, étage, équipements)
- Score TOM + justification
- Localisation (carte)
- Vendeur (anonymisé selon RBAC)
- KPI bien : nb visites, nb offres, durée pipeline

MANDATS
- Liste mandats (actif, anciens, avenants)
- Bouton "Générer mandat" → NORA
- État Yousign

DOCUMENTS
- Mandats, courriers, fiches, présentations
- Filtre par kind, agent producteur, date

COMMUNICATIONS
- Tous messages liés (email, courrier, SMS, appels)
- Drafts en attente de validation
- Bouton "Préparer un message" → SARAH

TÂCHES
- Liste tasks ouvertes/passées
- Auto-générées par les agents
- Bouton "Créer une tâche"

HISTORIQUE
- Timeline complète des actions (audit_logs filtré)
- Toutes les runs OSCAR liées au bien

DONNÉES
- Données croisées TOM (DPE, DVF, cadastre)
- Estimation marché (V2)
- Comparables
```

## Actions rapides
- "Trouver adresse" (re-run TOM)
- "Préparer mandat" (NORA)
- "Préparer courrier" (SARAH)
- "Créer un post" (STELLA)
- "Lancer une vidéo" (FRANCK)

## Sécurité
- Dossier visible selon RBAC (agent ne voit que ses biens, sauf dérogation manager).
- Toute modification logguée.

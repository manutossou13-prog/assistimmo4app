# MVP_SCOPE — Périmètre minimum livrable

> Objectif : démontrer la valeur cœur (gain de temps + mandats rentrés) avec **5 agents** et une UX simple. Pas de fioritures.

## 5 agents MVP

1. **OSCAR** — chat unique en page d'accueil, comprend la demande, route.
2. **TOM** — colle URL d'annonce → adresse probable + score + fiche prospect.
3. **NORA** — formulaire mandat → PDF + Word + envoi Yousign (manuel pour MVP).
4. **SARAH** — courriers + scripts d'appel + emails de prospection (validation humaine).
5. **LÉA** — upload audio (visite, réunion) → compte rendu + email de retour vendeur.

## Cas d'usage MVP couverts

| Cas | Agents | Sortie |
|---|---|---|
| "Trouve l'adresse de ce bien (URL)" | TOM | adresse + score + sauvegarde dans `properties` |
| "Prospecte ce quartier" | TOM → SARAH | liste biens + courriers boîtage prêts |
| "Génère un mandat exclusif pour M. Dupont" | NORA | PDF/Word + envoi Yousign |
| "Résume cet enregistrement de visite" | LÉA | compte rendu + tâches + email vendeur |
| "Réponds à ce vendeur" | SARAH | email/SMS/script |

## Hors-scope MVP (volontairement reporté)

- Réseaux sociaux (STELLA), vidéos (FRANCK), présentations (EMMA)
- KPI tableau de bord (HUGO)
- Recrutement (INÈS), Finance (GABRIEL)
- Connecteurs CRM (Apimo, Hektor) — import CSV manuel suffisant
- Mode multi-agences (organisations) — 1 agence par compte au début
- Mobile app — web responsive suffit

## UI MVP (5 écrans)

1. **Login / Signup** (Supabase Auth)
2. **Onboarding agence** (carte T, logo, infos légales)
3. **Dashboard** (chat OSCAR au centre + sidebar agents + 3 derniers livrables)
4. **Dossier bien** (vue propriété + mandats + docs + tâches + historique)
5. **Paramètres** (équipe, branding, abonnement)

## Stack MVP

- Next.js 15 + Tailwind 4 + shadcn/ui
- Supabase (DB + Auth + Storage)
- Anthropic Claude Sonnet
- OpenAI Whisper (transcription)
- Yousign API
- Stripe (1 plan : 99 €/mois/agence, 5 users inclus)
- Vercel hosting

## Définition de "fini" pour le MVP

- 5 agences pilotes utilisent la plateforme **chaque semaine** pendant 4 semaines.
- Au moins **80 % des runs OSCAR** se terminent en `done` (pas `failed`).
- Au moins **30 mandats** générés via NORA en pilote.
- NPS pilote > 40.
- Aucune fuite de données cross-tenant détectée (audit RLS automatique).

## Ce qu'on accepte de bricoler en MVP

- Pas de retry sophistiqué (Inngest reporté à V2)
- Pas de webhook public (Zapier reporté à V3)
- Pas de pgvector (recherche full-text Postgres suffit)
- Pas de tests golden agents (juste tests unitaires des skills)
- Pas de marketplace de templates (templates internes en dur)

## Ce qu'on ne bricole JAMAIS, même en MVP

- RLS multi-tenant (sécurité)
- Audit log (légal)
- Validation humaine sur mandats / courriers / signatures (légal)
- Mentions légales + RGPD (légal)
- Filtrage discrimination (légal)

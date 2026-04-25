# ROADMAP — Assistimo AI

## Phase 0 — Setup (semaine 1-2)

- [ ] Repo Next.js 15 + Supabase + Stripe sandbox
- [ ] Auth + multi-tenant + RBAC
- [ ] Schéma DB initial (organizations, agencies, users, memberships, properties, prospects, mandates, documents, agent_runs, audit_logs)
- [ ] RLS sur toutes les tables tenant
- [ ] Pipeline LLM (Claude via @ai-sdk/anthropic) + Langfuse
- [ ] Layout dashboard + chat OSCAR vide

## Phase 1 — MVP (semaine 3-12)

**Agents** : OSCAR, TOM, NORA, SARAH, LÉA.

- [ ] **OSCAR** : intent routing + tool-use + clarification + audit run
- [ ] **TOM** : skills `analyse_annonce` + `recherche_adresse` + `scoring_mandat` (ADEME + DVF + cadastre + Maps)
- [ ] **NORA** : skill `generation_mandat` (mandat simple + exclusif), génération PDF + Word, intégration Yousign
- [ ] **SARAH** : skill `generation_courrier` + `generation_script_appel` (5 templates de base)
- [ ] **LÉA** : skill `transcription_audio` (Whisper) + `compte_rendu_visite`
- [ ] Dashboard : dossier bien, CRM prospects, documents
- [ ] Stripe (1 plan unique au lancement)
- [ ] Onboarding agence (carte T, branding)
- [ ] Mentions légales + RGPD basique
- [ ] **Beta fermée** auprès de 5 agences pilotes

## Phase 2 — V2 (semaine 13-20)

**Ajouts** : EMMA, STELLA, FRANCK, HUGO + KPI tableau de bord.

- [ ] **EMMA** : génération decks (markdown + PDF + export Gamma-compatible)
- [ ] **STELLA** : calendrier éditorial + posts multi-canal + queue de publication (validation humaine)
- [ ] **FRANCK** : scripts vidéo + storyboards + intégration Runway/Luma (V2 fin)
- [ ] **HUGO** : connecteurs CRM (Apimo, Hektor en priorité), tableau de bord KPI temps réel
- [ ] Modules tarifés séparément dans Stripe
- [ ] Mode multi-agences (organizations)
- [ ] Public beta

## Phase 3 — V3 (semaine 21-32)

**Ajouts** : INÈS, GABRIEL + intégrations avancées.

- [ ] **INÈS** : skill `analyse_cv` + parser LinkedIn + grille d'évaluation + filtre anti-discrimination
- [ ] **GABRIEL** : import Excel charges + catégorisation + skill `generation_resiliation` + prévision trésorerie
- [ ] Intégrations : Yousign QualifiedSign, Pennylane (compta), Apimo/Hektor write-back
- [ ] Webhooks publics (Zapier/n8n/Make)
- [ ] Mode "agent autonome" (relances J+7 automatiques)
- [ ] Marketplace de templates inter-agences
- [ ] Lancement commercial public

## Phase 4 — Scale

- [ ] Mobile app (React Native, iOS/Android)
- [ ] Mode terrain offline (PWA)
- [ ] Voice-to-voice OSCAR (terrain)
- [ ] Mémoire long-terme par utilisateur (pgvector)
- [ ] Multi-modèle routing (Haiku/Sonnet/Opus)
- [ ] White-label pour groupes immobiliers
- [ ] Audit SOC 2 Type I

## KPI produit cibles

| Phase | MAU | Agences | MRR |
|---|---|---|---|
| MVP (beta) | 25 | 5 | 0 (gratuit) |
| V2 | 200 | 30 | 5 k€ |
| V3 | 1 000 | 150 | 30 k€ |
| Scale | 5 000 | 500 | 150 k€ |

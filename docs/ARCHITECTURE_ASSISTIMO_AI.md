# ARCHITECTURE — Assistimo AI

> Document de référence. Toute décision architecturale future doit être cohérente avec ce fichier ou amender ce fichier.

---

## 1. Vision produit

Assistimo AI est un **Operating System immobilier multi-agent** : une plateforme SaaS où un orchestrateur central (**OSCAR**) comprend la demande utilisateur en langage naturel et active le ou les bons agents IA spécialisés (10 agents métier) pour produire des livrables actionnables.

### Cibles
- **Agent immobilier indépendant** (single-user)
- **Agence immobilière** (multi-user, 1 site)
- **Dirigeant d'agence** (rôle manager + finances + RH)
- **Groupe immobilier** (multi-tenant, multi-agences, consolidation)

### Promesse
> Gagner du temps, rentrer plus de mandats, mieux suivre, produire plus, piloter mieux.

---

## 2. Schéma d'architecture

```
                  ┌───────────────────────────────────────────────┐
                  │                   FRONTEND                    │
                  │        (Next.js 15 + React 19 + Tailwind)     │
                  │  Dashboard • Chat OSCAR • Dossiers • CRM      │
                  └───────────────────────┬───────────────────────┘
                                          │ HTTPS / streaming
                                          ▼
                  ┌───────────────────────────────────────────────┐
                  │                BACKEND API (Next API)         │
                  │  Auth • RBAC • Rate-limit • Audit • Quotas    │
                  └─────┬─────────────────┬──────────────────┬────┘
                        │                 │                  │
                        ▼                 ▼                  ▼
           ┌──────────────────┐  ┌────────────────┐  ┌──────────────┐
           │   OSCAR Router   │  │  Skills Bus    │  │  Tool Layer  │
           │  (intent + plan) │  │  (capacités)   │  │ (intégr. ext)│
           └─────────┬────────┘  └────────┬───────┘  └──────┬───────┘
                     │                    │                 │
   ┌─────┬─────┬─────┼─────┬─────┬─────┐  │  DPE/ADEME, DVF, Cadastre,
   ▼     ▼     ▼     ▼     ▼     ▼     ▼  ▼  Maps, Gmail, Drive, CRM,
  TOM  NORA SARAH LÉA  EMMA STELLA …    │  Yousign, Stripe, Meilisearch
                                        │
                  ┌─────────────────────▼───────────────────────────┐
                  │            DATA LAYER (Supabase Postgres)       │
                  │  + Storage (S3/Supabase) + pgvector + Audit log │
                  └─────────────────────────────────────────────────┘
```

### Layers
1. **Frontend** — chat unifié + vues métier (dossier bien, CRM, KPI, paramètres).
2. **API gateway** — Next.js Route Handlers, auth, RBAC, quotas, audit.
3. **OSCAR Router** — classification d'intent, planification, dispatch.
4. **Agents** — 10 agents métier, chacun avec system prompt + skills autorisées.
5. **Skills Bus** — capacités réutilisables transverses (analyse_annonce, generation_mandat, transcription_audio, etc.).
6. **Tool Layer** — wrappers vers APIs externes (DPE, DVF, cadastre, Maps, Yousign, Drive, Gmail…).
7. **Data Layer** — Postgres (Supabase), pgvector pour mémoire sémantique, S3 pour fichiers, audit log immuable.

---

## 3. Stack technique recommandée

| Couche | Choix | Pourquoi |
|---|---|---|
| Front | **Next.js 15 (App Router) + React 19 + TypeScript** | Stream natif, RSC, écosystème. |
| UI | **Tailwind 4 + shadcn/ui + lucide-react** | Vitesse, qualité, compo. |
| Auth | **Supabase Auth** (email + magic link + OAuth Google) | Multi-tenant + RLS. |
| DB | **Supabase Postgres + pgvector** | RLS = isolation tenant. |
| Storage | **Supabase Storage** | S3-compatible, signed URLs. |
| LLM | **Anthropic Claude (Sonnet/Opus)** via `@ai-sdk/anthropic` | Streaming, tool-use natif. |
| LLM (fallback) | **OpenAI GPT-4o** | Vision + redondance. |
| Vision | **Claude Sonnet vision** ou **GPT-4o vision** | Analyse photos annonces. |
| Audio | **Whisper API** (OpenAI) ou **Deepgram** | Transcription rapide. |
| Search | **Meilisearch** | Recherche full-text biens/prospects. |
| Background jobs | **Inngest** ou **Trigger.dev** | Workflows long-running. |
| Email | **Resend** | Envoi transactionnel. |
| Sign | **Yousign API** | Signature électronique conforme eIDAS. |
| PDF | **Puppeteer** + **react-pdf** | Génération mandats / décks. |
| Word | **docx** (npm) | Génération .docx. |
| Maps | **Google Maps Platform** + **IGN Géoportail** | Cartographie + cadastre. |
| DVF | **api.dvf.etalab.gouv.fr** | Valeurs foncières. |
| DPE | **api.koumoul.com/data-fair/api/v1** (ADEME) | DPE/GES publiques. |
| Cadastre | **api.cadastre.gouv.fr** + **carto.api.gouv.fr** | Parcelles. |
| Paiements | **Stripe** | Abonnements + modules à la carte. |
| Observabilité | **Langfuse** + **Sentry** + **Logflare** | Traces LLM + erreurs. |
| Hébergement | **Vercel** (front) + **Supabase** + **Inngest cloud** | Zero-ops MVP. |

---

## 4. Modules SaaS — packaging commercial

L'architecture **doit permettre de vendre chaque agent séparément** comme un mini-SaaS, ou en bundle.

```
ASSISTIMO SUITE (full)
├─ Module PROSPECTION       → TOM (+ skills annonce, adresse, scoring)
├─ Module MANDATS           → NORA (+ génération doc + signature)
├─ Module COMMUNICATION     → SARAH + STELLA + FRANCK
├─ Module PRÉSENTATION      → EMMA
├─ Module PILOTAGE          → HUGO
├─ Module RECRUTEMENT       → INÈS
├─ Module FINANCE           → GABRIEL
└─ Module RELATION CLIENT   → LÉA
```

Chaque module = **feature flag + plan Stripe**. OSCAR détecte les modules activés et n'expose à l'utilisateur que ces agents.

---

## 5. Multi-tenant & rôles

### Hiérarchie

```
Organization (groupe immobilier, optionnel)
  └─ Agency (1 ou N)
       └─ User (membre)
            └─ Role: admin | manager | agent | assistant
```

### RBAC matrix (extrait)

| Action | admin | manager | agent | assistant |
|---|:-:|:-:|:-:|:-:|
| Voir tous les biens de l'agence | ✅ | ✅ | ❌ (que les siens) | ✅ |
| Créer un mandat | ✅ | ✅ | ✅ | ❌ |
| Signer un mandat | ✅ | ✅ | ✅ | ❌ |
| Voir KPI agents (HUGO) | ✅ | ✅ | ❌ | ❌ |
| Voir finances (GABRIEL) | ✅ | ❌ | ❌ | ❌ |
| Inviter un user | ✅ | ❌ | ❌ | ❌ |
| Configurer la marque | ✅ | ❌ | ❌ | ❌ |

### Isolation
- Postgres **RLS** sur toutes les tables : `agency_id = auth.jwt() -> agency_id`.
- Storage : préfixe par `agency_id/` + signed URLs courtes.
- Logs : champ `agency_id` indexé, jamais de cross-tenant.

---

## 6. OSCAR — orchestrateur central

Voir [`ORCHESTRATOR_OSCAR.md`](./ORCHESTRATOR_OSCAR.md) pour la spec détaillée.

**Rôles** :
- Comprendre l'intention (classification multi-label)
- Vérifier la complétude des inputs
- Demander **clarification** si bloquant
- Planifier la chaîne d'agents (1, N séquentiel, ou N parallèle)
- Dispatcher, agréger, persister
- Produire une **synthèse utilisateur** + lien vers livrables

**Pattern technique** : OSCAR utilise du **tool-use natif Claude**. Chaque agent est un "tool" exposé. OSCAR appelle 1 ou plusieurs tools, lit les retours, peut chaîner.

---

## 7. Anatomie d'un agent

Chaque agent vit dans `/agents/<nom>/` avec **toujours** la même structure :

```
agents/tom_enqueteur_mandat/
├── README.md            # spec : mission, inputs, outputs, limites, exemples
├── system_prompt.md     # prompt système versionné
├── tools.json           # liste des skills/tools autorisés
├── examples/            # quelques input→output de référence (pour eval)
└── tests/               # golden tests sur la sortie
```

Conventions :
- **system_prompt.md** est versionné. Toute modif = bump `version` dans frontmatter.
- **tools.json** déclare les capacités explicites (sécurité = whitelist).
- Les agents **n'accèdent jamais directement** aux APIs externes — toujours via `Skills` ou `Tools`.

### Frontmatter agent (standard)

```yaml
---
slug: tom
name: Tom
role: Enquêteur mandat
model: claude-sonnet-4-7
version: 1.0.0
status: active            # active | beta | deprecated
module: prospection
tools:
  - skill:analyse_annonce
  - skill:recherche_adresse
  - skill:scoring_mandat
  - tool:dpe_ademe
  - tool:dvf
  - tool:cadastre
  - tool:google_maps
inputs_required: [annonce_url_or_text]
outputs: [adresse_probable, score, justification, fiche_prospect]
human_validation: false
---
```

---

## 8. Skills — capacités réutilisables

Une **skill** = capacité métier transverse, utilisable par 1+ agent. Ex. `generation_courrier` est utilisée par SARAH (prospection) et GABRIEL (résiliations).

```
skills/generation_courrier/
├── SKILL.md             # description + triggers (matching auto par OSCAR)
├── prompt.md            # prompt système de la skill
├── schema.json          # schéma input/output (JSON Schema)
└── handler.ts           # implémentation TypeScript (Phase 2)
```

Différence agent ↔ skill :
- **Agent** = persona métier, point d'entrée OSCAR, possède un dossier de livrables.
- **Skill** = brique fonctionnelle, sans persona, appelée par un ou plusieurs agents.

---

## 9. Workflows

Un **workflow** est une chaîne d'agents/skills formalisée pour un cas d'usage récurrent. Ex. *"prospecter un quartier"* = TOM → SARAH → NORA.

Les workflows vivent dans `/workflows/*.md` avec un graphe explicite (Mermaid). OSCAR peut **invoquer un workflow nommé** ou **construire un plan ad-hoc**.

---

## 10. Modèle de données (résumé)

Voir [`DATA_MODEL.md`](./DATA_MODEL.md) pour le schéma complet.

Tables principales :
- `organizations`, `agencies`, `users`, `memberships`
- `properties` (biens)
- `prospects`, `mandates`, `documents`
- `tasks`, `messages`, `meeting_reports`
- `presentations`, `social_posts`, `videos`
- `kpi_records`, `candidates`, `financial_records`
- `agent_runs` (trace d'exécution OSCAR)
- `audit_logs` (immutable)

---

## 11. Sécurité & conformité

Voir [`SECURITY_AND_COMPLIANCE.md`](./SECURITY_AND_COMPLIANCE.md).

Piliers :
- **RGPD** — consentement, durée de conservation, droit à l'effacement, registre des traitements.
- **Loi Hoguet** — registre des mandats, carte T, mentions obligatoires.
- **Loi ALUR** — mentions DPE, conformité annonces.
- **Anti-discrimination** (recrutement INÈS) — critères interdits filtrés.
- **eIDAS** — signature électronique via Yousign (niveau avancé minimum).
- **Audit trail** — chaque action sensible loggée.
- **Validation humaine obligatoire** sur : mandats, compromis, courriers juridiques, courriers de résiliation, posts publics, embauche.

---

## 12. Phasage MVP → V3

Voir [`ROADMAP.md`](./ROADMAP.md) et [`MVP_SCOPE.md`](./MVP_SCOPE.md).

| Phase | Agents | Modules | Durée cible |
|---|---|---|---|
| **MVP** | OSCAR, TOM, NORA, SARAH, LÉA | Prospection, Mandats, Communication (light), Relation client | 8-12 semaines |
| **V2** | + EMMA, STELLA, FRANCK, HUGO | + Présentation, Social/Vidéo, Pilotage | +8 semaines |
| **V3** | + INÈS, GABRIEL | + Recrutement, Finance + intégrations avancées | +8 semaines |

---

## 13. Décisions architecturales à graver

1. **OSCAR est un router + producer**, pas un simple dispatcher. Il peut produire lui-même les réponses simples (factuel, FAQ) sans réveiller un agent.
2. **Chaque agent est isolable** : son system prompt, ses skills, son schéma I/O suffisent à le faire tourner en standalone (pour le packaging modulaire).
3. **Les écritures critiques passent par une queue** (Inngest) avec retry idempotent.
4. **Aucun secret en clair côté front**. Toutes les clés API externes vivent côté serveur, sont scopées par tenant.
5. **Les LLM sont versionnés** (champ `model` par agent + log par run).
6. **Les prompts sont versionnés** comme du code (git + tests golden).
7. **L'utilisateur peut toujours voir POURQUOI** un agent a produit un livrable : OSCAR expose le plan + les sources.

---

## 14. Glossaire

- **OSCAR** — Orchestrator Central Agent for Real-estate.
- **Agent** — persona IA métier (TOM, NORA, …).
- **Skill** — capacité fonctionnelle réutilisable.
- **Tool** — wrapper autour d'une API externe.
- **Workflow** — chaîne d'agents nommée.
- **Module** — bundle commercial d'agents et skills (vendu séparément).
- **Tenant** — agence cliente (isolation données).
- **Run** — une exécution OSCAR de bout en bout.

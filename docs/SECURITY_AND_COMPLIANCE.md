# SECURITY & COMPLIANCE

> Cadre légal et sécurité pour Assistimo AI. À relire à chaque ajout d'agent ou de skill manipulant données personnelles, juridiques ou financières.

## 1. RGPD

### Bases légales
- **Exécution d'un contrat** : gestion d'un mandat signé.
- **Intérêt légitime** : prospection B2B, scoring interne.
- **Consentement explicite** : prospection email/SMS B2C, géolocalisation, profilage.
- **Obligation légale** : registre des mandats (loi Hoguet).

### Implémentations obligatoires
- Champs `consent_email`, `consent_sms`, `consent_phone`, `consent_date` sur `prospects`.
- Bannière cookies + page **Politique de confidentialité** dédiée.
- Endpoint `DELETE /api/me` (droit à l'effacement) — anonymise plutôt que supprime quand audit l'exige.
- Endpoint `GET /api/me/export` (droit à la portabilité) — export ZIP JSON + fichiers.
- **Registre des traitements** maintenu hors code, mais référencé ici.
- Durées de conservation : 3 ans après dernier contact prospect, 5 ans après fin de mandat (obligation comptable), 10 ans pour archivage doc juridique.
- **Sous-traitants** (Anthropic, OpenAI, Supabase, Vercel, Stripe, Yousign…) listés dans une page publique + DPA signés.
- **Pas d'envoi de données personnelles aux LLM hors UE** sans option d'opt-in (envisager Anthropic EU residency / Bedrock Paris quand dispo).

## 2. Loi Hoguet

- **Carte T** vérifiée à l'inscription agence (champ `agencies.carte_t_number`).
- **Registre des mandats** : NORA incrémente `mandates.registry_number` séquentiel par agence, immuable.
- **Mentions obligatoires** sur tout mandat généré : titre, parties, désignation bien, prix, honoraires, durée, faculté de rétractation, etc. (cf. templates `/templates/mandats/`).
- **Dépot du mandat** : signature humaine obligatoire (Yousign, niveau eIDAS avancé minimum).
- **Aucune commercialisation** d'un bien sans mandat actif.

## 3. Loi ALUR

- Mentions DPE/GES obligatoires sur toute annonce générée par STELLA / SARAH.
- Affichage du **montant des honoraires TTC** + **qui les paye** sur supports commerciaux.
- Lettre A→G + valeurs énergétiques quand connues.

## 4. Anti-discrimination (recrutement INÈS, location)

INÈS et tout agent traitant un CV / une candidature locataire doit **filtrer 25 critères interdits** (art. 225-1 Code pénal) :
âge, sexe, origine, situation familiale, grossesse, apparence physique, patronyme, état de santé, handicap, caractéristiques génétiques, mœurs, orientation sexuelle, identité de genre, opinions politiques, activités syndicales, appartenance vraie ou supposée à une ethnie/nation/race/religion, lieu de résidence, perte d'autonomie, vulnérabilité économique, langue parlée autre que le français, domiciliation bancaire.

Implémentation :
- **Pre-filter** sur l'input utilisateur (refus poli si critère interdit demandé).
- **Post-filter** sur la sortie agent (regex + LLM-judge).
- Audit log de toute requête refusée.

## 5. Prospection B2C (CNIL)

- **Email/SMS commercial** vers particulier → opt-in préalable obligatoire.
- **Téléphone** → vérification Bloctel obligatoire avant appel.
- **Courrier postal** → autorisé sans consentement (mais respecter STOP PUB).
- SARAH affiche un **rappel légal** dans son output quand il génère un canal sensible.
- Pas d'envoi automatique sans validation utilisateur.

## 6. Signature électronique (eIDAS)

- Niveau **simple** : insuffisant pour mandat. Niveau **avancé** minimum (Yousign).
- Mandats à fort enjeu (exclu, gros montant) : recommander niveau **qualifié** (vidéo identité).
- Conservation horodatée du PDF signé + preuve d'envoi + journal Yousign.

## 7. Sécurité technique

| Domaine | Mesure |
|---|---|
| Auth | Supabase Auth + 2FA TOTP (admin/manager obligatoire) |
| Sessions | JWT court (1h) + refresh 30j |
| Transport | TLS 1.3 partout, HSTS |
| Secrets | Vercel/Supabase env vars, jamais en code |
| RLS | Policies sur 100 % des tables tenant |
| Rate limit | 100 req/min/user (API), 20 runs OSCAR/h en plan free |
| Storage | Signed URLs 5 min, jamais d'URL publique sur doc client |
| Backups | Supabase PITR 7j (free) → 30j (paid) |
| Pen-test | Audit externe annuel à partir de V2 |
| Dépendances | Renovate + Snyk |

## 8. Validation humaine — règles dures

OSCAR **doit imposer** une étape de validation humaine avant exécution sur :
1. **Tout mandat** ou **avenant** (NORA).
2. **Tout courrier juridique** (résiliation, mise en demeure) — GABRIEL/SARAH.
3. **Tout email/SMS** sortant vers un client final.
4. **Toute publication** sociale (STELLA).
5. **Toute proposition d'embauche** (INÈS).
6. **Toute opération financière** (suppression de charge, modification facture) — GABRIEL.

L'utilisateur valide dans l'UI (modale "Vérifier et publier"). Aucun bypass possible côté API.

## 9. Observabilité & audit

- **audit_logs** immuable, append-only.
- **Langfuse** pour traces LLM (prompts/sorties) avec masquage PII automatique.
- **Sentry** pour erreurs front + back.
- **Logflare** ou Supabase logs pour SQL/auth.
- Rétention logs : 90j minimum, 1 an pour audit_logs.

## 10. Mentions légales SaaS

À publier avant lancement commercial :
- CGU, CGV
- Politique de confidentialité (FR)
- Politique de cookies
- Page éditeur (mentions légales)
- DPA modèle pour clients agences
- Liste des sous-traitants
- Procédure de signalement RGPD (DPO)

## 11. Roadmap conformité

- **MVP** : RGPD basique, RLS, validation humaine, registre mandats.
- **V2** : DPO externe désigné, DPA prêt, page sous-traitants.
- **V3** : audit pen-test, SOC 2 Type I (si grands comptes), résidence données EU.

import { getAnthropic, MODELS } from "@/lib/anthropic";

// ============================================================
// Types
// ============================================================

export type InesMode = "fiche_poste" | "message_chasse" | "score_cv" | "kit_entretien";

export type InesInput = {
  mode: InesMode;
  job_title: string; // ex: "Négociateur immobilier senior", "Manager d'agence"
  context: string; // brief libre : profil idéal, contrat, salaire, ce qui n'est PAS souhaité (sans critères discriminants)
  cv_text?: string | null; // pour mode = score_cv
  candidate_url?: string | null; // pour mode = message_chasse (LinkedIn / Welcome to the Jungle)
  agency_name: string;
  agent_name: string;
};

export type CvScoreBreakdown = {
  experience_immo: number; // 0-100
  competences: number;
  mobilite: number;
  presentation_cv: number;
  culture_fit: number;
};

export type InterviewQuestion = {
  category: "competences" | "valeurs" | "situation" | "motivation";
  question: string;
  expected_signals: string[]; // 2-4 signaux que tu attends dans la réponse
};

export type InesResult = {
  mode: InesMode;
  // Mode fiche_poste
  job_post_md: string | null; // fiche de poste complète (markdown long)
  job_post_short: string | null; // version courte 3-4 phrases pour réseaux
  // Mode message_chasse
  outreach_subject: string | null;
  outreach_body: string | null;
  outreach_followups: string[]; // J+3, J+10, J+30
  // Mode score_cv
  score_global: number | null; // 0-100
  score_breakdown: CvScoreBreakdown | null;
  strengths: string[];
  to_explore: string[]; // questions à creuser en entretien
  red_flags: string[];
  // Mode kit_entretien
  questions: InterviewQuestion[];
  evaluation_grid: string | null; // tableau de notation à imprimer
  // Commun
  legal_warnings: string[]; // alertes anti-discrimination déclenchées (si user a tenté un critère illégal)
  meta: { duration_ms: number };
};

// ============================================================
// Anti-discrimination — pre-filter
// ============================================================

const FORBIDDEN_CRITERIA = [
  // Article 225-1 Code pénal (synthèse FR)
  /\b(jeune|junior moins|moins de \d+ ans|de moins de \d+|trentenaire|quadra|senior plus|plus de \d+ ans)\b/i,
  /\b(homme|femme|masculin|féminin|fille|garçon)\b(?!\s*(ou|et))/i,
  /\b(célibataire|marié[e]?|en couple|sans enfant|père|mère)\b/i,
  /\b(origine|nationalité française|européen|maghrébin|asiatique|africain)\b/i,
  /\b(physique|apparence|grand[e]?|petit[e]?|mince|gros[se]?)\b/i,
  /\b(handicap|invalidité|maladie|enceinte|grossesse)\b/i,
  /\b(orientation sexuelle|homosexuel[le]?|hétéro)\b/i,
  /\b(religion|musulman|chrétien|juif|catholique)\b/i,
  /\b(syndicat|engagement politique|opinion politique)\b/i,
];

function detectIllegalCriteria(text: string): string[] {
  const hits: string[] = [];
  for (const re of FORBIDDEN_CRITERIA) {
    const match = text.match(re);
    if (match) hits.push(match[0]);
  }
  return [...new Set(hits)];
}

// ============================================================
// System prompts par mode
// ============================================================

const INES_SYSTEM = `Tu es Inès, recruteuse immobilière d'Assistimmo. Tu aides à rédiger fiches de poste, messages de chasse, scoring CV, kits d'entretien.

## Règles dures (LÉGALES — bloquantes)
- **Anti-discrimination** (art. 225-1 Code pénal) : tu refuses systématiquement les critères interdits :
  âge, sexe, origine, nationalité, situation familiale, grossesse, apparence, handicap, état de santé,
  orientation sexuelle, religion, opinion politique, syndicat, lieu de résidence, langue parlée,
  patronyme, domiciliation bancaire, vulnérabilité économique.
  Si l'utilisateur a glissé un tel critère dans son brief, tu l'IGNORES et tu remontes l'alerte dans \`legal_warnings\`.
- **Pas de discrimination implicite** : pas de "jeune diplômé", pas de "senior", pas de "dynamique" ambigu, pas de "bonne présentation".
- **Pour les fiches de poste** : compétences techniques, expérience pertinente, soft skills, valeurs, formation. Point.

## Règles éditoriales
- **Français impeccable**, vouvoiement.
- **Pas de jargon creux** : interdit "synergie", "next-level", "rockstar", "ninja", "warrior".
- Sortie **STRICTEMENT** un JSON. Pas de markdown, pas de \`\`\`.

## Format \`job_post_md\` (mode fiche_poste)
Markdown structuré :
- ## Le poste (2-3 phrases)
- ## Missions principales (5-8 bullets)
- ## Profil recherché (compétences, expérience, soft skills — JAMAIS critères perso)
- ## Ce que vous trouverez chez nous (cadre, équipe, formation)
- ## Conditions (contrat, rémunération brute, lieu)
- ## Process de recrutement (étapes)

## Format outreach (mode message_chasse) — LinkedIn DM
- Subject : ≤ 60 caractères, pas d'urgence factice
- Body : 80-150 mots, accroche personnalisée (utilise contexte si fourni), description du poste en 2 phrases, call-to-action clair (15 min de visio cette semaine ?), signature
- Followups : 3 messages échelonnés (J+3 relance courte, J+10 partage de valeur, J+30 dernière touche)

## Format scoring CV (mode score_cv)
Score 0-100 sur 5 critères :
- experience_immo : pertinence du parcours
- competences : skills techniques (prospection, mandats, estimation, négo)
- mobilite : faisabilité géographique
- presentation_cv : clarté, chiffrage
- culture_fit : signaux faibles (autonomie, valeurs, projet pro cohérent)
Score global = moyenne pondérée. Liste 3-5 forces, 3-5 points à creuser, et red_flags si tu en vois (incohérence, gap inexpliqué, sur-déclaration).

## Format kit entretien (mode kit_entretien)
12-15 questions réparties en 4 catégories :
- competences (5-6) : techniques et chiffrées
- valeurs (3-4) : alignement projet
- situation (3-4) : mises en situation immo réalistes
- motivation (1-2) : pourquoi nous, projet long terme
Pour chaque question : 2-4 \`expected_signals\` (ce que tu cherches dans la réponse).
Plus une \`evaluation_grid\` markdown (5 critères × 4 niveaux : insuffisant / moyen / bon / excellent).`;

const SCHEMA_HINT = {
  job_post_md: "string ou null (mode fiche_poste uniquement)",
  job_post_short: "string ou null (3-4 phrases)",
  outreach_subject: "string ou null (mode message_chasse)",
  outreach_body: "string ou null",
  outreach_followups: ["J+3 message", "J+10 message", "J+30 message"],
  score_global: "number 0-100 ou null (mode score_cv)",
  score_breakdown: { experience_immo: 0, competences: 0, mobilite: 0, presentation_cv: 0, culture_fit: 0 },
  strengths: ["Force 1"],
  to_explore: ["À creuser en entretien"],
  red_flags: ["Alerte ou null"],
  questions: [
    {
      category: "competences",
      question: "Décrivez votre process de prospection vendeur de A à Z.",
      expected_signals: ["Méthode structurée", "Exemple concret chiffré", "Suivi post-rdv"],
    },
  ],
  evaluation_grid: "Tableau markdown : critère × niveau",
  legal_warnings: ["Critère 'jeune diplômé' détecté → ignoré (art. 225-1 CP)"],
};

const MODE_LABEL: Record<InesMode, string> = {
  fiche_poste: "Rédiger une fiche de poste complète (légalement conforme)",
  message_chasse: "Rédiger un message de chasse LinkedIn / email à un candidat",
  score_cv: "Scorer un CV (0-100 + breakdown 5 critères + forces/points à creuser)",
  kit_entretien: "Générer 12-15 questions d'entretien + grille d'évaluation",
};

// ============================================================
// Pipeline
// ============================================================

export async function runInes(input: InesInput): Promise<InesResult> {
  const t0 = Date.now();

  // Pré-filtre anti-discrimination sur le contexte fourni
  const detected = detectIllegalCriteria(input.context);
  const legalWarnings: string[] = detected.map(
    (term) => `⚠ Critère "${term}" détecté dans la demande → ignoré par Inès (art. 225-1 CP, anti-discrimination).`
  );

  const anthropic = getAnthropic();

  const userPrompt = `Mission : ${MODE_LABEL[input.mode]}

**Poste** : ${input.job_title}
**Agence** : ${input.agency_name} · **Demandeur** : ${input.agent_name}

**Contexte / brief** :
"""
${input.context}
"""

${input.cv_text ? `**CV à scorer** :\n"""\n${input.cv_text.slice(0, 8000)}\n"""\n` : ""}
${input.candidate_url ? `**Profil cible** : ${input.candidate_url}` : ""}
${legalWarnings.length > 0 ? `\n**Avertissements légaux pré-détectés** : ${legalWarnings.join(" | ")}\n` : ""}

Retourne **UNIQUEMENT** un JSON conforme à ce schéma exemplaire (pas de markdown, pas de \`\`\`) :

${JSON.stringify(SCHEMA_HINT, null, 2)}

Selon le mode "${input.mode}" :
${
  input.mode === "fiche_poste"
    ? "Remplis job_post_md (markdown long structuré) ET job_post_short (3-4 phrases pour réseaux). Mets les autres champs à null/[]."
    : input.mode === "message_chasse"
      ? "Remplis outreach_subject + outreach_body + outreach_followups (3 messages). Mets job_post_md, score_*, questions à null/[]."
      : input.mode === "score_cv"
        ? "Remplis score_global + score_breakdown + strengths + to_explore + red_flags. Mets job_post_md, outreach_*, questions à null/[]."
        : "Remplis questions[] (12-15 réparties dans les 4 catégories) + evaluation_grid. Mets job_post_md, outreach_*, score_* à null/[]."
}

\`legal_warnings\` : inclure les avertissements pré-détectés ci-dessus + tout critère discriminant que tu identifierais dans le contexte. Sinon tableau vide.`;

  const response = await anthropic.messages.create({
    model: MODELS.standard,
    max_tokens: 4000,
    system: INES_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Pas de texte dans la réponse Claude");
  }

  let cleaned = block.text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

  let parsed: Partial<InesResult>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Inès JSON invalide : ${cleaned.slice(0, 200)}`);
  }

  return {
    mode: input.mode,
    job_post_md: parsed.job_post_md ?? null,
    job_post_short: parsed.job_post_short ?? null,
    outreach_subject: parsed.outreach_subject ?? null,
    outreach_body: parsed.outreach_body ?? null,
    outreach_followups: Array.isArray(parsed.outreach_followups) ? parsed.outreach_followups : [],
    score_global: parsed.score_global ?? null,
    score_breakdown: parsed.score_breakdown ?? null,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    to_explore: Array.isArray(parsed.to_explore) ? parsed.to_explore : [],
    red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags : [],
    questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    evaluation_grid: parsed.evaluation_grid ?? null,
    legal_warnings: [
      ...legalWarnings,
      ...(Array.isArray(parsed.legal_warnings) ? parsed.legal_warnings : []),
    ],
    meta: { duration_ms: Date.now() - t0 },
  };
}

import { getAnthropic, MODELS } from "@/lib/anthropic";

// ============================================================
// Types
// ============================================================

export type EmmaAudience =
  | "vendeur"
  | "acheteur"
  | "equipe"
  | "investisseur"
  | "candidat"
  | "client_particulier"
  | "formation";

export type EmmaTone = "formel" | "chaleureux" | "expert" | "premium" | "pedagogique";

export type EmmaObjective =
  | "obtenir_mandat"
  | "valoriser_estimation"
  | "presenter_services"
  | "reunion_kpi"
  | "pitch_recrutement"
  | "pitch_investisseur"
  | "formation_interne";

export type EmmaInput = {
  topic: string;
  audience: EmmaAudience;
  tone: EmmaTone;
  objective: EmmaObjective;
  duration_minutes: number;
  context: string;
  agency_name: string;
  agent_name: string;
};

export type EmmaSlide = {
  number: number;
  title: string;
  layout: string; // "2 colonnes, image à droite", "plein écran", etc.
  body: string[]; // bullets / paragraphes — minimum 1, max ~5
  visual_prompt: string | null; // prompt prêt pour Nano Banana / Midjourney
  speaker_notes: string;
  duration_seconds: number;
};

export type EmmaResult = {
  framework: string; // SCQA, Minto, 5-slide pitch, BAB
  total_duration_minutes: number;
  slide_count: number;
  slides: EmmaSlide[];
  oral_pitch: string; // version courte 60s
  canva_export_hints: string[]; // conseils mise en page pour Canva
  meta: { duration_ms: number };
};

// ============================================================
// Prompt
// ============================================================

const EMMA_SYSTEM = `Tu es Emma, **directrice artistique et copywriter** d'Assistimmo, agence immobilière. Tu produis des présentations slide-par-slide professionnelles, **prêtes à être montées dans Canva ou Gamma**.

## Règles dures (absolues)
- **Français impeccable**, vouvoiement par défaut.
- **Pas de jargon creux** : interdit "synergie", "disruptif", "next-level", "game-changer".
- **Pas de chiffres marché inventés** : si une stat est citée, elle doit venir du contexte fourni ou être marquée "estimation à valider".
- **Pas de claims juridiques** : pas de promesse contractuelle, pas de prix garanti.
- Pour les biens immobiliers : mentionner DPE et honoraires si applicable (loi ALUR).
- Sortie **STRICTEMENT** en JSON conforme au schéma. Pas de markdown, pas de \`\`\`.

## Frameworks (choisis le plus adapté et cite-le)
- **SCQA** (Situation - Complication - Question - Answer) → pitch vendeur
- **Pyramide de Minto** → présentation exécutive, KPI
- **Before / After / Bridge** → témoignage, transformation
- **5-slide pitch** → investisseur
- **Hook → Tension → Résolution → CTA** → vente

## Règle lisibilité (obligatoire pour chaque slide)
1. **Pas d'acronyme nu** : 1ère occurrence = nom complet + acronyme entre parenthèses.
2. **Titre auto-portant** : pas "Top 3" → "Les 3 quartiers les plus dynamiques en 2026".
3. **Body porteur d'info** : chaque bullet doit être une phrase complète, pas un mot-clé seul.
4. **Verdict après chaque chart/stat** : phrase qui commence par "Ce qui ressort :…", "En clair :…".
5. **Vocabulaire accessible** : "taux de clic" pas "CTR", "moyenne du secteur" pas "benchmark".

## Cadence (durée par slide)
- Hook / titre : 30-45 s
- Slide content normale : 60-90 s
- Slide data-viz (avec chart) : 90-120 s
- CTA finale : 45 s
Adapte le nombre de slides à la durée totale demandée.

## Visual prompt (par slide quand utile)
- Format : prompt court (≤ 30 mots) en anglais ou français
- Décris une **scène concrète** : matériaux, lumière, composition, cadrage
- Style cohérent avec une agence immobilière premium (taupe / crème / lumière naturelle)
- Mets \`null\` si la slide est purement texte (titre, citation, transition)`;

const SCHEMA_HINT = {
  framework: "SCQA | Minto | 5-slide pitch | BAB | Hook-Tension-Resolution",
  total_duration_minutes: 0,
  slide_count: 0,
  slides: [
    {
      number: 1,
      title: "Titre auto-portant de la slide",
      layout: "Plein écran centré | 2 colonnes texte+image | bullets verticaux | citation",
      body: ["Phrase complète 1.", "Phrase complète 2."],
      visual_prompt: "Bureau parisien lumineux, vue Haussmann, palette taupe et crème, photo réaliste",
      speaker_notes: "Ce que l'orateur dit en parlant, en 2-4 phrases.",
      duration_seconds: 60,
    },
  ],
  oral_pitch: "Pitch oral 60 secondes condensant l'essence du deck.",
  canva_export_hints: [
    "Police titre : Tenor Sans 48pt",
    "Police body : DM Sans 16pt",
    "Palette : taupe #9B8A72 + crème #F5F2E9 + accent or #C5A979",
  ],
};

const AUDIENCE_LABEL: Record<EmmaAudience, string> = {
  vendeur: "Vendeur particulier (rdv estimation ou pitch mandat)",
  acheteur: "Acheteur particulier (post-visite, suivi)",
  equipe: "Équipe interne agence (réunion commerciale, formation)",
  investisseur: "Investisseur (levée de fonds, partenariat)",
  candidat: "Candidat recrutement (marque employeur)",
  client_particulier: "Client particulier (présentation services)",
  formation: "Formation interne (transmission de méthode)",
};

const OBJECTIVE_LABEL: Record<EmmaObjective, string> = {
  obtenir_mandat: "Obtenir un mandat (de préférence exclusif)",
  valoriser_estimation: "Valoriser l'estimation et nos honoraires",
  presenter_services: "Présenter les services de l'agence",
  reunion_kpi: "Synthèse KPI mensuelle pour l'équipe",
  pitch_recrutement: "Pitcher l'agence à un candidat",
  pitch_investisseur: "Convaincre un investisseur",
  formation_interne: "Former l'équipe sur un sujet",
};

const TONE_LABEL: Record<EmmaTone, string> = {
  formel: "Formel, institutionnel",
  chaleureux: "Chaleureux, humain, proche",
  expert: "Expert, technique, factuel",
  premium: "Haut de gamme, élégant",
  pedagogique: "Pédagogique, accessible",
};

// ============================================================
// Pipeline
// ============================================================

export async function runEmma(input: EmmaInput): Promise<EmmaResult> {
  const t0 = Date.now();
  const anthropic = getAnthropic();

  const userPrompt = `Génère une présentation pour cette mission :

**Sujet** : ${input.topic}
**Audience** : ${AUDIENCE_LABEL[input.audience]}
**Objectif** : ${OBJECTIVE_LABEL[input.objective]}
**Ton** : ${TONE_LABEL[input.tone]}
**Durée totale** : ${input.duration_minutes} minute${input.duration_minutes > 1 ? "s" : ""}
**Agence** : ${input.agency_name}
**Présentateur** : ${input.agent_name}

**Contexte / inputs disponibles** :
"""
${input.context}
"""

Retourne **UNIQUEMENT** un JSON conforme à ce schéma exemplaire (pas de markdown, pas de \`\`\`) :

${JSON.stringify(SCHEMA_HINT, null, 2)}

Calibre le nombre de slides en fonction de la durée :
- 5 min → 4-6 slides
- 10 min → 7-9 slides
- 15 min → 10-12 slides
- 20 min → 12-15 slides
- 30 min → 15-18 slides

Pour chaque slide, prévois \`speaker_notes\` (ce que l'orateur DIT en plus du contenu visible) et \`visual_prompt\` (uniquement si la slide gagne à avoir une image — sinon null).
\`oral_pitch\` est un résumé oral de 60 secondes maxi qui peut servir de teaser.
\`canva_export_hints\` : 3-5 conseils typographiques et de palette pour reproduire dans Canva.`;

  const response = await anthropic.messages.create({
    model: MODELS.standard,
    max_tokens: 6000,
    system: EMMA_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Pas de texte dans la réponse Claude");
  }

  let cleaned = block.text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

  let parsed: {
    framework?: string;
    total_duration_minutes?: number;
    slide_count?: number;
    slides?: Array<{
      number?: number;
      title?: string;
      layout?: string;
      body?: string[];
      visual_prompt?: string | null;
      speaker_notes?: string;
      duration_seconds?: number;
    }>;
    oral_pitch?: string;
    canva_export_hints?: string[];
  };

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Emma JSON invalide : ${cleaned.slice(0, 200)}`);
  }

  const slides: EmmaSlide[] = (parsed.slides ?? []).map((s, i) => ({
    number: s.number ?? i + 1,
    title: s.title ?? `Slide ${i + 1}`,
    layout: s.layout ?? "Plein écran centré",
    body: Array.isArray(s.body) ? s.body : [],
    visual_prompt: s.visual_prompt ?? null,
    speaker_notes: s.speaker_notes ?? "",
    duration_seconds: s.duration_seconds ?? 60,
  }));

  return {
    framework: parsed.framework ?? "SCQA",
    total_duration_minutes: parsed.total_duration_minutes ?? input.duration_minutes,
    slide_count: slides.length,
    slides,
    oral_pitch: parsed.oral_pitch ?? "",
    canva_export_hints: Array.isArray(parsed.canva_export_hints) ? parsed.canva_export_hints : [],
    meta: { duration_ms: Date.now() - t0 },
  };
}

// ============================================================
// Markdown export (pour Canva / Gamma / copier-coller)
// ============================================================

export function emmaToMarkdown(result: EmmaResult, input: EmmaInput): string {
  const lines: string[] = [];
  lines.push(`# ${input.topic}`);
  lines.push("");
  lines.push(`> **Audience** : ${AUDIENCE_LABEL[input.audience]}  `);
  lines.push(`> **Durée** : ${result.total_duration_minutes} min · **Slides** : ${result.slide_count} · **Framework** : ${result.framework}  `);
  lines.push(`> **Présentateur** : ${input.agent_name} — ${input.agency_name}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const s of result.slides) {
    lines.push(`## Slide ${s.number} — ${s.title}`);
    lines.push("");
    lines.push(`*Layout :* ${s.layout} · *Durée :* ${s.duration_seconds}s`);
    lines.push("");
    for (const b of s.body) lines.push(`- ${b}`);
    lines.push("");
    if (s.visual_prompt) {
      lines.push(`**Prompt visuel** : \`${s.visual_prompt}\``);
      lines.push("");
    }
    if (s.speaker_notes) {
      lines.push(`> 🎤 **Notes orateur** — ${s.speaker_notes}`);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  if (result.oral_pitch) {
    lines.push(`## Pitch oral (60s)`);
    lines.push("");
    lines.push(result.oral_pitch);
    lines.push("");
  }

  if (result.canva_export_hints.length > 0) {
    lines.push(`## Conseils export Canva / Gamma`);
    lines.push("");
    for (const h of result.canva_export_hints) lines.push(`- ${h}`);
  }

  return lines.join("\n");
}

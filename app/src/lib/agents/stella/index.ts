import { getAnthropic, MODELS } from "@/lib/anthropic";

// ============================================================
// Types
// ============================================================

export type StellaChannel = "linkedin" | "instagram" | "facebook" | "tiktok" | "youtube_short";
export type StellaFormat = "post" | "carrousel" | "reel" | "story";
export type StellaTone = "expert" | "chaleureux" | "punchy" | "premium" | "pedagogique";
export type StellaObjective =
  | "valoriser_bien"
  | "valoriser_mandat_signe"
  | "valoriser_vente"
  | "estimation_gratuite"
  | "recrutement"
  | "pedagogie_dpe"
  | "actu_marche"
  | "coulisses_agence"
  | "temoignage_client";

export type StellaInput = {
  channel: StellaChannel;
  format: StellaFormat;
  tone: StellaTone;
  objective: StellaObjective;
  topic: string;
  context: string;
  agency_name: string;
};

export type StellaPost = {
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  visual_prompt: string | null; // prompt prêt pour Nano Banana / Midjourney
  carrousel_slides?: { title: string; body: string }[]; // si format = carrousel
  word_count: number;
};

export type StellaResult = {
  framework: string; // Hook-Story-Offer / AIDA / PAS / Carousel narrative
  channel: StellaChannel;
  format: StellaFormat;
  posts: StellaPost[]; // 1 principal + variantes
  best_publish_time: string | null;
  legal_notice: string | null;
  meta: { duration_ms: number };
};

// ============================================================
// Prompt
// ============================================================

const STELLA_SYSTEM = `Tu es Stella, social media manager d'Assistimmo, agence immobilière. Tu produis des contenus réseaux sociaux **prêts à publier**, alignés avec la marque agence.

## Règles dures (absolues)
- **Français impeccable**, vouvoiement par défaut sauf TikTok/Insta court (où tutoiement OK).
- **Pas de jargon creux** : interdit "synergie", "disruptif", "next-level", "AI-powered".
- **Pas de chiffres marché inventés** : si une stat est citée, elle doit venir du contexte fourni ou être marquée "estimation".
- **Mentions légales obligatoires** sur posts de biens : DPE + lettre + valeur quand pertinent (loi ALUR), honoraires TTC + qui les paye.
- **Pas d'image bien sans accord propriétaire** — rappelle dans \`legal_notice\` si applicable.
- Sortie **STRICTEMENT** un JSON. Pas de markdown, pas de \`\`\`.

## Frameworks
- **Hook-Story-Offer** (post court, Reel, TikTok)
- **AIDA** (post LinkedIn long, Instagram long)
- **PAS** (post éducatif "problème → solution")
- **Carousel narrative arc** : slide 1 hook → slides 2-N expliquent → slide N CTA

## Format par canal
- **LinkedIn** : 100-300 mots, ton pro, listes à puces OK, emojis sobres (max 3-4).
- **Instagram post** : 60-200 mots, beaucoup d'air, emojis OK, retours à la ligne marqués.
- **Instagram carrousel** : 6-10 slides, chacune ≤ 30 mots de body + titre fort.
- **Facebook** : 100-250 mots, ton local, accessible.
- **TikTok / YouTube Short** : 15-50 mots de caption + script court ≤ 60s.
- **Reel** : 30-80 mots de script visuel + 1-2 phrases de caption.

## Hooks (≤ 10 mots quand possible)
Évite les clichés ("Vous ne croirez pas…"). Privilégie : factuel surprenant, question directe, contre-intuition, chiffre fort sourcé.

## Hashtags (5-12 selon canal)
Mix : 3-5 niche (#immobilierdrancy #immo93), 3-4 grand public (#immobilier #achatimmo), 2-3 marque (#assistimmo #century21drancy).

## Visual prompt (un par post)
Court (≤ 25 mots), en français ou anglais, décris une scène concrète : matériaux, lumière, composition, palette taupe/crème/or premium immobilier.`;

const SCHEMA_HINT = {
  framework: "Hook-Story-Offer | AIDA | PAS | Carousel narrative",
  posts: [
    {
      hook: "Accroche ≤ 10 mots",
      body: "Corps du post (longueur adaptée canal)",
      cta: "Call-to-action explicite",
      hashtags: ["#hashtag1", "#hashtag2"],
      visual_prompt: "Prompt image court ou null",
      carrousel_slides: [{ title: "Slide 1", body: "Texte slide 1" }],
      word_count: 0,
    },
  ],
  best_publish_time: "Mardi 18h-20h | Jeudi 12h-13h | etc.",
  legal_notice: "Mention légale ou null",
};

const CHANNEL_LABEL: Record<StellaChannel, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube_short: "YouTube Shorts",
};

const FORMAT_LABEL: Record<StellaFormat, string> = {
  post: "Post simple",
  carrousel: "Carrousel multi-slides",
  reel: "Reel / vidéo verticale",
  story: "Story",
};

const TONE_LABEL: Record<StellaTone, string> = {
  expert: "Expert, factuel",
  chaleureux: "Chaleureux, humain",
  punchy: "Punchy, énergique",
  premium: "Premium, élégant",
  pedagogique: "Pédagogique, accessible",
};

const OBJECTIVE_LABEL: Record<StellaObjective, string> = {
  valoriser_bien: "Valoriser un bien à vendre",
  valoriser_mandat_signe: "Annoncer un nouveau mandat signé",
  valoriser_vente: "Annoncer un bien vendu (preuve sociale)",
  estimation_gratuite: "Promouvoir une estimation gratuite",
  recrutement: "Attirer des candidats",
  pedagogie_dpe: "Vulgariser DPE / rénovation énergétique",
  actu_marche: "Donner un éclairage sur l'actu marché",
  coulisses_agence: "Montrer les coulisses de l'agence",
  temoignage_client: "Mettre en avant un témoignage client",
};

// ============================================================
// Pipeline
// ============================================================

export async function runStella(input: StellaInput): Promise<StellaResult> {
  const t0 = Date.now();
  const anthropic = getAnthropic();

  const userPrompt = `Génère un contenu social pour cette mission :

**Canal** : ${CHANNEL_LABEL[input.channel]}
**Format** : ${FORMAT_LABEL[input.format]}
**Ton** : ${TONE_LABEL[input.tone]}
**Objectif** : ${OBJECTIVE_LABEL[input.objective]}
**Sujet** : ${input.topic}
**Agence** : ${input.agency_name}

**Contexte / inputs disponibles** :
"""
${input.context}
"""

Retourne **UNIQUEMENT** un JSON conforme à ce schéma exemplaire (pas de markdown, pas de \`\`\`) :

${JSON.stringify(SCHEMA_HINT, null, 2)}

Génère **2 posts** (1 principal + 1 variante avec un angle différent).
Pour chaque post :
- Hook ≤ 10 mots
- Body adapté au canal et format
- CTA explicite
- 5-12 hashtags pertinents
- visual_prompt (ou null si purement texte)
- Si format = carrousel : remplis carrousel_slides (6-10 slides), sinon laisse \`null\` ou tableau vide.
- word_count = mots dans le body

best_publish_time : 1-2 créneaux recommandés pour ce canal en France.
legal_notice : mention légale (DPE/honoraires/RGPD) si applicable, sinon null.`;

  const response = await anthropic.messages.create({
    model: MODELS.standard,
    max_tokens: 2500,
    system: STELLA_SYSTEM,
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
    posts?: Array<{
      hook?: string;
      body?: string;
      cta?: string;
      hashtags?: string[];
      visual_prompt?: string | null;
      carrousel_slides?: Array<{ title?: string; body?: string }>;
      word_count?: number;
    }>;
    best_publish_time?: string | null;
    legal_notice?: string | null;
  };

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Stella JSON invalide : ${cleaned.slice(0, 200)}`);
  }

  const posts: StellaPost[] = (parsed.posts ?? []).map((p) => ({
    hook: p.hook ?? "",
    body: p.body ?? "",
    cta: p.cta ?? "",
    hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
    visual_prompt: p.visual_prompt ?? null,
    carrousel_slides: Array.isArray(p.carrousel_slides)
      ? p.carrousel_slides.map((s) => ({ title: s.title ?? "", body: s.body ?? "" }))
      : undefined,
    word_count: p.word_count ?? (p.body ?? "").split(/\s+/).filter(Boolean).length,
  }));

  return {
    framework: parsed.framework ?? "Hook-Story-Offer",
    channel: input.channel,
    format: input.format,
    posts,
    best_publish_time: parsed.best_publish_time ?? null,
    legal_notice: parsed.legal_notice ?? null,
    meta: { duration_ms: Date.now() - t0 },
  };
}

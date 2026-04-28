import { getAnthropic, MODELS } from "@/lib/anthropic";

// ============================================================
// Types
// ============================================================

export type FranckVideoKind =
  | "bien" // visite/présentation d'un bien
  | "estimation" // explainer estimation gratuite
  | "recrutement" // marque employeur
  | "temoignage" // témoignage client
  | "avant_apres" // home staging / rénovation
  | "actu_marche"; // décryptage marché local

export type FranckChannel = "reel" | "tiktok" | "youtube_short" | "youtube_long" | "linkedin";
export type FranckStyle = "cinematique" | "dynamique" | "cosy" | "premium" | "terrain" | "talking_head";

export type FranckInput = {
  video_kind: FranckVideoKind;
  channel: FranckChannel;
  duration_seconds: number;
  style: FranckStyle;
  topic: string;
  context: string;
  agency_name: string;
};

export type FranckShot = {
  index: number;
  start_sec: number;
  end_sec: number;
  description: string; // ce qui est filmé
  voiceover: string; // texte voix off (ou "—" si pas de VO)
  caption_text: string | null; // texte affiché à l'écran
  ai_video_prompt: string | null; // prompt prêt pour Runway/Luma/Kling/Veo si génération IA
};

export type FranckResult = {
  hook_3s: string;
  total_duration: number;
  shots: FranckShot[];
  voiceover_full: string; // narration complète assemblée
  caption_post: string; // légende du post quand publié
  hashtags: string[];
  music_brief: string;
  shot_list_to_film: string[]; // ce qu'il faut effectivement tourner sur place
  meta: { duration_ms: number };
};

// ============================================================
// Prompt
// ============================================================

const FRANCK_SYSTEM = `Tu es Franck, vidéaste immobilier IA d'Assistimmo. Tu produis des **scripts vidéo prêts à tourner ou à générer en IA**.

## Règles dures
- **Français impeccable**.
- **Hook 3 secondes obligatoire** sur tout reel/short/tiktok (sinon le viewer scrolle).
- **Show don't tell** : privilégie les plans concrets, narre en voix off le minimum.
- **Mentions légales** sur vidéos d'annonce : DPE + lettre + valeur, honoraires TTC + qui paye (loi ALUR). Indique-les dans le \`caption_post\`.
- **Pas de visuel de bien sans accord propriétaire** (rappel dans la légende si pertinent).
- **Pas de musique sous copyright** sans licence : suggérer banques libres (Pixabay, Uppbeat, Artlist).
- **Pas de visage tiers** sans consentement (RGPD image).
- Sortie **STRICTEMENT** un JSON. Pas de markdown, pas de \`\`\`.

## Cadence par canal
- **Reel / TikTok / YT Short** : 15-60s, plans courts (1-3s), captions burn-in obligatoires (90% des viewers son OFF)
- **YouTube long** : 3-10 min, plans 4-8s, voix off plus narrative
- **LinkedIn** : 30-90s, plans 3-5s, ton plus pro, captions obligatoires

## Format des plans (\`shots\`)
Découpe la vidéo en 6-15 plans selon la durée. Chaque plan :
- index : 1, 2, 3…
- start_sec, end_sec : timing précis
- description : ce qui est filmé (ex: "drone ascendant façade Haussmann lever de soleil")
- voiceover : texte exact (ou "—")
- caption_text : texte écran burn-in (court, ≤ 8 mots)
- ai_video_prompt : prompt Runway/Luma/Kling EN ANGLAIS, si la scène est générable IA (sinon null pour les plans à filmer en réel)`;

const SCHEMA_HINT = {
  hook_3s: "Première phrase ≤ 10 mots qui retient l'attention",
  total_duration: 30,
  shots: [
    {
      index: 1,
      start_sec: 0,
      end_sec: 3,
      description: "Drone ascendant façade Haussmann, lever de soleil",
      voiceover: "À deux pas du Bois de Boulogne…",
      caption_text: "Paris 16e · 105m²",
      ai_video_prompt: "Aerial drone shot of Haussmann facade at sunrise, golden light, Paris architecture, cinematic, 4K, slow rise, premium real estate",
    },
  ],
  voiceover_full: "Narration complète assemblée, prête à enregistrer ou synthétiser",
  caption_post: "Légende du post (avec mentions légales DPE/honoraires si bien)",
  hashtags: ["#immo", "#paris", "#immobilier"],
  music_brief: "Mood: élégant lounge piano · BPM ~80 · banques: Uppbeat / Artlist · keywords: 'sophisticated piano'",
  shot_list_to_film: [
    "Plan large façade depuis le trottoir d'en face",
    "Détail clef dans la serrure",
    "Travelling avant entrée → salon",
  ],
};

const KIND_LABEL: Record<FranckVideoKind, string> = {
  bien: "Présentation d'un bien à vendre",
  estimation: "Explainer estimation gratuite",
  recrutement: "Vidéo recrutement / marque employeur",
  temoignage: "Témoignage client",
  avant_apres: "Avant/après (home staging, rénovation)",
  actu_marche: "Décryptage du marché local",
};

const CHANNEL_LABEL: Record<FranckChannel, string> = {
  reel: "Reel Instagram",
  tiktok: "TikTok",
  youtube_short: "YouTube Short",
  youtube_long: "YouTube long",
  linkedin: "LinkedIn",
};

const STYLE_LABEL: Record<FranckStyle, string> = {
  cinematique: "Cinématique (drone, slow motion, lumière dorée)",
  dynamique: "Dynamique (cuts rapides, zooms, énergie)",
  cosy: "Cosy (lumière chaude, intérieurs, calme)",
  premium: "Premium (épuré, élégant, suspensions longues)",
  terrain: "Terrain (selfie, talking head, authentique)",
  talking_head: "Talking head (présentateur face caméra)",
};

// ============================================================
// Pipeline
// ============================================================

export async function runFranck(input: FranckInput): Promise<FranckResult> {
  const t0 = Date.now();
  const anthropic = getAnthropic();

  const userPrompt = `Génère un script vidéo pour cette mission :

**Type** : ${KIND_LABEL[input.video_kind]}
**Canal** : ${CHANNEL_LABEL[input.channel]}
**Durée** : ${input.duration_seconds}s
**Style** : ${STYLE_LABEL[input.style]}
**Sujet** : ${input.topic}
**Agence** : ${input.agency_name}

**Contexte / inputs disponibles** :
"""
${input.context}
"""

Retourne **UNIQUEMENT** un JSON conforme à ce schéma exemplaire (pas de markdown, pas de \`\`\`) :

${JSON.stringify(SCHEMA_HINT, null, 2)}

- Découpe en 6-15 plans selon la durée totale (durée moyenne d'un plan : 2-5s pour court, 4-8s pour long)
- Chaque plan a un \`ai_video_prompt\` EN ANGLAIS si la scène est générable par IA (drone, vues larges, transitions abstraites). Mets null pour les plans à filmer en réel (intérieur du bien spécifique, témoin client, agent face caméra).
- \`shot_list_to_film\` = la liste concrète de ce qu'il faut tourner sur place (utile pour briefer l'agent qui filme).
- \`caption_post\` doit inclure mentions légales DPE/honoraires si vidéo de bien.
- 8-15 hashtags pertinents selon canal.`;

  const response = await anthropic.messages.create({
    model: MODELS.standard,
    max_tokens: 3000,
    system: FRANCK_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Pas de texte dans la réponse Claude");
  }

  let cleaned = block.text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

  let parsed: {
    hook_3s?: string;
    total_duration?: number;
    shots?: Array<{
      index?: number;
      start_sec?: number;
      end_sec?: number;
      description?: string;
      voiceover?: string;
      caption_text?: string | null;
      ai_video_prompt?: string | null;
    }>;
    voiceover_full?: string;
    caption_post?: string;
    hashtags?: string[];
    music_brief?: string;
    shot_list_to_film?: string[];
  };

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Franck JSON invalide : ${cleaned.slice(0, 200)}`);
  }

  const shots: FranckShot[] = (parsed.shots ?? []).map((s, i) => ({
    index: s.index ?? i + 1,
    start_sec: s.start_sec ?? 0,
    end_sec: s.end_sec ?? 0,
    description: s.description ?? "",
    voiceover: s.voiceover ?? "",
    caption_text: s.caption_text ?? null,
    ai_video_prompt: s.ai_video_prompt ?? null,
  }));

  return {
    hook_3s: parsed.hook_3s ?? "",
    total_duration: parsed.total_duration ?? input.duration_seconds,
    shots,
    voiceover_full: parsed.voiceover_full ?? "",
    caption_post: parsed.caption_post ?? "",
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    music_brief: parsed.music_brief ?? "",
    shot_list_to_film: Array.isArray(parsed.shot_list_to_film) ? parsed.shot_list_to_film : [],
    meta: { duration_ms: Date.now() - t0 },
  };
}

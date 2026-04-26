import { getAnthropic, MODELS } from "@/lib/anthropic";
import { searchAdemeDpe, formatAdemeAddress, type AdemeListingMatch } from "./ademe";

// ============================================================
// Types
// ============================================================

export type ListingExtraction = {
  city: string | null;
  zipcode: string | null;
  surface_habitable: number | null;
  surface_terrain: number | null;
  rooms: number | null;
  floor: number | null;
  type: "apartment" | "house" | "land" | "commercial" | null;
  dpe_letter: string | null;
  ges_letter: string | null;
  dpe_year: number | null;
  price: number | null;
  agency_name: string | null;
  features: string[];
  notes: string | null;
};

export type AddressCandidate = {
  rank: number;
  address: string;
  score: number; // 0-100
  reasons: string[];
  source_match: AdemeListingMatch;
};

export type TomResult = {
  extraction: ListingExtraction;
  candidates: AddressCandidate[];
  recommendation: "boitage_immediat" | "enquete_complementaire" | "abandonner";
  priority: "haute" | "moyenne" | "basse";
  confidence: number; // 0-100 — score du meilleur candidat
  meta: {
    ademe_total_matches: number;
    duration_ms: number;
  };
};

// ============================================================
// 1. Extraction LLM des données structurées de l'annonce
// ============================================================

const EXTRACTION_SYSTEM = `Tu es Tom, enquêteur mandat immobilier d'Assistimmo. À partir d'un texte ou d'une URL d'annonce immobilière française, tu extrais les caractéristiques structurées du bien. Tu retournes un JSON STRICT, conforme au schéma. Ne devine pas : si une info est absente, mets null. Pas de prose, juste le JSON.`;

const EXTRACTION_SCHEMA = {
  type: "object",
  required: [
    "city",
    "zipcode",
    "surface_habitable",
    "surface_terrain",
    "rooms",
    "floor",
    "type",
    "dpe_letter",
    "ges_letter",
    "dpe_year",
    "price",
    "agency_name",
    "features",
    "notes",
  ],
  properties: {
    city: { type: ["string", "null"] },
    zipcode: { type: ["string", "null"] },
    surface_habitable: { type: ["number", "null"] },
    surface_terrain: { type: ["number", "null"] },
    rooms: { type: ["integer", "null"] },
    floor: { type: ["integer", "null"] },
    type: { type: ["string", "null"], enum: ["apartment", "house", "land", "commercial", null] },
    dpe_letter: { type: ["string", "null"], enum: ["A", "B", "C", "D", "E", "F", "G", null] },
    ges_letter: { type: ["string", "null"], enum: ["A", "B", "C", "D", "E", "F", "G", null] },
    dpe_year: { type: ["integer", "null"] },
    price: { type: ["number", "null"] },
    agency_name: { type: ["string", "null"] },
    features: { type: "array", items: { type: "string" } },
    notes: { type: ["string", "null"] },
  },
} as const;

export async function extractListing(input: string): Promise<ListingExtraction> {
  const anthropic = getAnthropic();

  const response = await anthropic.messages.create({
    model: MODELS.standard,
    max_tokens: 1024,
    system: EXTRACTION_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Voici l'annonce (URL ou texte). Extrait les données et retourne UNIQUEMENT un JSON conforme au schéma.

Schéma : ${JSON.stringify(EXTRACTION_SCHEMA)}

Annonce :
"""
${input}
"""

Réponds avec le JSON, et rien d'autre. Pas de markdown, pas de \`\`\`.`,
      },
    ],
  });

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Pas de texte dans la réponse Claude");
  }

  let cleaned = block.text.trim();
  // Tolérance : strip un éventuel ```json
  cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

  let parsed: ListingExtraction;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Extraction JSON invalide: ${cleaned.slice(0, 200)}`);
  }

  return {
    city: parsed.city ?? null,
    zipcode: parsed.zipcode ?? null,
    surface_habitable: parsed.surface_habitable ?? null,
    surface_terrain: parsed.surface_terrain ?? null,
    rooms: parsed.rooms ?? null,
    floor: parsed.floor ?? null,
    type: parsed.type ?? null,
    dpe_letter: parsed.dpe_letter ?? null,
    ges_letter: parsed.ges_letter ?? null,
    dpe_year: parsed.dpe_year ?? null,
    price: parsed.price ?? null,
    agency_name: parsed.agency_name ?? null,
    features: Array.isArray(parsed.features) ? parsed.features : [],
    notes: parsed.notes ?? null,
  };
}

// ============================================================
// 2. Scoring des candidats DPE
// ============================================================

function scoreCandidate(extraction: ListingExtraction, m: AdemeListingMatch): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Surface (poids 35)
  if (extraction.surface_habitable && m.surface_habitable_logement) {
    const diff = Math.abs(extraction.surface_habitable - m.surface_habitable_logement);
    if (diff <= 1) {
      score += 35;
      reasons.push(`Surface ${m.surface_habitable_logement}m² (match exact)`);
    } else if (diff <= 3) {
      score += 25;
      reasons.push(`Surface ${m.surface_habitable_logement}m² (proche, écart ${diff.toFixed(1)}m²)`);
    } else if (diff <= 8) {
      score += 10;
      reasons.push(`Surface ${m.surface_habitable_logement}m² (écart ${diff.toFixed(1)}m²)`);
    }
  }

  // DPE letter (poids 25)
  if (extraction.dpe_letter && m.etiquette_dpe && extraction.dpe_letter === m.etiquette_dpe) {
    score += 25;
    reasons.push(`DPE ${m.etiquette_dpe}`);
  }

  // GES letter (poids 10)
  if (extraction.ges_letter && m.etiquette_ges && extraction.ges_letter === m.etiquette_ges) {
    score += 10;
    reasons.push(`GES ${m.etiquette_ges}`);
  }

  // Année DPE (poids 15) — si l'annonce mentionne une année et le DPE est dans une fenêtre proche
  if (extraction.dpe_year && m.date_etablissement_dpe) {
    const year = parseInt(m.date_etablissement_dpe.slice(0, 4), 10);
    if (!isNaN(year)) {
      const diff = Math.abs(extraction.dpe_year - year);
      if (diff === 0) {
        score += 15;
        reasons.push(`DPE émis en ${year}`);
      } else if (diff <= 1) {
        score += 8;
        reasons.push(`DPE ${year} (±1 an)`);
      }
    }
  }

  // Type bâtiment (poids 10)
  if (extraction.type && m.type_batiment) {
    const t = m.type_batiment.toLowerCase();
    const isApt = t.includes("appart");
    const isHouse = t.includes("mais");
    if ((extraction.type === "apartment" && isApt) || (extraction.type === "house" && isHouse)) {
      score += 10;
      reasons.push(`Type ${m.type_batiment}`);
    }
  }

  // Code postal (poids 5 — bonus si match exact)
  if (extraction.zipcode && m.code_postal_ban && extraction.zipcode === m.code_postal_ban) {
    score += 5;
    reasons.push(`CP ${m.code_postal_ban}`);
  }

  return { score: Math.min(100, score), reasons };
}

// ============================================================
// 3. Pipeline complet TOM
// ============================================================

export async function runTom(input: string): Promise<TomResult> {
  const t0 = Date.now();

  // Étape 1 : extraction LLM
  const extraction = await extractListing(input);

  if (!extraction.city) {
    return {
      extraction,
      candidates: [],
      confidence: 0,
      recommendation: "abandonner",
      priority: "basse",
      meta: { ademe_total_matches: 0, duration_ms: Date.now() - t0 },
    };
  }

  // Étape 2 : ADEME query
  let matches: AdemeListingMatch[] = [];
  try {
    matches = await searchAdemeDpe({
      city: extraction.city,
      zipcode: extraction.zipcode ?? undefined,
      dpe_letter: extraction.dpe_letter ?? undefined,
      surface_min: extraction.surface_habitable ? Math.max(0, extraction.surface_habitable - 3) : undefined,
      surface_max: extraction.surface_habitable ? extraction.surface_habitable + 3 : undefined,
      size: 30,
    });
  } catch (err) {
    console.error("[TOM] ADEME error:", err);
  }

  // Étape 3 : scoring
  const scored = matches
    .map((m) => {
      const { score, reasons } = scoreCandidate(extraction, m);
      return { match: m, score, reasons };
    })
    .filter((s) => s.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const candidates: AddressCandidate[] = scored.map((s, i) => ({
    rank: i + 1,
    address: formatAdemeAddress(s.match),
    score: s.score,
    reasons: s.reasons,
    source_match: s.match,
  }));

  const top = candidates[0]?.score ?? 0;

  let recommendation: TomResult["recommendation"];
  let priority: TomResult["priority"];
  if (top >= 70) {
    recommendation = "boitage_immediat";
    priority = "haute";
  } else if (top >= 50) {
    recommendation = "enquete_complementaire";
    priority = "moyenne";
  } else {
    recommendation = "abandonner";
    priority = "basse";
  }

  return {
    extraction,
    candidates,
    confidence: top,
    recommendation,
    priority,
    meta: {
      ademe_total_matches: matches.length,
      duration_ms: Date.now() - t0,
    },
  };
}

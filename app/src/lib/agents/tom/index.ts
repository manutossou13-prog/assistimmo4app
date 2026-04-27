import { getAnthropic, MODELS } from "@/lib/anthropic";
import { searchAdemeDpe, formatAdemeAddress, type AdemeListingMatch } from "./ademe";
import { geocodeBan, type GeocodeResult } from "./geocode";
import { buildLocationVisuals, type LocationVisuals } from "./maps";
import { fetchListingText } from "./fetch-listing";
import { getParcelleAt, type CadastreParcelle } from "./cadastre";

// ============================================================
// Types
// ============================================================

export type ListingExtraction = {
  city: string | null;
  zipcode: string | null;
  neighborhood: string | null;
  street_hint: string | null;
  street_number_hint: string | null;
  surface_habitable: number | null;
  surface_terrain: number | null;
  rooms: number | null;
  floor: number | null;
  type: "apartment" | "house" | "land" | "commercial" | null;
  dpe_letter: string | null;
  ges_letter: string | null;
  dpe_year: number | null;
  conso_ep: number | null; // kWh/m²/an (énergie primaire) — TRÈS discriminant
  ges_emission: number | null; // kg CO2/m²/an — TRÈS discriminant
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
  geo: GeocodeResult | null;
  visuals: LocationVisuals | null;
  parcelle: CadastreParcelle | null;
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
    source: "url" | "text" | "manual";
  };
};

// ============================================================
// 1. Extraction LLM des données structurées de l'annonce
// ============================================================

const EXTRACTION_SYSTEM = `Tu es Tom, enquêteur mandat immobilier d'Assistimmo. À partir d'un texte d'annonce immobilière française, tu extrais les caractéristiques structurées du bien.

## Règles d'extraction
- **Ne devine JAMAIS**. Si une info n'est pas explicitement présente dans le texte, mets \`null\`.
- **N'utilise PAS de connaissances externes**. Tu ne dois PAS deviner l'adresse depuis l'URL ou le slug.
- Le **quartier** (\`neighborhood\`) est crucial pour les maisons/pavillons — extrais-le si mentionné (souvent dans l'URL slug ou le titre).
- **\`street_hint\`** : retiens le nom de rue UNIQUEMENT s'il est explicitement écrit ("rue de la République"). N'extrapole pas depuis l'agence ou le quartier.
- **\`surface_terrain\`** : capital pour les pavillons. Extrais "350m² de terrain", "jardin de 200m²", etc.
- **\`features\`** : 5-10 atouts distinctifs (sous-sol, cave, garage double, cheminée d'origine, etc.) — utiles pour discriminer.
- Sortie **STRICTEMENT** un JSON. Pas de markdown, pas de \`\`\`.`;

const EXTRACTION_SCHEMA_HINT = {
  city: "string | null",
  zipcode: "string | null (5 chiffres)",
  neighborhood: "string | null — quartier mentionné (ex: 'Petit Drancy', 'Vieux Lyon', 'Centre')",
  street_hint: "string | null — nom de rue/avenue/boulevard SI explicitement mentionné dans le texte",
  street_number_hint: "string | null — numéro de rue SI mentionné (ex: '121', '14 bis')",
  surface_habitable: "number | null (m²)",
  surface_terrain: "number | null (m² — IMPORTANT pour les maisons/pavillons)",
  rooms: "integer | null",
  floor: "integer | null (étage, 0 = RDC, null si maison)",
  type: "apartment | house | land | commercial | null",
  dpe_letter: "A..G | null",
  ges_letter: "A..G | null",
  dpe_year: "integer | null (année du DPE)",
  price: "number | null (€)",
  agency_name: "string | null (qui commercialise)",
  features: "string[] — équipements/atouts (jardin, garage, cheminée, etc.)",
  notes: "string | null — éléments distinctifs utiles à l'enquête",
};

export type ExtractionContext = {
  source: "url" | "text" | "manual";
  fetchedFrom?: string;
  truncated?: boolean;
};

// Inputs structurés saisis manuellement par l'utilisateur
export type TomManualInput = {
  city: string;
  zipcode?: string | null;
  type?: ListingExtraction["type"];
  surface_habitable?: number | null;
  surface_terrain?: number | null;
  rooms?: number | null;
  floor?: number | null;
  dpe_letter?: string | null;
  ges_letter?: string | null;
  dpe_year?: number | null;
  conso_ep?: number | null; // kWh/m²/an
  ges_emission?: number | null; // kg CO2/m²/an
  price?: number | null;
  agency_name?: string | null;
  source_url?: string | null;
  notes?: string | null;
};

export async function extractListing(
  rawInput: string
): Promise<{ extraction: ListingExtraction; context: ExtractionContext }> {
  const trimmed = rawInput.trim();
  let textForLLM = trimmed;
  const context: ExtractionContext = { source: "text" };

  // Si l'input est une URL → fetch le contenu
  if (/^https?:\/\//i.test(trimmed)) {
    const fetched = await fetchListingText(trimmed);
    if (!fetched.ok) {
      throw new Error(fetched.error);
    }
    textForLLM = fetched.text;
    context.source = "url";
    context.fetchedFrom = fetched.finalUrl;
    if (fetched.text.length > 80_000) {
      textForLLM = fetched.text.slice(0, 80_000);
      context.truncated = true;
    }
  }

  if (textForLLM.length < 30) {
    throw new Error("Le contenu de l'annonce est trop court pour une extraction fiable.");
  }

  const anthropic = getAnthropic();

  const response = await anthropic.messages.create({
    model: MODELS.standard,
    max_tokens: 1500,
    system: EXTRACTION_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Voici le contenu d'une annonce immobilière (texte brut extrait de la page). Retourne UNIQUEMENT un JSON conforme à ce schéma (pas de markdown, pas de \`\`\`) :

${JSON.stringify(EXTRACTION_SCHEMA_HINT, null, 2)}

Contenu de l'annonce :
"""
${textForLLM}
"""`,
      },
    ],
  });

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Pas de texte dans la réponse Claude");
  }

  let cleaned = block.text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

  let parsed: Partial<ListingExtraction>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Extraction JSON invalide: ${cleaned.slice(0, 200)}`);
  }

  const extraction: ListingExtraction = {
    city: parsed.city ?? null,
    zipcode: parsed.zipcode ?? null,
    neighborhood: parsed.neighborhood ?? null,
    street_hint: parsed.street_hint ?? null,
    street_number_hint: parsed.street_number_hint ?? null,
    surface_habitable: parsed.surface_habitable ?? null,
    surface_terrain: parsed.surface_terrain ?? null,
    rooms: parsed.rooms ?? null,
    floor: parsed.floor ?? null,
    type: parsed.type ?? null,
    dpe_letter: parsed.dpe_letter ?? null,
    ges_letter: parsed.ges_letter ?? null,
    dpe_year: parsed.dpe_year ?? null,
    conso_ep: parsed.conso_ep ?? null,
    ges_emission: parsed.ges_emission ?? null,
    price: parsed.price ?? null,
    agency_name: parsed.agency_name ?? null,
    features: Array.isArray(parsed.features) ? parsed.features : [],
    notes: parsed.notes ?? null,
  };

  return { extraction, context };
}

// ============================================================
// 2. Scoring des candidats DPE
// ============================================================

function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreCandidate(
  extraction: ListingExtraction,
  m: AdemeListingMatch,
  parcelle?: CadastreParcelle | null
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // ============================================================
  // ULTRA-DISCRIMINANTS (valeurs numériques précises)
  // ============================================================

  // Conso énergie kWh/m²/an (poids 30 — quasi-empreinte digitale du logement)
  if (extraction.conso_ep && m.conso_5_usages_par_m2_ep) {
    const diff = Math.abs(extraction.conso_ep - m.conso_5_usages_par_m2_ep);
    if (diff <= 3) {
      score += 30;
      reasons.push(`Conso ${m.conso_5_usages_par_m2_ep} kWh/m²/an (match)`);
    } else if (diff <= 10) {
      score += 18;
      reasons.push(`Conso ${m.conso_5_usages_par_m2_ep} kWh (écart ${diff.toFixed(0)})`);
    } else if (diff <= 25) {
      score += 5;
    }
  }

  // GES émission kg CO2/m²/an (poids 20)
  if (extraction.ges_emission && m.emission_ges_5_usages_par_m2) {
    const diff = Math.abs(extraction.ges_emission - m.emission_ges_5_usages_par_m2);
    if (diff <= 1) {
      score += 20;
      reasons.push(`GES ${m.emission_ges_5_usages_par_m2} kgCO2/m² (match)`);
    } else if (diff <= 3) {
      score += 12;
      reasons.push(`GES ${m.emission_ges_5_usages_par_m2} (écart ${diff.toFixed(1)})`);
    } else if (diff <= 8) {
      score += 4;
    }
  }

  // Cadastre — surface terrain (poids 25 — discriminant majeur pour pavillons)
  if (extraction.surface_terrain && parcelle?.contenance) {
    const diff = Math.abs(extraction.surface_terrain - parcelle.contenance);
    const ratio = diff / extraction.surface_terrain;
    if (ratio <= 0.05) {
      score += 25;
      reasons.push(`Terrain ${parcelle.contenance}m² (parcelle ${parcelle.section}-${parcelle.numero})`);
    } else if (ratio <= 0.15) {
      score += 15;
      reasons.push(`Terrain ${parcelle.contenance}m² (écart ${(ratio * 100).toFixed(0)}%)`);
    } else if (ratio <= 0.30) {
      score += 5;
    } else {
      // pénalité : terrain très différent de l'annonce
      score -= 15;
      reasons.push(`⚠ Terrain ${parcelle.contenance}m² ≠ ${extraction.surface_terrain}m²`);
    }
  }

  // ============================================================
  // SIGNAUX FORTS (mention explicite rue)
  // ============================================================

  if (extraction.street_hint && m.nom_rue_ban) {
    const e = normalize(extraction.street_hint);
    const a = normalize(m.nom_rue_ban);
    if (e && a) {
      const stripPrefix = (x: string) =>
        x.replace(/^(rue|avenue|av|boulevard|bd|bvd|allee|allée|impasse|chemin|place|cours|quai|route|rte) /, "");
      const eClean = stripPrefix(e);
      const aClean = stripPrefix(a);
      if (eClean === aClean || aClean.includes(eClean) || eClean.includes(aClean)) {
        score += 30;
        reasons.push(`Rue ${m.nom_rue_ban}`);
      }
    }
  }

  if (extraction.street_number_hint && m.numero_voie_ban) {
    const e = String(extraction.street_number_hint).replace(/\s/g, "").toLowerCase();
    const a = String(m.numero_voie_ban).replace(/\s/g, "").toLowerCase();
    if (e && a && (e === a || a.startsWith(e) || e.startsWith(a))) {
      score += 18;
      reasons.push(`N° ${m.numero_voie_ban}`);
    }
  }

  // ============================================================
  // SIGNAUX SECONDAIRES
  // ============================================================

  // Surface habitable (poids 18)
  if (extraction.surface_habitable && m.surface_habitable_logement) {
    const diff = Math.abs(extraction.surface_habitable - m.surface_habitable_logement);
    if (diff <= 1) {
      score += 18;
      reasons.push(`Surface ${m.surface_habitable_logement}m²`);
    } else if (diff <= 3) {
      score += 12;
    } else if (diff <= 8) {
      score += 5;
    }
  }

  // DPE letter (poids 8 si pas de valeur numérique sinon 4)
  if (extraction.dpe_letter && m.etiquette_dpe && extraction.dpe_letter === m.etiquette_dpe) {
    const w = extraction.conso_ep ? 4 : 8;
    score += w;
    reasons.push(`DPE ${m.etiquette_dpe}`);
  }

  // GES letter
  if (extraction.ges_letter && m.etiquette_ges && extraction.ges_letter === m.etiquette_ges) {
    const w = extraction.ges_emission ? 3 : 6;
    score += w;
  }

  // Année DPE (poids 6)
  if (extraction.dpe_year && m.date_etablissement_dpe) {
    const year = parseInt(m.date_etablissement_dpe.slice(0, 4), 10);
    if (!isNaN(year)) {
      const diff = Math.abs(extraction.dpe_year - year);
      if (diff === 0) {
        score += 6;
        reasons.push(`DPE ${year}`);
      } else if (diff <= 1) {
        score += 3;
      }
    }
  }

  // Type bâtiment (poids 6 / pénalité -25 si incohérent)
  if (extraction.type && m.type_batiment) {
    const t = m.type_batiment.toLowerCase();
    const isApt = t.includes("appart");
    const isHouse = t.includes("mais");
    if ((extraction.type === "apartment" && isApt) || (extraction.type === "house" && isHouse)) {
      score += 6;
      reasons.push(`Type ${m.type_batiment}`);
    } else if (
      (extraction.type === "apartment" && isHouse) ||
      (extraction.type === "house" && isApt)
    ) {
      score -= 25;
      reasons.push(`⚠ Type ${m.type_batiment} ≠ annonce`);
    }
  }

  // CP
  if (extraction.zipcode && m.code_postal_ban && extraction.zipcode === m.code_postal_ban) {
    score += 3;
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

// ============================================================
// 3. Pipeline complet TOM
// ============================================================

/**
 * Si l'utilisateur a fourni des "notes" (texte libre / description), on demande à Claude
 * de tirer 3 indices d'adresse (rue, numéro, quartier). Léger appel Haiku.
 * Si pas de notes ou échec → on renvoie tout à null.
 */
async function extractHintsFromNotes(notes: string | null | undefined): Promise<{
  neighborhood: string | null;
  street_hint: string | null;
  street_number_hint: string | null;
  features: string[];
}> {
  if (!notes || notes.trim().length < 20) {
    return { neighborhood: null, street_hint: null, street_number_hint: null, features: [] };
  }
  try {
    const anthropic = getAnthropic();
    const r = await anthropic.messages.create({
      model: MODELS.fast,
      max_tokens: 400,
      system: `Tu extrais des indices d'adresse depuis une description d'annonce immobilière. Si une info n'est pas EXPLICITEMENT mentionnée, mets null. Pas d'invention. Sortie JSON strict.`,
      messages: [
        {
          role: "user",
          content: `Extrait 4 champs depuis cette description :
- neighborhood : nom de quartier mentionné (ex: "Petit Drancy", "Centre", "Vieux Lyon"), null sinon
- street_hint : nom de rue/avenue mentionné (ex: "rue de la République"), null sinon. NE DEVINE PAS depuis l'agence.
- street_number_hint : numéro de rue mentionné, null sinon
- features : 5-10 atouts/équipements distinctifs (jardin, garage, cheminée, sous-sol, terrasse...)

Réponds UNIQUEMENT avec un JSON {neighborhood, street_hint, street_number_hint, features:[]} (pas de markdown).

Description :
"""
${notes.slice(0, 4000)}
"""`,
        },
      ],
    });
    const block = r.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") throw new Error("no text");
    let cleaned = block.text.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned);
    return {
      neighborhood: parsed.neighborhood ?? null,
      street_hint: parsed.street_hint ?? null,
      street_number_hint: parsed.street_number_hint ?? null,
      features: Array.isArray(parsed.features) ? parsed.features : [],
    };
  } catch (err) {
    console.error("[TOM] extractHintsFromNotes error:", err);
    return { neighborhood: null, street_hint: null, street_number_hint: null, features: [] };
  }
}

/**
 * Pipeline TOM en mode MANUEL — l'utilisateur saisit directement les caractéristiques.
 * Pas de Claude pour les champs structurés, juste pour les notes optionnelles.
 */
export async function runTomManual(input: TomManualInput): Promise<TomResult> {
  const t0 = Date.now();

  // Extrait éventuels hints depuis notes libres
  const hints = await extractHintsFromNotes(input.notes ?? null);

  const extraction: ListingExtraction = {
    city: input.city || null,
    zipcode: input.zipcode ?? null,
    neighborhood: hints.neighborhood,
    street_hint: hints.street_hint,
    street_number_hint: hints.street_number_hint,
    surface_habitable: input.surface_habitable ?? null,
    surface_terrain: input.surface_terrain ?? null,
    rooms: input.rooms ?? null,
    floor: input.floor ?? null,
    type: input.type ?? null,
    dpe_letter: input.dpe_letter ?? null,
    ges_letter: input.ges_letter ?? null,
    dpe_year: input.dpe_year ?? null,
    conso_ep: input.conso_ep ?? null,
    ges_emission: input.ges_emission ?? null,
    price: input.price ?? null,
    agency_name: input.agency_name ?? null,
    features: hints.features,
    notes: input.notes ?? null,
  };

  if (!extraction.city) {
    return {
      extraction,
      candidates: [],
      confidence: 0,
      recommendation: "abandonner",
      priority: "basse",
      meta: { ademe_total_matches: 0, duration_ms: Date.now() - t0, source: "manual" },
    };
  }

  // ADEME query — élargir si valeurs numériques (plus discriminant ensuite)
  let matches: AdemeListingMatch[] = [];
  try {
    matches = await searchAdemeDpe({
      city: extraction.city,
      zipcode: extraction.zipcode ?? undefined,
      dpe_letter: extraction.dpe_letter ?? undefined,
      surface_min: extraction.surface_habitable ? Math.max(0, extraction.surface_habitable - 5) : undefined,
      surface_max: extraction.surface_habitable ? extraction.surface_habitable + 5 : undefined,
      size: 80,
    });
  } catch (err) {
    console.error("[TOM] ADEME error:", err);
  }

  // Pré-scoring (sans cadastre) pour ne garder que le top 8 à enrichir
  const preScored = matches
    .map((m) => {
      const { score, reasons } = scoreCandidate(extraction, m);
      return { match: m, score, reasons };
    })
    .filter((s) => s.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  // Enrichissement : géocodage + cadastre pour le top 8 en parallèle
  const enriched = await Promise.all(
    preScored.map(async (s) => {
      const address = formatAdemeAddress(s.match);
      const geo = await geocodeBan(address, s.match.code_postal_ban);
      const parcelle = geo ? await getParcelleAt(geo.lat, geo.lng) : null;
      // Re-score avec cadastre si dispo
      const final = parcelle
        ? scoreCandidate(extraction, s.match, parcelle)
        : { score: s.score, reasons: s.reasons };
      return { match: s.match, address, geo, parcelle, ...final };
    })
  );

  // Top 5 après cadastre
  const finalSorted = enriched
    .filter((e) => e.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const candidates: AddressCandidate[] = finalSorted.map((s, i) => {
    const visuals = s.geo ? buildLocationVisuals(s.geo.lat, s.geo.lng) : null;
    return {
      rank: i + 1,
      address: s.address,
      score: s.score,
      reasons: s.reasons,
      source_match: s.match,
      geo: s.geo,
      visuals,
      parcelle: s.parcelle,
    };
  });

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
      source: "manual",
    },
  };
}

export async function runTom(input: string): Promise<TomResult> {
  const t0 = Date.now();

  // Étape 1 : extraction LLM (avec fetch URL automatique)
  const { extraction, context } = await extractListing(input);

  if (!extraction.city) {
    return {
      extraction,
      candidates: [],
      confidence: 0,
      recommendation: "abandonner",
      priority: "basse",
      meta: { ademe_total_matches: 0, duration_ms: Date.now() - t0, source: context.source },
    };
  }

  // Étape 2 : ADEME query — élargie si surface_habitable connue (±5m² au lieu de ±3)
  // pour ne pas rater le bon candidat à cause d'un m² d'écart de mesure
  let matches: AdemeListingMatch[] = [];
  try {
    matches = await searchAdemeDpe({
      city: extraction.city,
      zipcode: extraction.zipcode ?? undefined,
      dpe_letter: extraction.dpe_letter ?? undefined,
      surface_min: extraction.surface_habitable ? Math.max(0, extraction.surface_habitable - 5) : undefined,
      surface_max: extraction.surface_habitable ? extraction.surface_habitable + 5 : undefined,
      size: 50,
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

  const baseCandidates = scored.map((s, i) => ({
    rank: i + 1,
    address: formatAdemeAddress(s.match),
    score: s.score,
    reasons: s.reasons,
    source_match: s.match,
  }));

  // Étape 4 : géocodage du top 3 + URLs visuelles (en parallèle, best-effort)
  const candidates: AddressCandidate[] = await Promise.all(
    baseCandidates.map(async (c) => {
      if (c.rank > 3) return { ...c, geo: null, visuals: null, parcelle: null };
      const geo = await geocodeBan(c.address, c.source_match.code_postal_ban);
      const visuals = geo ? buildLocationVisuals(geo.lat, geo.lng) : null;
      const parcelle = geo ? await getParcelleAt(geo.lat, geo.lng) : null;
      return { ...c, geo, visuals, parcelle };
    })
  );

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
      source: context.source,
    },
  };
}

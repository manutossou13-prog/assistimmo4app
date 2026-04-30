/**
 * ADEME — API DPE (logements existants depuis juillet 2021).
 * Source officielle : https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant
 * Public, gratuit, pas de clé requise. ~600 req/min.
 *
 * Approche dérivée de parcellai.re : filtrage par CODE POSTAL (exact match BAN)
 * pour des résultats fiables, scoring numérique sur conso/GES/surface/date.
 *
 * Note : ce dataset utilise des noms de champs avec accents et parenthèses
 * (héritage du standard officiel ADEME). On les conserve tels quels et
 * on remappe en interne vers des noms TS-friendly.
 */

const ADEME_DATASET = "dpe03existant";
const ADEME_BASE = `https://data.ademe.fr/data-fair/api/v1/datasets/${ADEME_DATASET}/lines`;
const GEOPF_GEOCODE = "https://data.geopf.fr/geocodage/search";

const SELECT_FIELDS = [
  "N°DPE",
  "Etiquette_DPE",
  "Etiquette_GES",
  "Conso_5_usages_par_m__finale", // kWh/m²/an
  "Emission_GES_5_usages_par_m_", // kg CO₂/m²/an
  "Surface_habitable_logement",
  "Date_établissement_DPE",
  "Adresse_(BAN)",
  "Code_postal_(BAN)",
  "Nom__commune_(BAN)",
  "Type_bâtiment",
  "Année_construction",
  "Coordonnée_cartographique_X_(BAN)",
  "Coordonnée_cartographique_Y_(BAN)",
].join(",");

export type AdemeListingMatch = {
  numero_dpe?: string;
  etiquette_dpe?: string;
  etiquette_ges?: string;
  conso_5_usages_par_m2_finale?: number; // kWh/m²/an
  emission_ges_5_usages_par_m2?: number; // kg CO₂/m²/an
  surface_habitable_logement?: number;
  date_etablissement_dpe?: string;
  adresse_ban?: string;
  code_postal_ban?: string;
  nom_commune_ban?: string;
  type_batiment?: string;
  annee_construction?: number;
  lat?: number; // coords directement dans le dataset
  lng?: number;
  numero_voie_ban?: string; // legacy / vide
  nom_rue_ban?: string; // legacy / vide
  raw: Record<string, unknown>;
};

export type AdemeQuery = {
  city?: string;
  zipcode?: string;
  dpe_letter?: string;
  ges_letter?: string;
  type_batiment?: "maison" | "appartement" | "immeuble";
  size?: number;
};

/**
 * Résout un nom de ville en code postal via la Géoplateforme IGN (gratuit, sans clé).
 */
export async function resolveZipcodeFromCity(city: string): Promise<string | null> {
  try {
    const url = `${GEOPF_GEOCODE}?q=${encodeURIComponent(city)}&limit=1&type=municipality`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{ properties?: { postcode?: string } }>;
    };
    return data.features?.[0]?.properties?.postcode ?? null;
  } catch {
    return null;
  }
}

export async function searchAdemeDpe(query: AdemeQuery): Promise<AdemeListingMatch[]> {
  let zipcode = query.zipcode ?? null;

  if (!zipcode && query.city) {
    zipcode = await resolveZipcodeFromCity(query.city);
  }

  if (!zipcode) {
    throw new Error(
      `Impossible de résoudre la ville "${query.city ?? "?"}" en code postal. Fournis le code postal directement.`
    );
  }

  const filtres: string[] = [];
  filtres.push(`Code_postal_(BAN):"${zipcode}"`);

  if (query.dpe_letter) filtres.push(`Etiquette_DPE:"${query.dpe_letter}"`);
  if (query.ges_letter) filtres.push(`Etiquette_GES:"${query.ges_letter}"`);

  if (query.type_batiment) {
    const mapping: Record<string, string> = {
      maison: "Maison",
      appartement: "Appartement",
      immeuble: "Immeuble",
    };
    const tb = mapping[query.type_batiment];
    if (tb) filtres.push(`Type_bâtiment:"${tb}"`);
  }

  const params = new URLSearchParams();
  params.set("qs", filtres.join(" AND "));
  params.set("size", String(query.size ?? 200));
  params.set("select", SELECT_FIELDS);

  const url = `${ADEME_BASE}?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Assistimmo/0.1 (+https://myassistimmoai.com)",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ADEME API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { results?: Record<string, unknown>[] };
  const results = Array.isArray(data.results) ? data.results : [];

  return results.map((r) => {
    const lat = (r["Coordonnée_cartographique_Y_(BAN)"] as number | undefined) ?? undefined;
    const lng = (r["Coordonnée_cartographique_X_(BAN)"] as number | undefined) ?? undefined;
    return {
      numero_dpe: r["N°DPE"] as string | undefined,
      etiquette_dpe: r["Etiquette_DPE"] as string | undefined,
      etiquette_ges: r["Etiquette_GES"] as string | undefined,
      conso_5_usages_par_m2_finale: r["Conso_5_usages_par_m__finale"] as number | undefined,
      emission_ges_5_usages_par_m2: r["Emission_GES_5_usages_par_m_"] as number | undefined,
      surface_habitable_logement: r["Surface_habitable_logement"] as number | undefined,
      date_etablissement_dpe: r["Date_établissement_DPE"] as string | undefined,
      adresse_ban: r["Adresse_(BAN)"] as string | undefined,
      code_postal_ban: r["Code_postal_(BAN)"] as string | undefined,
      nom_commune_ban: r["Nom__commune_(BAN)"] as string | undefined,
      type_batiment: r["Type_bâtiment"] as string | undefined,
      annee_construction: r["Année_construction"] as number | undefined,
      lat,
      lng,
      raw: r,
    };
  });
}

export function formatAdemeAddress(m: AdemeListingMatch): string {
  return (
    m.adresse_ban ||
    `${m.code_postal_ban ?? ""} ${m.nom_commune_ban ?? ""}`.trim() ||
    "Adresse inconnue"
  );
}

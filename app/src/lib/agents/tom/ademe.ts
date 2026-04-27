/**
 * ADEME — API DPE (logements existants depuis juillet 2021).
 * Source officielle : https://data.ademe.fr/data-fair/api/v1/datasets/meg-83tjwtg8dyz4vv7h1dqe
 * Public, gratuit, pas de clé requise. Mis à jour quotidiennement.
 *
 * Pour les biens construits avant juillet 2021 sans DPE renouvelé, le dataset
 * "dpe-france" peut être utilisé en fallback (mais nombreux DPE expirés).
 */

const ADEME_DATASET = "meg-83tjwtg8dyz4vv7h1dqe";
const ADEME_BASE = `https://data.ademe.fr/data-fair/api/v1/datasets/${ADEME_DATASET}/lines`;

const SELECT_FIELDS = [
  "numero_dpe",
  "date_etablissement_dpe",
  "etiquette_dpe",
  "etiquette_ges",
  "surface_habitable_logement",
  "type_batiment",
  "annee_construction",
  "adresse_ban",
  "numero_voie_ban",
  "nom_rue_ban",
  "nom_commune_ban",
  "code_postal_ban",
  "complement_adresse_logement",
  "conso_5_usages_par_m2_ep",
  "emission_ges_5_usages_par_m2",
].join(",");

export type AdemeListingMatch = {
  numero_dpe?: string;
  date_etablissement_dpe?: string;
  etiquette_dpe?: string; // A..G
  etiquette_ges?: string;
  surface_habitable_logement?: number;
  type_batiment?: string;
  annee_construction?: number;
  adresse_ban?: string;
  numero_voie_ban?: string;
  nom_rue_ban?: string;
  nom_commune_ban?: string;
  code_postal_ban?: string;
  complement_adresse_logement?: string;
  conso_5_usages_par_m2_ep?: number; // kWh/m²/an (énergie primaire)
  emission_ges_5_usages_par_m2?: number; // kg CO2/m²/an
  raw: Record<string, unknown>;
};

export type AdemeQuery = {
  city?: string;
  zipcode?: string;
  dpe_letter?: string;
  surface_min?: number;
  surface_max?: number;
  size?: number;
};

export async function searchAdemeDpe(query: AdemeQuery): Promise<AdemeListingMatch[]> {
  const params = new URLSearchParams();
  params.set("size", String(query.size ?? 30));
  params.set("select", SELECT_FIELDS);

  const filters: string[] = [];
  if (query.city) filters.push(`nom_commune_ban:"${escapeQs(query.city)}"`);
  if (query.zipcode) filters.push(`code_postal_ban:${query.zipcode}`);
  if (query.dpe_letter) filters.push(`etiquette_dpe:${query.dpe_letter}`);
  if (query.surface_min !== undefined || query.surface_max !== undefined) {
    const lo = query.surface_min ?? "*";
    const hi = query.surface_max ?? "*";
    filters.push(`surface_habitable_logement:[${lo} TO ${hi}]`);
  }

  if (filters.length > 0) params.set("qs", filters.join(" AND "));

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

  return results.map((r) => ({
    numero_dpe: r.numero_dpe as string | undefined,
    date_etablissement_dpe: r.date_etablissement_dpe as string | undefined,
    etiquette_dpe: r.etiquette_dpe as string | undefined,
    etiquette_ges: r.etiquette_ges as string | undefined,
    surface_habitable_logement: r.surface_habitable_logement as number | undefined,
    type_batiment: r.type_batiment as string | undefined,
    annee_construction: r.annee_construction as number | undefined,
    adresse_ban: r.adresse_ban as string | undefined,
    numero_voie_ban: r.numero_voie_ban as string | undefined,
    nom_rue_ban: r.nom_rue_ban as string | undefined,
    nom_commune_ban: r.nom_commune_ban as string | undefined,
    code_postal_ban: r.code_postal_ban as string | undefined,
    complement_adresse_logement: r.complement_adresse_logement as string | undefined,
    conso_5_usages_par_m2_ep: r.conso_5_usages_par_m2_ep as number | undefined,
    emission_ges_5_usages_par_m2: r.emission_ges_5_usages_par_m2 as number | undefined,
    raw: r,
  }));
}

function escapeQs(value: string): string {
  return value.replace(/"/g, '\\"');
}

export function formatAdemeAddress(m: AdemeListingMatch): string {
  if (m.adresse_ban) return m.adresse_ban;
  const parts = [m.numero_voie_ban, m.nom_rue_ban].filter(Boolean).join(" ").trim();
  const cp = [m.code_postal_ban, m.nom_commune_ban].filter(Boolean).join(" ");
  return [parts, cp].filter(Boolean).join(", ") || "Adresse inconnue";
}

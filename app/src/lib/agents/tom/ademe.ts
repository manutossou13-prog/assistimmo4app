/**
 * ADEME — API DPE (logements existants).
 * Source : https://data.ademe.fr (jeu DPE-existant)
 * Endpoint public, pas de clé requise, rate-limit raisonnable.
 *
 * On utilise le proxy Koumoul (data-fair) qui expose la même donnée.
 * Doc : https://koumoul.com/openapi-viewer/?proxy=false&url=https://koumoul.com/data-fair/api/v1/datasets/dpe-france/api-docs.json
 */

const ADEME_BASE = "https://koumoul.com/data-fair/api/v1/datasets/dpe-france/lines";

export type AdemeListingMatch = {
  numero_dpe?: string;
  date_etablissement_dpe?: string;
  classe_consommation_energie?: string; // A..G
  classe_estimation_ges?: string;
  surface_habitable?: number;
  type_batiment?: string;
  annee_construction?: number;
  adresse_brut?: string;
  numero_voie?: string;
  type_voie?: string;
  nom_rue?: string;
  code_postal?: string;
  commune?: string;
  latitude?: number;
  longitude?: number;
  raw: Record<string, unknown>;
};

export type AdemeQuery = {
  city?: string;
  zipcode?: string;
  dpe_letter?: string;
  surface_min?: number;
  surface_max?: number;
  year_min?: number;
  year_max?: number;
  size?: number;
};

/**
 * Récupère les DPE correspondant aux critères. Retourne au plus `size` résultats (défaut 30).
 */
export async function searchAdemeDpe(query: AdemeQuery): Promise<AdemeListingMatch[]> {
  const params = new URLSearchParams();
  params.set("size", String(query.size ?? 30));
  params.set(
    "select",
    [
      "numero_dpe",
      "date_etablissement_dpe",
      "classe_consommation_energie",
      "classe_estimation_ges",
      "surface_habitable",
      "type_batiment",
      "annee_construction",
      "adresse_brut",
      "numero_voie",
      "type_voie",
      "nom_rue",
      "code_postal",
      "commune",
      "latitude",
      "longitude",
    ].join(",")
  );

  const filters: string[] = [];
  if (query.city) filters.push(`commune:"${escapeQs(query.city)}"`);
  if (query.zipcode) filters.push(`code_postal:"${query.zipcode}"`);
  if (query.dpe_letter) filters.push(`classe_consommation_energie:${query.dpe_letter}`);

  if (filters.length > 0) params.set("qs", filters.join(" AND "));

  if (query.surface_min || query.surface_max) {
    params.set(
      "qs",
      [
        params.get("qs"),
        `surface_habitable:[${query.surface_min ?? "*"} TO ${query.surface_max ?? "*"}]`,
      ]
        .filter(Boolean)
        .join(" AND ")
    );
  }

  const url = `${ADEME_BASE}?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Assistimmo/0.1 (+https://myassistimmoai.com)" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`ADEME API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { results?: Record<string, unknown>[] };
  const results = Array.isArray(data.results) ? data.results : [];

  return results.map((r) => ({
    numero_dpe: r.numero_dpe as string | undefined,
    date_etablissement_dpe: r.date_etablissement_dpe as string | undefined,
    classe_consommation_energie: r.classe_consommation_energie as string | undefined,
    classe_estimation_ges: r.classe_estimation_ges as string | undefined,
    surface_habitable: r.surface_habitable as number | undefined,
    type_batiment: r.type_batiment as string | undefined,
    annee_construction: r.annee_construction as number | undefined,
    adresse_brut: r.adresse_brut as string | undefined,
    numero_voie: r.numero_voie as string | undefined,
    type_voie: r.type_voie as string | undefined,
    nom_rue: r.nom_rue as string | undefined,
    code_postal: r.code_postal as string | undefined,
    commune: r.commune as string | undefined,
    latitude: r.latitude as number | undefined,
    longitude: r.longitude as number | undefined,
    raw: r,
  }));
}

function escapeQs(value: string): string {
  return value.replace(/"/g, '\\"');
}

export function formatAdemeAddress(m: AdemeListingMatch): string {
  const parts = [m.numero_voie, m.type_voie, m.nom_rue].filter(Boolean).join(" ").trim();
  const cp = [m.code_postal, m.commune].filter(Boolean).join(" ");
  const full = [parts, cp].filter(Boolean).join(", ");
  return full || m.adresse_brut || "Adresse inconnue";
}

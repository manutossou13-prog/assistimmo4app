/**
 * ADEME — API DPE (logements existants depuis juillet 2021).
 * Source officielle : https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant
 * Public, gratuit, pas de clé requise. ~600 req/min.
 *
 * Approche héritée de parcellai.re :
 *  - Filtrage strict par CODE POSTAL (code_postal_ban exact match)
 *  - Résolution ville → CP via Géoplateforme IGN si pas de CP fourni
 *  - Scoring numérique sur conso (kWh) / GES (kg CO₂) / surface / date
 *  - Coordonnées GPS DANS le dataset (Lambert 93 → conversion WGS84 inline)
 *
 * IMPORTANT : noms de champs en lowercase snake_case (vrais noms du dataset),
 * valeurs `type_batiment` en lowercase ("maison", "appartement", "immeuble").
 */

const ADEME_DATASET = "dpe03existant";
const ADEME_BASE = `https://data.ademe.fr/data-fair/api/v1/datasets/${ADEME_DATASET}/lines`;
const GEOPF_GEOCODE = "https://data.geopf.fr/geocodage/search";

const SELECT_FIELDS = [
  "numero_dpe",
  "etiquette_dpe",
  "etiquette_ges",
  "conso_5_usages_par_m2_ep",
  "emission_ges_5_usages_par_m2",
  "surface_habitable_logement",
  "date_etablissement_dpe",
  "adresse_ban",
  "code_postal_ban",
  "nom_commune_ban",
  "type_batiment",
  "annee_construction",
  "coordonnee_cartographique_x_ban",
  "coordonnee_cartographique_y_ban",
].join(",");

export type AdemeListingMatch = {
  numero_dpe?: string;
  etiquette_dpe?: string;
  etiquette_ges?: string;
  conso_5_usages_par_m2_finale?: number; // mappé depuis conso_5_usages_par_m2_ep
  emission_ges_5_usages_par_m2?: number;
  surface_habitable_logement?: number;
  date_etablissement_dpe?: string;
  adresse_ban?: string;
  code_postal_ban?: string;
  nom_commune_ban?: string;
  type_batiment?: string;
  annee_construction?: number;
  lat?: number;
  lng?: number;
  numero_voie_ban?: string; // legacy/vide
  nom_rue_ban?: string; // legacy/vide
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
  filtres.push(`code_postal_ban:"${zipcode}"`);
  if (query.dpe_letter) filtres.push(`etiquette_dpe:"${query.dpe_letter.toUpperCase()}"`);
  if (query.ges_letter) filtres.push(`etiquette_ges:"${query.ges_letter.toUpperCase()}"`);
  if (query.type_batiment) {
    filtres.push(`type_batiment:"${query.type_batiment}"`);
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
    // ADEME stocke les coords en Lambert 93 (EPSG:2154) — il FAUT convertir en WGS84
    const x = r.coordonnee_cartographique_x_ban as number | undefined;
    const y = r.coordonnee_cartographique_y_ban as number | undefined;
    let lat: number | undefined;
    let lng: number | undefined;
    if (x != null && y != null) {
      if (Math.abs(x) <= 180 && Math.abs(y) <= 90) {
        // déjà WGS84
        lat = y;
        lng = x;
      } else {
        const wgs = lambert93ToWgs84(x, y);
        lat = wgs.lat;
        lng = wgs.lng;
      }
    }
    return {
      numero_dpe: r.numero_dpe as string | undefined,
      etiquette_dpe: r.etiquette_dpe as string | undefined,
      etiquette_ges: r.etiquette_ges as string | undefined,
      conso_5_usages_par_m2_finale: r.conso_5_usages_par_m2_ep as number | undefined,
      emission_ges_5_usages_par_m2: r.emission_ges_5_usages_par_m2 as number | undefined,
      surface_habitable_logement: r.surface_habitable_logement as number | undefined,
      date_etablissement_dpe: r.date_etablissement_dpe as string | undefined,
      adresse_ban: r.adresse_ban as string | undefined,
      code_postal_ban: r.code_postal_ban as string | undefined,
      nom_commune_ban: r.nom_commune_ban as string | undefined,
      type_batiment: r.type_batiment as string | undefined,
      annee_construction: r.annee_construction as number | undefined,
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

/**
 * Lambert 93 (EPSG:2154) → WGS84 (lat/lng).
 * Précision suffisante pour Maps / Street View (quelques mètres).
 */
function lambert93ToWgs84(x: number, y: number): { lat: number; lng: number } {
  const n = 0.7256077650532670;
  const c = 11754255.4261;
  const xs = 700000;
  const ys = 12655612.0499;
  const e = 0.0818191910428158;

  const dx = x - xs;
  const dy = y - ys;
  const r = Math.sqrt(dx * dx + dy * dy);
  const gamma = Math.atan(-dx / dy);
  const lng = gamma / n + (3 * Math.PI) / 180;
  const latIso = -Math.log(Math.abs(r / c)) / n;

  let phi = 2 * Math.atan(Math.exp(latIso)) - Math.PI / 2;
  for (let i = 0; i < 8; i++) {
    const eSinPhi = e * Math.sin(phi);
    phi =
      2 *
        Math.atan(
          Math.pow((1 + eSinPhi) / (1 - eSinPhi), e / 2) * Math.exp(latIso)
        ) -
      Math.PI / 2;
  }

  return { lat: (phi * 180) / Math.PI, lng: (lng * 180) / Math.PI };
}

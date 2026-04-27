/**
 * IGN APICarto — Cadastre.
 * Récupère la parcelle cadastrale aux coordonnées données + sa surface (contenance).
 * Public, pas de clé requise. Source : https://apicarto.ign.fr/api/doc/cadastre
 *
 * La `contenance` est exprimée en m² (surface totale de la parcelle).
 */

const APICARTO_BASE = "https://apicarto.ign.fr/api/cadastre/parcelle";

export type CadastreParcelle = {
  contenance: number | null; // m² total (terrain)
  numero: string | null;
  section: string | null;
  commune: string | null;
  code_dep: string | null;
  code_com: string | null;
  code_arr: string | null;
  raw: Record<string, unknown>;
};

export async function getParcelleAt(lat: number, lng: number): Promise<CadastreParcelle | null> {
  try {
    const geom = encodeURIComponent(JSON.stringify({ type: "Point", coordinates: [lng, lat] }));
    const url = `${APICARTO_BASE}?geom=${geom}&_limit=1`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Assistimmo/0.1 (+https://myassistimmoai.com)",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{
        properties?: {
          contenance?: number;
          numero?: string;
          section?: string;
          commune?: string;
          code_dep?: string;
          code_com?: string;
          code_arr?: string;
        };
      }>;
    };
    const top = data.features?.[0];
    if (!top || !top.properties) return null;
    return {
      contenance: top.properties.contenance ?? null,
      numero: top.properties.numero ?? null,
      section: top.properties.section ?? null,
      commune: top.properties.commune ?? null,
      code_dep: top.properties.code_dep ?? null,
      code_com: top.properties.code_com ?? null,
      code_arr: top.properties.code_arr ?? null,
      raw: top.properties as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

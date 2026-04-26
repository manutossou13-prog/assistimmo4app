/**
 * Géocodage gratuit via la Base Adresse Nationale (BAN — api-adresse.data.gouv.fr).
 * Pas de clé requise. Données mises à jour par l'IGN/INSEE.
 */

const BAN_BASE = "https://api-adresse.data.gouv.fr/search/";

export type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
  postcode?: string;
  city?: string;
  score: number; // 0-1
};

export async function geocodeBan(query: string, postcode?: string): Promise<GeocodeResult | null> {
  if (!query.trim()) return null;

  const params = new URLSearchParams({
    q: query,
    limit: "1",
    autocomplete: "0",
  });
  if (postcode) params.set("postcode", postcode);

  try {
    const res = await fetch(`${BAN_BASE}?${params.toString()}`, {
      headers: { Accept: "application/json", "User-Agent": "Assistimmo/0.1 (+https://myassistimmoai.com)" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      features?: Array<{
        geometry: { coordinates: [number, number] };
        properties: { score: number; label: string; postcode?: string; city?: string };
      }>;
    };

    const top = data.features?.[0];
    if (!top || top.properties.score < 0.4) return null;

    return {
      lat: top.geometry.coordinates[1],
      lng: top.geometry.coordinates[0],
      label: top.properties.label,
      postcode: top.properties.postcode,
      city: top.properties.city,
      score: top.properties.score,
    };
  } catch {
    return null;
  }
}

/**
 * URLs prêtes à l'emploi pour visualiser une adresse :
 *  - osmStaticMap : carte OSM (gratuite, sans clé)
 *  - googleStreetView : photo de façade Street View (clé Google requise)
 *  - googleMapsLink : lien deeplink vers Google Maps (toujours dispo)
 *
 * Les URLs Street View ne sont retournées QUE si GOOGLE_MAPS_API_KEY est défini.
 */

export type LocationVisuals = {
  osmStaticUrl: string; // toujours dispo
  streetViewUrl: string | null; // dispo seulement avec clé Google
  mapsLink: string; // deeplink Google Maps interactif
  geoportailLink: string; // alternative IGN (vue aérienne FR)
};

export function buildLocationVisuals(
  lat: number,
  lng: number,
  options?: { width?: number; height?: number; zoom?: number }
): LocationVisuals {
  const width = options?.width ?? 320;
  const height = options?.height ?? 200;
  const zoom = options?.zoom ?? 18;

  const osmStaticUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&markers=${lat},${lng},lightblue1&maptype=mapnik`;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const streetViewUrl = apiKey
    ? `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&location=${lat},${lng}&fov=80&heading=0&pitch=0&source=outdoor&key=${apiKey}`
    : null;

  const mapsLink = `https://www.google.com/maps/@${lat},${lng},${zoom}z`;
  const geoportailLink = `https://www.geoportail.gouv.fr/carte?c=${lng},${lat}&z=${zoom}&l0=ORTHOIMAGERY.ORTHOPHOTOS::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`;

  return { osmStaticUrl, streetViewUrl, mapsLink, geoportailLink };
}

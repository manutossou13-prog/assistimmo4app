/**
 * Fetcher pour récupérer le texte d'une annonce immobilière à partir d'une URL.
 *
 * Stratégie :
 *  - User-Agent réaliste (la plupart des sites laissent passer)
 *  - Suit les redirections (3xx)
 *  - Tronque à ~150 KB de texte (assez pour 99% des annonces)
 *  - Strippe le HTML en texte brut lisible
 *  - Si échec (403 Cloudflare, etc.), retourne une erreur explicite
 */

const MAX_BYTES = 150_000;

export async function fetchListingText(url: string): Promise<{ ok: true; text: string; finalUrl: string } | { ok: false; error: string }> {
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, error: "URL invalide." };
  }

  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const reason =
        res.status === 403
          ? "Le site bloque le fetch automatique (protection Cloudflare). Copiez-collez plutôt le texte de l'annonce."
          : `Le site a renvoyé ${res.status} ${res.statusText}.`;
      return { ok: false, error: reason };
    }

    const buf = await res.arrayBuffer();
    const html = new TextDecoder("utf-8").decode(buf.slice(0, MAX_BYTES));
    const text = htmlToText(html);

    if (text.length < 200) {
      return {
        ok: false,
        error: "Le fetch a réussi mais le contenu est trop court (probablement bloqué). Copiez-collez le texte de l'annonce.",
      };
    }

    return { ok: true, text, finalUrl: res.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur réseau";
    return { ok: false, error: `Impossible de récupérer la page : ${message}. Copiez-collez le texte.` };
  }
}

/**
 * Strippe le HTML pour ne garder que le texte lisible. Tolère les sites mal formés.
 */
function htmlToText(html: string): string {
  let s = html;
  // Retire scripts et styles
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  // Conserve quelques balises sémantiques utiles en les remplaçant par des sauts de ligne
  s = s.replace(/<\/?(br|p|div|li|h[1-6]|tr|td|th|article|section)[^>]*>/gi, "\n");
  // Retire toutes les autres balises
  s = s.replace(/<[^>]+>/g, " ");
  // Décode quelques entités HTML courantes
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&euro;/g, "€")
    .replace(/&deg;/g, "°")
    .replace(/&hellip;/g, "…");
  // Normalise les espaces et sauts de ligne
  s = s.replace(/[ \t ]+/g, " ");
  s = s.replace(/\n\s*\n\s*\n+/g, "\n\n");
  s = s.replace(/^[ \t]+|[ \t]+$/gm, "");
  return s.trim();
}

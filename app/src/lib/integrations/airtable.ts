/**
 * Airtable client minimal — fetch records d'une table.
 * Le PAT (Personal Access Token) est fourni par utilisateur, transmis au serveur via FormData,
 * jamais stocké en base (pour MVP). Plus tard : table dédiée `integrations` chiffrée.
 *
 * Doc : https://airtable.com/developers/web/api/list-records
 */

const AIRTABLE_API = "https://api.airtable.com/v0";

export type AirtableRecord = {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
};

export type FetchAirtableArgs = {
  pat: string; // Personal Access Token (commence par "pat...")
  baseId: string; // commence par "app..."
  tableNameOrId: string; // nom de la table OU id (commence par "tbl...")
  view?: string; // nom de la vue (optionnel)
  maxRecords?: number; // défaut 1000
  filterByFormula?: string; // Airtable formula (optionnel)
};

export async function fetchAirtableRecords(
  args: FetchAirtableArgs
): Promise<{ records: AirtableRecord[]; total: number; truncated: boolean }> {
  const all: AirtableRecord[] = [];
  let offset: string | null = null;
  const max = args.maxRecords ?? 1000;
  const pageSize = 100;
  const tableEncoded = encodeURIComponent(args.tableNameOrId);

  while (all.length < max) {
    const params = new URLSearchParams();
    params.set("pageSize", String(Math.min(pageSize, max - all.length)));
    if (args.view) params.set("view", args.view);
    if (args.filterByFormula) params.set("filterByFormula", args.filterByFormula);
    if (offset) params.set("offset", offset);

    const url = `${AIRTABLE_API}/${args.baseId}/${tableEncoded}?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${args.pat}`,
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Airtable API ${res.status} : ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as { records?: AirtableRecord[]; offset?: string };
    const records = data.records ?? [];
    all.push(...records);

    if (!data.offset || records.length === 0) break;
    offset = data.offset;
  }

  return { records: all.slice(0, max), total: all.length, truncated: all.length >= max };
}

/**
 * Sérialise les records Airtable en CSV simple (en-tête + lignes).
 * On utilise les clés de fields du 1er record comme colonnes.
 */
export function recordsToCsv(records: AirtableRecord[]): string {
  if (records.length === 0) return "(aucune donnée)";
  // Collecte de toutes les clés rencontrées (au cas où certaines sont sparse)
  const keys = new Set<string>();
  for (const r of records) for (const k of Object.keys(r.fields)) keys.add(k);
  const cols = ["id", ...Array.from(keys)];

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : Array.isArray(v) ? v.join(" | ") : JSON.stringify(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines: string[] = [];
  lines.push(cols.join(","));
  for (const r of records) {
    const row = cols.map((c) => (c === "id" ? r.id : escape(r.fields[c])));
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

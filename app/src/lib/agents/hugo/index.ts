import { getAnthropic, MODELS } from "@/lib/anthropic";

// ============================================================
// Types
// ============================================================

export type HugoPeriod = "week" | "month" | "quarter" | "ytd";

export type HugoInput = {
  period: HugoPeriod;
  period_label: string; // ex: "Mars 2026", "S15 2026", "Q1 2026"
  data_raw: string; // CSV / table collée / dump Airtable / commentaire libre
  targets?: string | null; // objectifs : "10 mandats/mois, 30k€ CA/négo"
  context?: string | null; // commentaires métier
  agency_name: string;
};

export type HugoKpi = {
  label: string;
  value: number | string;
  unit: string | null; // €, %, mandats, jours...
  vs_target: string | null; // ex: "-20% vs cible"
  trend: string | null; // ex: "+8% vs N-1"
  status: "ok" | "warning" | "critical" | "neutral";
};

export type HugoAlert = {
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  suggested_action: string;
};

export type HugoRanking = {
  rank: number;
  name: string;
  metric: string; // valeur principale
  details: string; // sous-éléments (ex: "12 mandats · 4 ventes · 410 k€")
  trend: "up" | "stable" | "down" | null;
};

export type HugoAction = {
  priority: number; // 1, 2, 3
  action: string;
  owner: string; // qui (manager / négo / équipe)
  deadline: string; // J+3, semaine prochaine, ce mois...
  expected_impact: string;
};

export type HugoResult = {
  synthese: string; // 3-4 phrases exec brief
  kpis: HugoKpi[];
  alerts: HugoAlert[];
  ranking: HugoRanking[];
  actions: HugoAction[];
  meeting_brief_md: string; // ordre du jour pour réunion équipe
  next_data_to_collect: string[]; // données manquantes pour la prochaine analyse
  meta: { duration_ms: number };
};

// ============================================================
// Prompt
// ============================================================

const HUGO_SYSTEM = `Tu es Hugo, manager d'agence et analyste KPI d'Assistimmo. Tu transformes des données brutes (CSV, dump Airtable, tableau de bord) en synthèse pilotable + alertes + plan d'action + ordre du jour de réunion.

## Règles dures
- **Pas de chiffre inventé** : si une donnée n'est pas explicitement présente, mets null/"non communiqué". JAMAIS d'extrapolation cachée.
- **Comparaisons sourcées** : pour "+X% vs N-1", la valeur N-1 doit exister dans les données. Sinon mets trend à null.
- **Pas de jugement individuel sans contexte** : les alertes "sous-performance" ne ciblent quelqu'un que si la donnée est claire ET si le manque ne s'explique pas par une absence ou un facteur externe.
- **Anonymisation possible** : si l'utilisateur le demande explicitement dans context, remplace les noms par des codes.
- Sortie **STRICTEMENT** un JSON. Pas de markdown, pas de \`\`\`.

## KPIs à calculer (selon les données dispo)
- Mandats rentrés (par négo + total)
- Estimations réalisées
- Compromis signés
- CA encaissé (€)
- Taux de transformation (estimation → mandat → vente)
- Pipeline (nombre de dossiers, ancienneté moyenne)
- Activité prospection (boîtages, appels, emails) si dispo
- Dossiers dormants (>14 jours sans activité)

## Alertes (severity)
- **high** (rouge) : décalage > 25% vs cible OU négo à 0 sur indicateur clé OU pic anormal dérive (ex: pipeline qui chute de 30%)
- **medium** (orange) : décalage 10-25% vs cible OU dérive observable
- **low** (jaune) : info à surveiller

## Ranking
- Top 5 ou top 10 selon nb d'effectifs détectés
- Trier par CA encaissé OU mandats rentrés (à choisir selon ce qui fait sens)

## Plan d'action
- 3-5 actions concrètes, **priorisées**, avec **owner explicite** et **deadline réaliste**
- Pas d'actions vagues type "améliorer la communication"

## Meeting brief
Ordre du jour structuré (markdown) pour la réunion d'équipe à venir : tour de table → points d'alerte → décisions à prendre → tour des prochaines actions.`;

const SCHEMA_HINT = {
  synthese: "3-4 phrases exec brief : situation globale + alerte principale + opportunité majeure",
  kpis: [
    { label: "Mandats rentrés", value: 8, unit: "mandats", vs_target: "-20% vs cible 10", trend: null, status: "warning" },
  ],
  alerts: [
    {
      severity: "high",
      title: "Pipeline tiède",
      description: "6 dossiers sans relance > 14j",
      suggested_action: "Sarah prépare une relance ciblée cette semaine",
    },
  ],
  ranking: [
    { rank: 1, name: "Thomas G.", metric: "410 k€", details: "12 mandats · 4 ventes · 410 k€ CA", trend: "up" },
  ],
  actions: [
    {
      priority: 1,
      action: "Réactiver les 6 dossiers dormants via une séquence Sarah J+3/J+7",
      owner: "Marie L.",
      deadline: "Semaine 16",
      expected_impact: "2-3 reprises de contact / 1 estimation",
    },
  ],
  meeting_brief_md: "## Réunion lundi 9h\n- Tour de table 5'\n- Alertes (pipeline) 10'\n- Décisions ...",
  next_data_to_collect: ["Nb d'estimations T1", "Activité boîtage par négo"],
};

const PERIOD_LABEL: Record<HugoPeriod, string> = {
  week: "Semaine",
  month: "Mois",
  quarter: "Trimestre",
  ytd: "Année en cours",
};

// ============================================================
// Pipeline
// ============================================================

export async function runHugo(input: HugoInput): Promise<HugoResult> {
  const t0 = Date.now();
  const anthropic = getAnthropic();

  const userPrompt = `Mission : produire la synthèse de pilotage pour l'agence ${input.agency_name}.

**Période** : ${PERIOD_LABEL[input.period]} · ${input.period_label}
${input.targets ? `**Objectifs définis** :\n${input.targets}\n` : ""}
${input.context ? `**Contexte / commentaires métier** :\n${input.context}\n` : ""}

**Données brutes** (CSV, dump Airtable, tableau collé, notes du dirigeant) :
"""
${input.data_raw.slice(0, 18000)}
"""

Retourne **UNIQUEMENT** un JSON conforme à ce schéma exemplaire (pas de markdown, pas de \`\`\`) :

${JSON.stringify(SCHEMA_HINT, null, 2)}

Calibre :
- 4 à 8 KPIs (les plus parlants pour la période)
- 0 à 6 alertes (uniquement si pertinent — pas d'alerte fictive)
- Ranking : top 5 si moins de 8 négos, top 10 sinon, vide si pas assez de données
- 3 à 5 actions priorisées
- Meeting brief : 6-12 lignes en markdown
- Next data : 2-4 données manquantes utiles pour la prochaine analyse`;

  const response = await anthropic.messages.create({
    model: MODELS.standard,
    max_tokens: 4500,
    system: HUGO_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Pas de texte dans la réponse Claude");
  }

  let cleaned = block.text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

  let parsed: Partial<HugoResult>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Hugo JSON invalide : ${cleaned.slice(0, 200)}`);
  }

  return {
    synthese: parsed.synthese ?? "",
    kpis: Array.isArray(parsed.kpis)
      ? parsed.kpis.map((k) => ({
          label: k.label ?? "",
          value: k.value ?? "",
          unit: k.unit ?? null,
          vs_target: k.vs_target ?? null,
          trend: k.trend ?? null,
          status: (k.status ?? "neutral") as HugoKpi["status"],
        }))
      : [],
    alerts: Array.isArray(parsed.alerts)
      ? parsed.alerts.map((a) => ({
          severity: (a.severity ?? "low") as HugoAlert["severity"],
          title: a.title ?? "",
          description: a.description ?? "",
          suggested_action: a.suggested_action ?? "",
        }))
      : [],
    ranking: Array.isArray(parsed.ranking)
      ? parsed.ranking.map((r, i) => ({
          rank: r.rank ?? i + 1,
          name: r.name ?? "",
          metric: r.metric ?? "",
          details: r.details ?? "",
          trend: (r.trend ?? null) as HugoRanking["trend"],
        }))
      : [],
    actions: Array.isArray(parsed.actions)
      ? parsed.actions.map((a, i) => ({
          priority: a.priority ?? i + 1,
          action: a.action ?? "",
          owner: a.owner ?? "",
          deadline: a.deadline ?? "",
          expected_impact: a.expected_impact ?? "",
        }))
      : [],
    meeting_brief_md: parsed.meeting_brief_md ?? "",
    next_data_to_collect: Array.isArray(parsed.next_data_to_collect) ? parsed.next_data_to_collect : [],
    meta: { duration_ms: Date.now() - t0 },
  };
}

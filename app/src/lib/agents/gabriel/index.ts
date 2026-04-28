import { getAnthropic, MODELS } from "@/lib/anthropic";

// ============================================================
// Types
// ============================================================

export type GabrielMode = "analyse" | "resiliation" | "previsionnel";

export type GabrielInput = {
  mode: GabrielMode;
  data_raw: string; // CSV / texte tabulaire collé / description charge unique
  period_label?: string | null; // ex: "Mars 2026", "Q1 2026"
  monthly_revenue?: number | null;
  context?: string | null;
  agency_name: string;
  agent_name: string;
};

export type GabrielChargeLine = {
  vendor: string;
  category: string;
  amount_monthly: number;
  recurrence: "mensuel" | "trimestriel" | "annuel" | "ponctuel" | "inconnu";
  optimization_flag: boolean;
  optimization_reason: string | null;
  estimated_yearly_saving: number | null;
};

export type GabrielRecommendation = {
  rank: number;
  action: string;
  rationale: string;
  estimated_yearly_saving: number;
  effort: "low" | "medium" | "high";
  risk: "low" | "medium" | "high";
};

export type GabrielResult = {
  synthese: string;
  total_charges_monthly: number;
  total_charges_yearly: number;
  charges_by_category: Record<string, number>;
  charges_lines: GabrielChargeLine[];
  alerts: string[];
  recommendations: GabrielRecommendation[];
  resiliation_letter: string | null; // si mode = resiliation
  meta: { duration_ms: number };
};

// ============================================================
// Prompt
// ============================================================

const GABRIEL_SYSTEM = `Tu es Gabriel, pilote financier d'Assistimmo, agence immobilière. Tu donnes une vision claire des entrées/sorties et proposes des optimisations chiffrées.

## Règles dures
- **Français impeccable**.
- Tu N'es PAS expert-comptable. Pour cas complexes (TVA, fiscalité, social, contrats juridiques compliqués) → escalader à un pro et le signaler.
- **Pas d'invention** : si une donnée n'est pas explicitement présente, mets null ou tableau vide.
- Sortie **STRICTEMENT** un JSON. Pas de markdown, pas de \`\`\`.

## Catégorisation (clé charges_by_category)
Catégories standard : Loyer, Télécom, SaaS/Logiciels, Marketing, Véhicule, Prestataires, Assurance, Banque, Sous-traitance, Personnel, Fiscalité, Autres.

## Détection d'optimisation
Pour chaque ligne, mets \`optimization_flag: true\` si :
- Montant anormalement haut pour la catégorie (ex: SaaS > 200€/mois)
- Doublon évident (2 outils similaires)
- Service probablement sous-utilisé (à challenger)
- Contrat ancien (renégociable)

## Recommendations
Génère 3-7 recommandations chiffrées, triées par économie annuelle décroissante. Effort = low/medium/high. Risk = low/medium/high.

## Mode "resiliation"
Si mode = "resiliation", produis aussi un \`resiliation_letter\` complet (en-tête, coordonnées génériques à compléter, objet, motif, préavis, mention LRAR, demande de confirmation écrite). Le user remplira et imprimera lui-même.`;

const SCHEMA_HINT = {
  synthese: "2-4 phrases : situation globale + alertes principales + opportunité majeure",
  total_charges_monthly: 0,
  total_charges_yearly: 0,
  charges_by_category: { "SaaS/Logiciels": 0, Loyer: 0, Télécom: 0 },
  charges_lines: [
    {
      vendor: "ProBox SaaS",
      category: "SaaS/Logiciels",
      amount_monthly: 89,
      recurrence: "mensuel",
      optimization_flag: true,
      optimization_reason: "Service probablement sous-utilisé d'après contexte fourni",
      estimated_yearly_saving: 1068,
    },
  ],
  alerts: ["Pic SaaS x2 vs moyenne secteur", "Assurance pro semble surcouverte"],
  recommendations: [
    {
      rank: 1,
      action: "Résilier ProBox SaaS",
      rationale: "Non utilisé depuis 6 mois selon contexte",
      estimated_yearly_saving: 1068,
      effort: "low",
      risk: "low",
    },
  ],
  resiliation_letter: "Lettre complète si mode=resiliation, sinon null",
};

const MODE_LABEL: Record<GabrielMode, string> = {
  analyse: "Analyse complète des charges + recommandations d'optimisation",
  resiliation: "Génération d'une lettre de résiliation à partir d'une charge ciblée",
  previsionnel: "Synthèse + projection trésorerie 3 mois",
};

// ============================================================
// Pipeline
// ============================================================

export async function runGabriel(input: GabrielInput): Promise<GabrielResult> {
  const t0 = Date.now();
  const anthropic = getAnthropic();

  const userPrompt = `Mission : ${MODE_LABEL[input.mode]}

**Période** : ${input.period_label ?? "non précisée"}
${input.monthly_revenue ? `**Revenu mensuel agence** : ${input.monthly_revenue.toLocaleString("fr-FR")} €` : ""}
**Agence** : ${input.agency_name} · **Demandeur** : ${input.agent_name}

${input.context ? `**Contexte additionnel** :\n${input.context}\n` : ""}

**Données brutes (CSV / tableau collé / description)** :
"""
${input.data_raw.slice(0, 16000)}
"""

Retourne **UNIQUEMENT** un JSON conforme à ce schéma exemplaire (pas de markdown, pas de \`\`\`) :

${JSON.stringify(SCHEMA_HINT, null, 2)}

Pour le mode "${input.mode}" :
${
  input.mode === "resiliation"
    ? "Génère le \\`resiliation_letter\\` complet, format français standard. Inclus tous les éléments requis (objet, identifiants contrat, préavis, motif, demande de confirmation écrite, mention LRAR). Coordonnées et dates précises sont à laisser en placeholder [...] que le user remplira."
    : "Mets resiliation_letter à null."
}
${
  input.mode === "previsionnel"
    ? "Inclus dans la synthese une projection trésorerie 3 mois basée sur les données fournies + monthly_revenue (si dispo)."
    : ""
}`;

  const response = await anthropic.messages.create({
    model: MODELS.standard,
    max_tokens: 4000,
    system: GABRIEL_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Pas de texte dans la réponse Claude");
  }

  let cleaned = block.text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

  let parsed: Partial<GabrielResult> & {
    charges_lines?: Partial<GabrielChargeLine>[];
    recommendations?: Partial<GabrielRecommendation>[];
  };

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gabriel JSON invalide : ${cleaned.slice(0, 200)}`);
  }

  return {
    synthese: parsed.synthese ?? "",
    total_charges_monthly: parsed.total_charges_monthly ?? 0,
    total_charges_yearly: parsed.total_charges_yearly ?? 0,
    charges_by_category: parsed.charges_by_category ?? {},
    charges_lines: Array.isArray(parsed.charges_lines)
      ? parsed.charges_lines.map((l) => ({
          vendor: l.vendor ?? "",
          category: l.category ?? "Autres",
          amount_monthly: l.amount_monthly ?? 0,
          recurrence: (l.recurrence ?? "inconnu") as GabrielChargeLine["recurrence"],
          optimization_flag: !!l.optimization_flag,
          optimization_reason: l.optimization_reason ?? null,
          estimated_yearly_saving: l.estimated_yearly_saving ?? null,
        }))
      : [],
    alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((r, i) => ({
          rank: r.rank ?? i + 1,
          action: r.action ?? "",
          rationale: r.rationale ?? "",
          estimated_yearly_saving: r.estimated_yearly_saving ?? 0,
          effort: (r.effort ?? "medium") as GabrielRecommendation["effort"],
          risk: (r.risk ?? "low") as GabrielRecommendation["risk"],
        }))
      : [],
    resiliation_letter: parsed.resiliation_letter ?? null,
    meta: { duration_ms: Date.now() - t0 },
  };
}

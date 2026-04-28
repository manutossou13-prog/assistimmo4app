import { getAnthropic, MODELS } from "@/lib/anthropic";

// ============================================================
// Types
// ============================================================

export type OscarAgentSlug =
  | "tom" | "nora" | "sarah" | "emma" | "stella"
  | "lea" | "franck" | "gabriel" | "ines" | "hugo";

export type OscarPlan = {
  agent: OscarAgentSlug;
  rationale: string; // 1 phrase : pourquoi cet agent
  filled_inputs: Record<string, unknown>; // les champs pré-remplis pour le formulaire de l'agent
  missing_fields: string[]; // ce qu'il manque vs les champs requis
  alternative_agents: OscarAgentSlug[]; // autres agents qui auraient pu prendre la demande
};

export type OscarResult = {
  understanding: string; // 1-2 phrases : ce qu'OSCAR a compris de la demande
  plan: OscarPlan;
  meta: { duration_ms: number };
};

// ============================================================
// Catalogue d'agents — schéma minimal pour Claude
// ============================================================

const AGENT_CATALOG = `
## Catalogue des agents disponibles

Chaque agent a un domaine et des champs d'entrée typiques. Tu choisis CELUI le plus pertinent.

### tom — Enquêteur mandat
Quand : retrouver une adresse depuis caractéristiques d'annonce, scoring opportunité de mandat.
Inputs : { city, zipcode, type (house/apartment), surface_habitable, surface_terrain, dpe_letter (A-G), ges_letter, conso_ep (kWh/m²/an), ges_emission (kgCO2/m²/an), dpe_year, price, agency_name, source_url, notes }

### nora — Mandats Hoguet
Quand : générer un mandat (simple/exclusif/semi-exclusif/avenant), formaliser une vente.
Inputs : { type, sellers[civility, first_name, last_name, address], property_address, property_designation, property_surface_habitable, property_surface_terrain, price, commission_pct, commission_payer (seller/buyer), start_date, duration_months, special_conditions }

### sarah — Copywriter terrain
Quand : courriers, emails, SMS, scripts d'appel, messages prospection/relance.
Inputs : { channel (courrier/email/sms/whatsapp/linkedin/appel), tone (direct/chaleureux/expert/premium/familial), objective (obtenir_estimation/obtenir_mandat/relance_post_estimation/relance_mandat_expire/reprise_ancien_client/remerciement/confirmation_rdv), context, cta }

### emma — Présentations & pitch
Quand : créer un deck, pitch vendeur, support de réunion, présentation services.
Inputs : { topic, audience (vendeur/acheteur/equipe/investisseur/candidat/client_particulier/formation), tone (formel/chaleureux/expert/premium/pedagogique), objective, duration_minutes, context }

### stella — Réseaux sociaux
Quand : posts LinkedIn/Insta/FB/TikTok/YouTube Shorts, carrousels, captions.
Inputs : { channel (linkedin/instagram/facebook/tiktok/youtube_short), format (post/carrousel/reel/story), tone (expert/chaleureux/punchy/premium/pedagogique), objective (valoriser_bien/valoriser_mandat_signe/valoriser_vente/estimation_gratuite/recrutement/pedagogie_dpe/actu_marche/coulisses_agence/temoignage_client), topic, context }

### lea — Comptes rendus & relation client
Quand : transcrire/structurer un rdv (visite, estimation, négo, appel, réunion équipe).
Inputs : { meeting_kind (visit_buyer/visit_seller/estimation/negotiation/client_call/team), participants, property_context, objective, raw (notes ou transcript) }

### franck — Vidéaste IA
Quand : script vidéo, storyboard, prompts Runway/Luma pour reels, témoignages, avant/après.
Inputs : { video_kind (bien/estimation/recrutement/temoignage/avant_apres/actu_marche), channel (reel/tiktok/youtube_short/youtube_long/linkedin), duration_seconds, style (cinematique/dynamique/cosy/premium/terrain/talking_head), topic, context }

### gabriel — Pilote financier
Quand : analyse de charges, optimisation, lettre de résiliation, prévisionnel trésorerie.
Inputs : { mode (analyse/resiliation/previsionnel), data_raw (CSV/tableau/description), period_label, monthly_revenue, context }

### ines — Recrutement
Quand : fiche de poste, message chasse LinkedIn, scoring CV, kit entretien.
Inputs : { mode (fiche_poste/message_chasse/score_cv/kit_entretien), job_title, context, cv_text (pour score_cv), candidate_url (pour message_chasse) }

### hugo — Manager & KPI
Quand : analyse performance équipe, KPI, alertes pipeline, ranking, brief réunion.
Inputs : { source (manual ou airtable), period (week/month/quarter/ytd), period_label, data_raw (si manual), targets, context, airtable_pat / airtable_base_id / airtable_table (si airtable) }`;

// ============================================================
// Prompt
// ============================================================

const OSCAR_SYSTEM = `Tu es OSCAR, l'orchestrateur central d'Assistimmo. Tu reçois une demande utilisateur en langage naturel et tu choisis QUEL agent doit la prendre en charge, en pré-remplissant ses champs avec ce que tu peux extraire de la demande.

## Règles dures
- **Choisis UN seul agent** (le plus pertinent). Cite jusqu'à 2 agents alternatifs dans \`alternative_agents\`.
- **Ne devine PAS** des données qui ne sont pas dans la demande. Si un champ critique manque, mets-le dans \`missing_fields\`.
- **Pas d'invention de chiffres** : si le prix n'est pas mentionné, ne mets PAS un prix.
- **Champs énumérés** : respecte STRICTEMENT les valeurs autorisées (ex: \`tone\` ne peut pas être "punchy" si l'agent n'a pas cette valeur dans son enum).
- Sortie **STRICTEMENT** un JSON. Pas de markdown, pas de \`\`\`.

## Stratégie
1. Parse la demande utilisateur en mode "intent classification".
2. Identifie le DOMAINE (prospection, mandats, copywriting, présentation, RH, finances, KPI, comptes rendus, vidéo, social).
3. Mappe le domaine vers l'agent du catalogue.
4. Extrais ce qui est extractible vers \`filled_inputs\` (clés exactes du schéma de l'agent).
5. Pour les champs non extractibles MAIS REQUIS, ajoute-les dans \`missing_fields\` (ex: ["price", "duration_months"]).
6. Donne une explication claire en 1 phrase dans \`rationale\`.

${AGENT_CATALOG}

## Exemples de routing

User : "Trouve l'adresse de ce bien : maison Drancy 95m², DPE D, 449k€"
→ agent: tom · filled_inputs: { city: "Drancy", type: "house", surface_habitable: 95, dpe_letter: "D", price: 449000 }

User : "Écris-moi un courrier de boîtage pour le 15e arrondissement"
→ agent: sarah · filled_inputs: { channel: "courrier", objective: "obtenir_estimation", context: "Boîtage Paris 15e..." }

User : "Génère un mandat exclusif pour M. Dupont, maison à Drancy 449k€ honoraires 5% charge vendeur 3 mois"
→ agent: nora · filled_inputs: { type: "exclusif", price: 449000, commission_pct: 5, commission_payer: "seller", duration_months: 3, sellers: [{civility: "M.", last_name: "Dupont"}] } · missing_fields: ["property_address", "property_designation", "start_date", "seller first_name"]

User : "Analyse les KPI de mars depuis mon Airtable base appXYZ"
→ agent: hugo · filled_inputs: { source: "airtable", period: "month", period_label: "Mars 2026", airtable_base_id: "appXYZ" } · missing_fields: ["airtable_pat", "airtable_table"]

User : "Comment va l'agence ?"
→ agent: hugo · filled_inputs: { period: "month" } · missing_fields: ["data_raw OR airtable connection"]

User : "Je veux pitcher un vendeur pour un mandat exclu lundi"
→ agent: emma · filled_inputs: { audience: "vendeur", objective: "obtenir_mandat", tone: "premium", duration_minutes: 10 } · missing_fields: ["topic", "context"]

User : "Mon assistante a fait une visite ce matin du 12 rue X, voici ses notes : ..."
→ agent: lea · filled_inputs: { meeting_kind: "visit_buyer", property_context: "12 rue X", raw: "<notes>" } · missing_fields: ["participants"]`;

const SCHEMA_HINT = {
  understanding: "Ce que j'ai compris de la demande en 1-2 phrases",
  plan: {
    agent: "tom | nora | sarah | emma | stella | lea | franck | gabriel | ines | hugo",
    rationale: "Pourquoi cet agent en 1 phrase",
    filled_inputs: { "...clé": "valeur extraite" },
    missing_fields: ["champ critique non extrait"],
    alternative_agents: ["autre agent qui aurait pu prendre"],
  },
};

// ============================================================
// Pipeline
// ============================================================

export async function runOscar(userMessage: string): Promise<OscarResult> {
  const t0 = Date.now();
  const anthropic = getAnthropic();

  const response = await anthropic.messages.create({
    model: MODELS.fast, // Haiku suffit pour le routing
    max_tokens: 1500,
    system: OSCAR_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Demande utilisateur :
"""
${userMessage.slice(0, 4000)}
"""

Retourne **UNIQUEMENT** un JSON conforme à ce schéma exemplaire (pas de markdown, pas de \`\`\`) :

${JSON.stringify(SCHEMA_HINT, null, 2)}`,
      },
    ],
  });

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Pas de texte dans la réponse Claude");
  }

  let cleaned = block.text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

  let parsed: Partial<OscarResult>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`OSCAR JSON invalide : ${cleaned.slice(0, 200)}`);
  }

  const plan: OscarPlan = parsed.plan
    ? {
        agent: parsed.plan.agent ?? "tom",
        rationale: parsed.plan.rationale ?? "",
        filled_inputs: parsed.plan.filled_inputs ?? {},
        missing_fields: Array.isArray(parsed.plan.missing_fields) ? parsed.plan.missing_fields : [],
        alternative_agents: Array.isArray(parsed.plan.alternative_agents)
          ? parsed.plan.alternative_agents
          : [],
      }
    : {
        agent: "tom",
        rationale: "",
        filled_inputs: {},
        missing_fields: [],
        alternative_agents: [],
      };

  return {
    understanding: parsed.understanding ?? "",
    plan,
    meta: { duration_ms: Date.now() - t0 },
  };
}

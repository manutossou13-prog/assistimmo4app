import { getAnthropic, MODELS } from "@/lib/anthropic";

// ============================================================
// Types
// ============================================================

export type SarahChannel = "courrier" | "email" | "sms" | "whatsapp" | "linkedin" | "appel";
export type SarahTone = "direct" | "chaleureux" | "expert" | "premium" | "familial";
export type SarahObjective =
  | "obtenir_estimation"
  | "obtenir_mandat"
  | "relance_post_estimation"
  | "relance_mandat_expire"
  | "reprise_ancien_client"
  | "remerciement"
  | "confirmation_rdv";

export type SarahInput = {
  channel: SarahChannel;
  tone: SarahTone;
  objective: SarahObjective;
  context: string; // ce que sait l'agent (bien, secteur, problématique vendeur…)
  agency_name: string;
  agent_name: string;
  cta?: string; // appel à l'action (sinon Sarah propose)
};

export type SarahMessage = {
  label: string; // ex: "Variante principale", "Plus directe", "Plus chaleureuse"
  subject?: string; // pour email/courrier
  body: string;
  word_count: number;
};

export type SarahResult = {
  channel: SarahChannel;
  tone: SarahTone;
  objective: SarahObjective;
  framework: string; // AIDA, PAS, BAB…
  messages: SarahMessage[]; // principal + variantes
  legal_notice: string | null;
  follow_up_sequence: string[] | null; // J+3, J+7, J+15
  meta: { duration_ms: number };
};

// ============================================================
// Prompt builder
// ============================================================

const SARAH_SYSTEM = `Tu es Sarah, copywriter terrain expérimentée d'Assistimmo, agence immobilière.
Tu rédiges des contenus commerciaux **prêts à envoyer** : courriers de boîtage, e-mails, scripts d'appel, SMS, messages LinkedIn.

## Règles dures (absolues)
- **Français impeccable**. Vouvoiement par défaut (tutoiement uniquement si "ton: familial").
- Pas de jargon creux : interdit "synergie", "disruptif", "next-level", "game-changer", "ecosystem play", "AI-powered".
- **Pas de promesse chiffrée** non sourcée : pas de "vendu en 7 jours", "+30% prix", etc.
- Pas de pression abusive ("dernière chance", "urgence factice").
- **Mentions légales conformes** :
  - Email B2C / SMS / WhatsApp : rappeler que l'opt-in préalable est requis (CNIL).
  - Téléphone : rappeler la vérif Bloctel.
  - Courrier postal : OK sans consentement (mais respecter STOP PUB).
- Sors **STRICTEMENT** un JSON conforme au schéma demandé. Pas de markdown, pas de \`\`\`.

## Frameworks copy
Choisis le framework le plus pertinent et indique-le :
- **AIDA** (Attention - Intérêt - Désir - Action) : annonce, post LinkedIn long.
- **PAS** (Problème - Agitation - Solution) : prospection vendeur, le plus efficace en boîtage.
- **BAB** (Before - After - Bridge) : transformation, témoignage.
- **Hook-Story-Offer** : court, réseaux sociaux, SMS.
- **FAB** (Features - Advantages - Benefits) : pitch service.

## Format
- Courrier : 80 à 200 mots, ton direct mais humain. Toujours coordonnées agent en signature.
- E-mail : objet ≤ 60 caractères, corps ≤ 200 mots, 1 CTA principal.
- SMS : ≤ 160 caractères, identification + opt-out (STOP au XXXX).
- WhatsApp : ≤ 250 caractères, ton conversationnel.
- LinkedIn DM : ≤ 300 mots, professionnel B2B.
- Appel : script structuré (ouverture / qualification / pitch / objections / closing) avec 3 objections-types et leurs réponses.`;

const SCHEMA_HINT = {
  framework: "AIDA | PAS | BAB | Hook-Story-Offer | FAB",
  messages: [
    { label: "Variante principale", subject: "(email/courrier uniquement, sinon null)", body: "string", word_count: 0 },
    { label: "Plus directe", subject: "...", body: "string", word_count: 0 },
    { label: "Plus chaleureuse", subject: "...", body: "string", word_count: 0 },
  ],
  legal_notice: "string ou null",
  follow_up_sequence: ["J+3 : ...", "J+7 : ...", "J+15 : ..."],
};

const CHANNEL_LABEL: Record<SarahChannel, string> = {
  courrier: "Courrier postal (boîtage)",
  email: "E-mail",
  sms: "SMS",
  whatsapp: "WhatsApp",
  linkedin: "Message LinkedIn",
  appel: "Script d'appel téléphonique",
};

const OBJECTIVE_LABEL: Record<SarahObjective, string> = {
  obtenir_estimation: "Obtenir un rendez-vous d'estimation",
  obtenir_mandat: "Obtenir un mandat de vente",
  relance_post_estimation: "Relancer après une estimation faite",
  relance_mandat_expire: "Relancer après expiration d'un mandat (chez un confrère)",
  reprise_ancien_client: "Reprendre contact avec un ancien client",
  remerciement: "Remercier (post-visite, post-vente)",
  confirmation_rdv: "Confirmer un rendez-vous",
};

const TONE_LABEL: Record<SarahTone, string> = {
  direct: "Direct, efficace, sans détour",
  chaleureux: "Chaleureux, humain, proche",
  expert: "Expert, technique, factuel",
  premium: "Haut de gamme, élégant",
  familial: "Familial, tutoiement, très accessible",
};

// ============================================================
// Pipeline
// ============================================================

export async function runSarah(input: SarahInput): Promise<SarahResult> {
  const t0 = Date.now();
  const anthropic = getAnthropic();

  const userPrompt = `Génère un contenu commercial pour cette mission :

**Canal** : ${CHANNEL_LABEL[input.channel]}
**Ton** : ${TONE_LABEL[input.tone]}
**Objectif** : ${OBJECTIVE_LABEL[input.objective]}
**Agence** : ${input.agency_name}
**Négociateur** : ${input.agent_name}
${input.cta ? `**CTA souhaité** : ${input.cta}` : ""}

**Contexte fourni** (informations dont tu disposes) :
"""
${input.context}
"""

Retourne **UNIQUEMENT** un JSON conforme à ce schéma exemplaire (pas de markdown, pas de \`\`\`) :

${JSON.stringify(SCHEMA_HINT, null, 2)}

Génère 3 variantes (principale + plus directe + plus chaleureuse). Pour chaque variante :
- ${input.channel === "email" || input.channel === "courrier" ? "subject = objet du courrier/email (sinon null)" : "subject = null"}
- body = contenu prêt à envoyer
- word_count = nombre de mots du body
Adapte la longueur au canal et inclus l'identification de l'agent + agence en signature.

Pour follow_up_sequence : 3 actions de relance espacées (J+3 / J+7 / J+15) cohérentes avec le canal initial.
Pour legal_notice : courte notice légale propre au canal choisi (CNIL, Bloctel, STOP PUB), sinon null si non pertinent.`;

  const response = await anthropic.messages.create({
    model: MODELS.standard,
    max_tokens: 2048,
    system: SARAH_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Pas de texte dans la réponse Claude");
  }

  let cleaned = block.text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

  let parsed: {
    framework?: string;
    messages?: Array<{ label?: string; subject?: string | null; body?: string; word_count?: number }>;
    legal_notice?: string | null;
    follow_up_sequence?: string[] | null;
  };

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Sarah JSON invalide : ${cleaned.slice(0, 200)}`);
  }

  const messages: SarahMessage[] = (parsed.messages ?? []).map((m) => ({
    label: m.label ?? "Variante",
    subject: m.subject ?? undefined,
    body: m.body ?? "",
    word_count: m.word_count ?? (m.body ?? "").split(/\s+/).filter(Boolean).length,
  }));

  return {
    channel: input.channel,
    tone: input.tone,
    objective: input.objective,
    framework: parsed.framework ?? "PAS",
    messages,
    legal_notice: parsed.legal_notice ?? null,
    follow_up_sequence: parsed.follow_up_sequence ?? null,
    meta: { duration_ms: Date.now() - t0 },
  };
}

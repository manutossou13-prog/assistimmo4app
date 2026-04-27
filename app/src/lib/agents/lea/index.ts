import { getAnthropic, MODELS } from "@/lib/anthropic";

// ============================================================
// Types
// ============================================================

export type LeaMeetingKind =
  | "visit_buyer" // visite acheteur
  | "visit_seller" // visite vendeur (estimation, suivi mandat)
  | "estimation" // RDV estimation
  | "team" // réunion équipe
  | "client_call" // appel client
  | "negotiation"; // négociation prix

export type LeaInput = {
  meeting_kind: LeaMeetingKind;
  participants: string; // texte libre, ex: "M./Mme Martin (acheteurs), Marie L. (négo)"
  property_context?: string | null; // ex: "12 rue de l'Église, 690k€, mandat exclusif"
  objective?: string | null; // ex: "obtenir une offre", "valider le prix"
  raw: string; // transcript ou notes brutes
  agency_name: string;
  agent_name: string;
};

export type LeaTask = {
  title: string;
  assignee: string; // qui (négociateur, acheteur, vendeur)
  due_when: string; // quand (J+1, demain matin, semaine prochaine)
};

export type LeaResult = {
  context: string; // 1-2 phrases
  key_points: string[];
  intentions: string[]; // signaux d'achat / vente
  objections: string[];
  engagements: string[]; // qui s'est engagé à quoi
  vigilance: string[]; // points de vigilance / risques
  client_email_draft: string; // email retour vendeur ou acheteur (selon kind)
  internal_summary: string; // version courte interne pour CRM
  next_meeting: string | null; // prochain rdv suggéré
  tasks: LeaTask[];
  meta: { duration_ms: number };
};

// ============================================================
// Prompt
// ============================================================

const LEA_SYSTEM = `Tu es Léa, assistante "comptes rendus & relation client" d'Assistimmo, agence immobilière. Tu transformes une transcription, des notes brutes ou un compte rendu vocal en un compte rendu structuré, exploitable.

## Règles dures
- **Français impeccable**, vouvoiement par défaut.
- **Pas d'invention** : si une info n'est pas dans le texte fourni, mets null ou tableau vide.
- **Filtrer les éléments perso** (santé, situation conjugale, finances détaillées) AVANT de générer l'email client. Ils peuvent rester dans le compte rendu interne mais pas dans l'email envoyé.
- **L'email client est en draft** : Léa propose le texte, l'utilisateur valide et envoie lui-même.
- Sortie **STRICTEMENT** un JSON. Pas de markdown, pas de \`\`\`.

## Adaptations selon le type de rdv
- **visit_buyer** : focus motivation acheteur, capacité financière, objections, probabilité d'offre. Email = retour vendeur (ce qu'ont dit/ressenti les acheteurs, sans dévoiler la marge de négo).
- **visit_seller** : focus prix vendeur, motivation, urgence, possibilité d'exclusivité. Email = synthèse pour le vendeur (pro et engageant).
- **estimation** : focus valeur, comparables évoqués, attentes vendeur, freins. Email = remerciement + envoi de l'estimation écrite.
- **team** : focus actions par personne, KPI évoqués, blocages.
- **client_call** : focus état du dossier, prochaine étape.
- **negotiation** : focus offre, contre-offre, marge de manœuvre des deux côtés. Email = neutre, factuel.

## Tâches générées
Toujours extraire les engagements concrets en \`tasks\` (qui fait quoi quand). Si le rdv n'engendre pas de tâche claire → tableau vide.`;

const SCHEMA_HINT = {
  context: "1-2 phrases : qui, quand, où, pourquoi",
  key_points: ["Bullet 1 informatif", "Bullet 2"],
  intentions: ["Signal d'achat / vente exprimé"],
  objections: ["Frein, réserve, doute exprimé"],
  engagements: ["Qui a promis quoi"],
  vigilance: ["Risque ou alerte à signaler"],
  client_email_draft: "Email complet (objet + corps) prêt à valider et envoyer",
  internal_summary: "2-4 phrases pour le CRM interne",
  next_meeting: "Date / objet du prochain rdv proposé, ou null",
  tasks: [{ title: "...", assignee: "...", due_when: "..." }],
};

const KIND_LABEL: Record<LeaMeetingKind, string> = {
  visit_buyer: "Visite acheteur",
  visit_seller: "Visite vendeur / suivi mandat",
  estimation: "Rendez-vous d'estimation",
  team: "Réunion d'équipe interne",
  client_call: "Appel client",
  negotiation: "Négociation",
};

// ============================================================
// Pipeline
// ============================================================

export async function runLea(input: LeaInput): Promise<LeaResult> {
  const t0 = Date.now();
  const anthropic = getAnthropic();

  const userPrompt = `Transforme cette source brute en compte rendu structuré.

**Type de rendez-vous** : ${KIND_LABEL[input.meeting_kind]}
**Participants** : ${input.participants}
${input.property_context ? `**Bien concerné** : ${input.property_context}` : ""}
${input.objective ? `**Objectif du RDV** : ${input.objective}` : ""}
**Agence** : ${input.agency_name}
**Négociateur** : ${input.agent_name}

**Source brute (transcript / notes)** :
"""
${input.raw.slice(0, 12000)}
"""

Retourne **UNIQUEMENT** un JSON conforme à ce schéma exemplaire (pas de markdown, pas de \`\`\`) :

${JSON.stringify(SCHEMA_HINT, null, 2)}

L'\`client_email_draft\` doit être complet (objet + corps + signature), prêt à valider et envoyer. Pour visit_buyer, c'est un email au vendeur. Pour visit_seller, c'est un email au vendeur. Pour estimation, c'est un email au prospect vendeur.`;

  const response = await anthropic.messages.create({
    model: MODELS.standard,
    max_tokens: 3000,
    system: LEA_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Pas de texte dans la réponse Claude");
  }

  let cleaned = block.text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

  let parsed: Partial<LeaResult> & { tasks?: Partial<LeaTask>[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Léa JSON invalide : ${cleaned.slice(0, 200)}`);
  }

  return {
    context: parsed.context ?? "",
    key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
    intentions: Array.isArray(parsed.intentions) ? parsed.intentions : [],
    objections: Array.isArray(parsed.objections) ? parsed.objections : [],
    engagements: Array.isArray(parsed.engagements) ? parsed.engagements : [],
    vigilance: Array.isArray(parsed.vigilance) ? parsed.vigilance : [],
    client_email_draft: parsed.client_email_draft ?? "",
    internal_summary: parsed.internal_summary ?? "",
    next_meeting: parsed.next_meeting ?? null,
    tasks: Array.isArray(parsed.tasks)
      ? parsed.tasks.map((t) => ({
          title: t.title ?? "",
          assignee: t.assignee ?? "",
          due_when: t.due_when ?? "",
        }))
      : [],
    meta: { duration_ms: Date.now() - t0 },
  };
}

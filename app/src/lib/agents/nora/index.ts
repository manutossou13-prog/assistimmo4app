import { getAnthropic, MODELS } from "@/lib/anthropic";

// ============================================================
// Types
// ============================================================

export type NoraMandateType = "simple" | "exclusif" | "semi_exclusif" | "avenant";
export type CommissionPayer = "seller" | "buyer";

export type NoraSellerInput = {
  civility: string; // M., Mme, Mlle
  first_name: string;
  last_name: string;
  birth_date?: string | null; // YYYY-MM-DD
  birth_place?: string | null;
  address: string;
  email?: string | null;
  phone?: string | null;
  id_doc_type?: string | null; // CNI, Passeport
  id_doc_ref?: string | null;
};

export type NoraInput = {
  type: NoraMandateType;
  sellers: NoraSellerInput[];
  // Bien
  property_address: string;
  property_designation: string; // ex: "appartement T3 au 4e étage avec ascenseur"
  property_surface_habitable?: number | null;
  property_surface_terrain?: number | null;
  property_zipcode?: string | null;
  property_city?: string | null;
  // Mandat
  price: number;
  commission_amount?: number | null;
  commission_pct?: number | null;
  commission_payer: CommissionPayer;
  start_date: string; // YYYY-MM-DD
  duration_months: number;
  registry_number: string;
  // Conditions particulières
  special_conditions?: string | null;
  // Agence (auto-récupéré)
  agency_name: string;
  agency_address?: string | null;
  agency_carte_t?: string | null;
  agent_full_name: string;
};

export type NoraConformityCheck = {
  field: string;
  ok: boolean;
  note: string | null;
};

export type NoraResult = {
  mandate_md: string; // Mandat complet en markdown long
  registry_number: string;
  type: NoraMandateType;
  conformity: NoraConformityCheck[]; // checklist Hoguet
  warnings: string[]; // alertes (durée trop courte, etc.)
  end_date: string; // calculé
  commission_amount_final: number; // calculé si % donné
  legal_disclaimer: string;
  meta: { duration_ms: number };
};

// ============================================================
// Prompt
// ============================================================

const NORA_SYSTEM = `Tu es Nora, assistante administrative immobilier d'Assistimmo. Tu rédiges des MANDATS DE VENTE conformes loi Hoguet (n°70-9 du 2 janvier 1970 et décret du 20 juillet 1972).

## Règles dures (LÉGALES)
- **Toutes les mentions obligatoires Hoguet** doivent être présentes :
  - Identification complète des parties (état civil + adresse + pièce ID si fournie)
  - Désignation précise du bien (adresse + nature + surface si fournie)
  - Prix de mise en vente
  - Montant des honoraires + pourcentage + qui les paye (vendeur ou acquéreur)
  - Durée du mandat
  - Faculté de dénonciation (LRAR avec préavis de 15 jours pour exclusif, après 3 mois)
  - Numéro d'inscription au registre des mandats
  - Numéro de carte professionnelle (carte T) de l'agence
  - Mentions sur l'obligation de moyens / résultat
- **Mandat exclusif** : durée minimum 3 mois imposée. La clause d'exclusivité doit être mentionnée. Faculté de dénonciation par LRAR à partir du 3e mois avec préavis 15 jours.
- **Mandat simple** : pas de minimum mais 3 mois recommandés.
- **Tu n'es PAS avocat** : ce mandat est un MODÈLE qui doit être validé par un professionnel du droit avant utilisation commerciale. Tu insères systématiquement le \`legal_disclaimer\` à la fin.

## Règles éditoriales
- **Français juridique impeccable**, formules administratives standards.
- Markdown structuré avec sections claires (## puis ###).
- Pas d'invention : si un champ n'est pas fourni, mets [À COMPLÉTER] entre crochets.
- Sortie **STRICTEMENT** un JSON. Pas de markdown autour, pas de \`\`\`.

## Structure du mandat (en markdown dans \`mandate_md\`)
\`\`\`
# MANDAT DE VENTE [TYPE] — N° [REGISTRY]

## ENTRE LES SOUSSIGNÉS

### Le mandant (vendeur)
[État civil complet, adresse, pièce ID, contact]

### Le mandataire
[Agence, adresse, carte T, négociateur référent]

## OBJET DU MANDAT
[Description précise du bien, surface, prix de mise en vente]

## CONDITIONS DU MANDAT
- Type : [Simple/Exclusif/Semi-exclusif]
- Durée : [N mois] du [date début] au [date fin]
- Prix net vendeur : [montant]
- Honoraires : [montant] HT, soit [montant TTC] (TVA 20%)
- Charge des honoraires : [vendeur ou acquéreur]
- Faculté de dénonciation : [clauses spécifiques selon type]

## OBLIGATIONS DU MANDATAIRE
[Obligation de moyens, communication régulière, présentation des offres]

## OBLIGATIONS DU MANDANT
[Garantie de la régularité du mandat, communication des informations, respect de l'exclusivité si exclusif]

## CONDITIONS PARTICULIÈRES
[Si renseigné, sinon "Aucune"]

## CLAUSES OBLIGATOIRES (loi Hoguet)
- Inscription au registre des mandats sous le n° [REGISTRY]
- Carte professionnelle T n° [N° carte T]
- Faculté de rétractation : [conditions]
- Litige : juridiction compétente

## SIGNATURES
Fait à _________________, le _________________, en deux exemplaires originaux.

Le Mandant                                          Le Mandataire
[Nom prénom + "Lu et approuvé, bon pour mandat"]   [Nom prénom + tampon agence]
\`\`\`

## Conformity check
Génère 8-12 vérifications avec ok=true/false et note explicite. Couvre :
état civil parties, désignation bien, prix, honoraires + payeur, durée, faculté de dénonciation,
n° registre, n° carte T, obligation de moyens, signatures, mentions Hoguet, validité juridique générale.

## Warnings
- Si durée < 3 mois pour exclusif : alerte
- Si pièce ID manquante : alerte
- Si carte T manquante : alerte
- Si commission % manquant ou fantaisiste (> 10%) : alerte`;

const SCHEMA_HINT = {
  mandate_md: "Le mandat complet en markdown (structure ci-dessus)",
  conformity: [
    { field: "État civil vendeur", ok: true, note: "Complet" },
    { field: "Pièce d'identité", ok: false, note: "Référence non fournie" },
  ],
  warnings: ["Pièce d'identité du vendeur manquante", "..."],
  legal_disclaimer: "⚠️ Modèle généré par IA. Doit être validé par un professionnel du droit avant signature.",
};

const TYPE_LABEL: Record<NoraMandateType, string> = {
  simple: "Mandat de vente SIMPLE",
  exclusif: "Mandat de vente EXCLUSIF",
  semi_exclusif: "Mandat de vente SEMI-EXCLUSIF",
  avenant: "AVENANT à mandat de vente",
};

// ============================================================
// Pipeline
// ============================================================

export async function runNora(input: NoraInput): Promise<NoraResult> {
  const t0 = Date.now();

  // Calcul date de fin
  const start = new Date(input.start_date);
  const end = new Date(start);
  end.setMonth(end.getMonth() + input.duration_months);
  const endIso = end.toISOString().slice(0, 10);

  // Calcul commission finale
  let commissionFinal = input.commission_amount ?? 0;
  if (commissionFinal === 0 && input.commission_pct && input.price) {
    commissionFinal = Math.round((input.price * input.commission_pct) / 100);
  }

  // Pré-warnings
  const preWarnings: string[] = [];
  if (input.type === "exclusif" && input.duration_months < 3) {
    preWarnings.push(`⚠ Durée ${input.duration_months} mois invalide pour mandat EXCLUSIF (minimum 3 mois imposé par la loi).`);
  }
  if (!input.agency_carte_t) {
    preWarnings.push("⚠ Numéro de carte T agence manquant — obligatoire loi Hoguet.");
  }
  for (const s of input.sellers) {
    if (!s.id_doc_type || !s.id_doc_ref) {
      preWarnings.push(`⚠ Pièce d'identité manquante pour ${s.first_name} ${s.last_name}.`);
    }
  }
  if (input.commission_pct && input.commission_pct > 10) {
    preWarnings.push(`⚠ Commission ${input.commission_pct}% inhabituellement élevée (vérifier).`);
  }

  const sellersBlock = input.sellers
    .map(
      (s, i) =>
        `Vendeur ${i + 1} : ${s.civility} ${s.first_name} ${s.last_name}` +
        (s.birth_date ? `, né(e) le ${s.birth_date}` : "") +
        (s.birth_place ? ` à ${s.birth_place}` : "") +
        `, demeurant ${s.address}` +
        (s.id_doc_type && s.id_doc_ref ? `, ${s.id_doc_type} n° ${s.id_doc_ref}` : "") +
        (s.email ? `, email ${s.email}` : "") +
        (s.phone ? `, tél ${s.phone}` : "")
    )
    .join("\n");

  const userPrompt = `Génère un ${TYPE_LABEL[input.type]} complet et conforme loi Hoguet.

## Données fournies

### Numéro de registre
${input.registry_number}

### Vendeur(s)
${sellersBlock}

### Bien
- Adresse : ${input.property_address}${input.property_zipcode ? `, ${input.property_zipcode}` : ""}${input.property_city ? ` ${input.property_city}` : ""}
- Désignation : ${input.property_designation}
${input.property_surface_habitable ? `- Surface habitable : ${input.property_surface_habitable} m²` : ""}
${input.property_surface_terrain ? `- Surface terrain : ${input.property_surface_terrain} m²` : ""}

### Conditions du mandat
- Type : ${TYPE_LABEL[input.type]}
- Date de début : ${input.start_date}
- Durée : ${input.duration_months} mois
- Date de fin : ${endIso}
- Prix de mise en vente : ${input.price.toLocaleString("fr-FR")} €
- Honoraires : ${commissionFinal.toLocaleString("fr-FR")} € TTC${input.commission_pct ? ` (${input.commission_pct} %)` : ""}
- Charge des honoraires : ${input.commission_payer === "seller" ? "Vendeur" : "Acquéreur"}

### Agence (mandataire)
- Nom : ${input.agency_name}
${input.agency_address ? `- Adresse : ${input.agency_address}` : ""}
${input.agency_carte_t ? `- Carte professionnelle T n° : ${input.agency_carte_t}` : "- ⚠ Carte T MANQUANTE"}
- Négociateur référent : ${input.agent_full_name}

${input.special_conditions ? `### Conditions particulières\n${input.special_conditions}\n` : ""}

### Pré-warnings détectés
${preWarnings.length > 0 ? preWarnings.join("\n") : "(aucun)"}

---

Retourne **UNIQUEMENT** un JSON conforme à ce schéma exemplaire (pas de markdown, pas de \`\`\`) :

${JSON.stringify(SCHEMA_HINT, null, 2)}

Le \`mandate_md\` doit être complet, juridiquement structuré, prêt à imprimer. Inclus TOUTES les mentions obligatoires Hoguet. Si une info manque (ex: carte T), mets [À COMPLÉTER] et ajoute un warning. Le \`legal_disclaimer\` est obligatoire.`;

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: MODELS.standard,
    max_tokens: 5000,
    system: NORA_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Pas de texte dans la réponse Claude");
  }

  let cleaned = block.text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

  let parsed: Partial<NoraResult>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Nora JSON invalide : ${cleaned.slice(0, 200)}`);
  }

  return {
    mandate_md: parsed.mandate_md ?? "",
    registry_number: input.registry_number,
    type: input.type,
    conformity: Array.isArray(parsed.conformity)
      ? parsed.conformity.map((c) => ({
          field: c.field ?? "",
          ok: !!c.ok,
          note: c.note ?? null,
        }))
      : [],
    warnings: [
      ...preWarnings,
      ...(Array.isArray(parsed.warnings) ? parsed.warnings : []),
    ],
    end_date: endIso,
    commission_amount_final: commissionFinal,
    legal_disclaimer:
      parsed.legal_disclaimer ??
      "⚠️ Modèle généré par IA. Doit être validé par un professionnel du droit avant signature et utilisation commerciale.",
    meta: { duration_ms: Date.now() - t0 },
  };
}

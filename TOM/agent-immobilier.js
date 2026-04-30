// ============================================================
// agent-immobilier.js
// Agent IA spécialisé immobilier avec outil de géolocalisation DPE
// Utilise l'API Anthropic avec function calling
// ============================================================
//
// INSTALLATION :
//   npm init -y
//   npm install @anthropic-ai/sdk
//
// USAGE :
//   export ANTHROPIC_API_KEY="sk-ant-..."
//   node agent-immobilier.js "Je cherche un appartement à Lyon 3ème, 65m², DPE D, 230 kWh/m²/an"
//
// ============================================================

const Anthropic = require("@anthropic-ai/sdk");
const { TOOL_DEFINITION, handleToolCall } = require("./geolocalisateur-dpe.js");

// ============================================================
// CONFIG
// ============================================================
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

const SYSTEM_PROMPT = `Tu es un agent immobilier IA expert en recherche de biens.
Tu aides les utilisateurs à retrouver l'adresse exacte d'un bien immobilier
à partir des informations d'une annonce (DPE, surface, localisation, etc.).

Tu disposes de l'outil "geolocaliser_bien_immobilier" qui interroge la base
de données DPE de l'ADEME (29 millions de diagnostics en France).

STRATÉGIE DE RECHERCHE :
1. Extrais de la demande de l'utilisateur tous les critères possibles :
   - Ville ou code postal
   - Surface habitable en m²
   - Valeurs DPE numériques (kWh/m²/an) — BEAUCOUP plus précises que les lettres
   - Valeurs GES numériques (kg CO₂/m²/an)
   - Étiquettes DPE et GES (lettres A à G) — utiles en complément
   - Date du DPE
   - Type de bien (maison, appartement)

2. Appelle l'outil avec le maximum de critères extraits.

3. Analyse les résultats :
   - Score ≥ 80% : très probable, présente avec confiance
   - Score 50-79% : possible, signale les écarts
   - Score < 50% : peu probable, suggère d'affiner les critères

4. Présente les meilleurs résultats de façon claire avec :
   - L'adresse complète
   - Le score de concordance
   - Les critères qui matchent / divergent
   - Le lien Google Maps si disponible

CONSEILS À DONNER À L'UTILISATEUR :
- Les valeurs numériques du DPE (ex: 215 kWh/m²/an) sont bien plus discriminantes
  que les simples lettres (ex: "D")
- La date du DPE est très utile car elle est unique
- Si peu de résultats : élargir la zone ou retirer un critère
- Si trop de résultats : ajouter des critères ou préciser les valeurs numériques

IMPORTANT : Tu réponds toujours en français.`;

// ============================================================
// BOUCLE AGENTIQUE — gère les tool calls en boucle
// ============================================================
async function runAgent(userMessage) {
  const client = new Anthropic();

  // Préparer les tools au format Anthropic
  const tools = [
    {
      name: TOOL_DEFINITION.name,
      description: TOOL_DEFINITION.description,
      input_schema: TOOL_DEFINITION.input_schema,
    },
  ];

  let messages = [{ role: "user", content: userMessage }];

  console.log("\n🏠 Agent Immobilier IA");
  console.log("━".repeat(60));
  console.log(`📝 Demande : ${userMessage}`);
  console.log("━".repeat(60));

  // Boucle agentique : continue tant que Claude veut appeler des tools
  let iteration = 0;
  const MAX_ITERATIONS = 5;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    // Collecter les blocs de texte et de tool_use
    const textBlocks = [];
    const toolUseBlocks = [];

    for (const block of response.content) {
      if (block.type === "text") {
        textBlocks.push(block.text);
      } else if (block.type === "tool_use") {
        toolUseBlocks.push(block);
      }
    }

    // Afficher le texte intermédiaire s'il y en a
    if (textBlocks.length > 0 && toolUseBlocks.length > 0) {
      console.log(`\n💭 ${textBlocks.join("\n")}`);
    }

    // Si pas de tool call → c'est la réponse finale
    if (toolUseBlocks.length === 0) {
      console.log(`\n🤖 Réponse :`);
      console.log(textBlocks.join("\n"));
      return textBlocks.join("\n");
    }

    // Traiter chaque tool call
    // D'abord, ajouter la réponse de l'assistant aux messages
    messages.push({ role: "assistant", content: response.content });

    // Puis traiter les tool results
    const toolResults = [];

    for (const toolUse of toolUseBlocks) {
      console.log(`\n🔍 Appel outil : ${toolUse.name}`);
      console.log(`   Paramètres : ${JSON.stringify(toolUse.input, null, 2)}`);

      let result;
      if (toolUse.name === "geolocaliser_bien_immobilier") {
        result = await handleToolCall(toolUse.input);
      } else {
        result = JSON.stringify({ error: `Outil inconnu: ${toolUse.name}` });
      }

      // Afficher un résumé du résultat
      const parsed = JSON.parse(result);
      if (parsed.succes) {
        console.log(`   ✅ ${parsed.nombre_resultats_retournes} résultats trouvés sur ${parsed.nombre_total_dpe} DPE`);
      } else {
        console.log(`   ❌ ${parsed.erreur}`);
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  console.log("\n⚠️ Nombre maximum d'itérations atteint.");
  return null;
}

// ============================================================
// POINT D'ENTRÉE
// ============================================================
async function main() {
  // Récupérer le message depuis les arguments CLI
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Mode interactif avec exemple
    console.log("Usage : node agent-immobilier.js \"<votre demande>\"\n");
    console.log("Exemples :");
    console.log('  node agent-immobilier.js "Appartement à Lyon 69003, 72m², DPE D, 224 kWh/m²/an, GES 35 kg CO₂"');
    console.log('  node agent-immobilier.js "Maison à Villeurbanne, 120m², étiquette E, DPE fait en mars 2025"');
    console.log('  node agent-immobilier.js "Bien à Caluire, DPE C, 85m², 165 kWh, 28 kg CO₂, date DPE 2024-11-20"');
    console.log("");

    // Lancer un exemple par défaut
    const exempleMessage =
      "Je cherche un appartement à Lyon 3ème, environ 65m², classé D au DPE avec une conso de 230 kWh/m²/an";
    console.log(`▶ Lancement avec l'exemple : "${exempleMessage}"\n`);
    await runAgent(exempleMessage);
  } else {
    const message = args.join(" ");
    await runAgent(message);
  }
}

main().catch((err) => {
  console.error("❌ Erreur fatale:", err);
  process.exit(1);
});

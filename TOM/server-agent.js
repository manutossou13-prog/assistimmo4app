// ============================================================
// server-agent.js
// Serveur HTTP qui expose l'agent immobilier comme API
// Idéal pour intégration avec n8n, Telegram, WhatsApp, etc.
// ============================================================
//
// INSTALLATION :
//   npm install @anthropic-ai/sdk
//
// LANCEMENT :
//   export ANTHROPIC_API_KEY="sk-ant-..."
//   node server-agent.js
//
// Le serveur démarre sur http://localhost:3456
//
// ENDPOINTS :
//   POST /agent     → Agent complet avec Claude (comprend le langage naturel)
//   POST /recherche → Recherche directe dans l'API ADEME (sans Claude, plus rapide)
//
// ============================================================

const http = require("http");
const Anthropic = require("@anthropic-ai/sdk");
const { TOOL_DEFINITION, handleToolCall, rechercherBien } = require("./geolocalisateur-dpe.js");

const PORT = process.env.PORT || 3456;
const MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `Tu es un agent immobilier IA expert en recherche de biens.
Tu aides les utilisateurs à retrouver l'adresse exacte d'un bien immobilier
à partir des informations d'une annonce (DPE, surface, localisation, etc.).

Tu disposes de l'outil "geolocaliser_bien_immobilier" qui interroge la base
de données DPE de l'ADEME (29 millions de diagnostics en France).

STRATÉGIE DE RECHERCHE :
1. Extrais tous les critères de la demande (ville, surface, DPE kWh, GES, date, type)
2. Appelle l'outil avec le maximum de critères
3. Analyse et présente les résultats par score de concordance
4. Réponds toujours en français

IMPORTANT : Les valeurs numériques (kWh/m²/an, kg CO₂/m²/an) sont BEAUCOUP plus
discriminantes que les simples lettres A-G. Encourage l'utilisateur à les fournir.`;

// ============================================================
// AGENT — Boucle agentique complète avec Claude
// ============================================================
async function runAgent(userMessage) {
  const client = new Anthropic();
  const tools = [{
    name: TOOL_DEFINITION.name,
    description: TOOL_DEFINITION.description,
    input_schema: TOOL_DEFINITION.input_schema,
  }];

  let messages = [{ role: "user", content: userMessage }];
  let iteration = 0;

  while (iteration < 5) {
    iteration++;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
    const textBlocks = response.content.filter((b) => b.type === "text");

    // Réponse finale (pas de tool call)
    if (toolUseBlocks.length === 0) {
      return {
        reponse: textBlocks.map((b) => b.text).join("\n"),
        iterations: iteration,
      };
    }

    // Traiter les tool calls
    messages.push({ role: "assistant", content: response.content });

    const toolResults = [];
    for (const toolUse of toolUseBlocks) {
      const result = toolUse.name === "geolocaliser_bien_immobilier"
        ? await handleToolCall(toolUse.input)
        : JSON.stringify({ error: `Outil inconnu: ${toolUse.name}` });

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return { reponse: "Nombre maximum d'itérations atteint.", iterations: iteration };
}

// ============================================================
// SERVEUR HTTP
// ============================================================
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      service: "Agent Immobilier IA",
      endpoints: {
        "/agent": "POST - Agent complet (langage naturel → Claude → ADEME)",
        "/recherche": "POST - Recherche directe ADEME (sans Claude, plus rapide)",
      },
    }));
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Méthode non autorisée. Utilise POST." }));
    return;
  }

  // Lire le body
  let body = "";
  for await (const chunk of req) body += chunk;

  let input;
  try {
    input = JSON.parse(body);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "JSON invalide" }));
    return;
  }

  try {
    // ── POST /agent ── Agent complet avec Claude
    if (req.url === "/agent") {
      if (!input.message) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: 'Champ "message" requis' }));
        return;
      }

      console.log(`[AGENT] "${input.message.substring(0, 80)}..."`);
      const result = await runAgent(input.message);
      console.log(`[AGENT] Terminé en ${result.iterations} itération(s)`);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    // ── POST /recherche ── Recherche directe (sans Claude)
    if (req.url === "/recherche") {
      if (!input.ville && !input.code_postal) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: 'Champ "ville" ou "code_postal" requis' }));
        return;
      }

      console.log(`[RECHERCHE] ${input.ville || input.code_postal}`);
      const result = await rechercherBien(input);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result, null, 2));
      return;
    }

    // Route inconnue
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route inconnue. Utilise /agent ou /recherche" }));
  } catch (err) {
    console.error("[ERREUR]", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`\n🏠 Agent Immobilier IA — Serveur démarré`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   http://localhost:${PORT}/`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\nEndpoints :`);
  console.log(`  POST /agent      → Langage naturel (via Claude)`);
  console.log(`  POST /recherche  → Recherche directe ADEME\n`);
  console.log(`Exemples :`);
  console.log(`  curl -X POST http://localhost:${PORT}/agent \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"message":"Appartement Lyon 3ème, 72m², DPE D, 224 kWh/m²/an"}'\n`);
  console.log(`  curl -X POST http://localhost:${PORT}/recherche \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"ville":"Lyon","code_postal":"69003","surface_habitable":72,"etiquette_dpe":"D","conso_energie_kwh":224}'\n`);
});

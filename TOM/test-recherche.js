// ============================================================
// test-recherche.js
// Test rapide de la recherche ADEME — pas besoin de clé API Anthropic
// ============================================================
//
// Usage : node test-recherche.js
//

const { rechercherBien, geocoderVille } = require("./geolocalisateur-dpe.js");

async function test() {
  console.log("🧪 Test de l'outil de géolocalisation DPE\n");

  // Test 1 : Géocodage
  console.log("━".repeat(50));
  console.log("1️⃣  Test géocodage : 'Lyon 3ème'");
  const geo = await geocoderVille("Lyon 3ème");
  console.log("   Résultat :", JSON.stringify(geo, null, 2));

  // Test 2 : Recherche avec critères larges
  console.log("\n" + "━".repeat(50));
  console.log("2️⃣  Test recherche : Appartement Lyon 69003, DPE D, ~70m²");
  const result1 = await rechercherBien({
    ville: "Lyon",
    code_postal: "69003",
    etiquette_dpe: "D",
    surface_habitable: 70,
  });

  if (result1.succes) {
    console.log(`   ✅ ${result1.nombre_resultats_retournes} résultats (sur ${result1.nombre_total_dpe} DPE total)`);
    console.log("\n   Top 3 :");
    result1.resultats.slice(0, 3).forEach((r, i) => {
      console.log(`\n   #${i + 1} — Score ${r.score_concordance}%`);
      console.log(`      📍 ${r.adresse}, ${r.code_postal} ${r.commune}`);
      console.log(`      📐 ${r.surface_m2} m² | DPE ${r.etiquette_dpe} | ${r.conso_kwh_m2_an} kWh/m²/an`);
      console.log(`      📅 DPE du ${r.date_dpe}`);
      r.criteres_matches.forEach((c) => console.log(`      ${c}`));
    });
  } else {
    console.log(`   ❌ ${result1.erreur}`);
  }

  // Test 3 : Recherche avec critères précis (valeurs numériques)
  console.log("\n" + "━".repeat(50));
  console.log("3️⃣  Test recherche précise : Lyon 69003, 72m², 224 kWh, 35 kg CO₂, DPE D");
  const result2 = await rechercherBien({
    ville: "Lyon",
    code_postal: "69003",
    etiquette_dpe: "D",
    surface_habitable: 72,
    conso_energie_kwh: 224,
    emissions_ges: 35,
  });

  if (result2.succes) {
    console.log(`   ✅ ${result2.nombre_resultats_retournes} résultats`);
    const best = result2.resultats[0];
    if (best) {
      console.log(`\n   🏆 Meilleur match — Score ${best.score_concordance}%`);
      console.log(`      📍 ${best.adresse}, ${best.code_postal} ${best.commune}`);
      console.log(`      📐 ${best.surface_m2} m² | DPE ${best.etiquette_dpe} (${best.conso_kwh_m2_an} kWh) | GES ${best.etiquette_ges} (${best.emissions_ges_kg_co2} kg CO₂)`);
      console.log(`      📅 DPE du ${best.date_dpe} | 🏗️ ${best.annee_construction || "?"}`);
      console.log(`      🗺️ ${best.lien_google_maps || "Pas de coordonnées"}`);
      console.log(`      📋 N°DPE : ${best.numero_dpe}`);
      best.criteres_matches.forEach((c) => console.log(`      ${c}`));
    }
  } else {
    console.log(`   ❌ ${result2.erreur}`);
  }

  console.log("\n" + "━".repeat(50));
  console.log("✅ Tests terminés !\n");
}

test().catch(console.error);

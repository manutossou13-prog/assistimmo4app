// ============================================================
// geolocalisateur-dpe.js
// Outil de géolocalisation de biens immobiliers via l'API ADEME
// À intégrer comme "tool" dans un agent Claude
// ============================================================

const ADEME_BASE_URL = "https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines";
const GEOCODE_URL = "https://data.geopf.fr/geocodage/search";

// Champs à récupérer de l'API ADEME
const SELECT_FIELDS = [
  "N°DPE",
  "Etiquette_DPE",
  "Etiquette_GES",
  "Conso_5_usages_par_m__finale",
  "Emission_GES_5_usages_par_m_",
  "Surface_habitable_logement",
  "Date_établissement_DPE",
  "Adresse_(BAN)",
  "Code_postal_(BAN)",
  "Nom__commune_(BAN)",
  "Type_bâtiment",
  "Année_construction",
  "Coordonnée_cartographique_X_(BAN)",
  "Coordonnée_cartographique_Y_(BAN)",
].join(",");

// Correspondance étiquettes DPE → plages kWh/m²/an
const PLAGES_DPE = {
  A: [0, 70], B: [71, 110], C: [111, 180], D: [181, 250],
  E: [251, 330], F: [331, 420], G: [421, 9999],
};

// Correspondance étiquettes GES → plages kg CO₂/m²/an
const PLAGES_GES = {
  A: [0, 6], B: [7, 11], C: [12, 30], D: [31, 50],
  E: [51, 70], F: [71, 100], G: [101, 9999],
};

// ============================================================
// TOOL DEFINITION — à passer dans le tableau "tools" de l'API Claude
// ============================================================
const TOOL_DEFINITION = {
  name: "geolocaliser_bien_immobilier",
  description: `Recherche l'adresse exacte d'un bien immobilier à partir des informations d'une annonce.
Interroge l'API ADEME DPE (open data) et croise les critères (ville, surface, DPE, GES) pour identifier le bien.
Utilise cet outil quand l'utilisateur fournit des infos d'annonce immobilière et veut retrouver l'adresse exacte.
Plus l'utilisateur fournit de critères, plus la recherche sera précise.
Les valeurs numériques (kWh/m²/an, kg CO₂/m²/an) donnent de bien meilleurs résultats que les simples lettres A-G.`,
  input_schema: {
    type: "object",
    properties: {
      ville: {
        type: "string",
        description: "Nom de la ville ou commune du bien (ex: 'Lyon', 'Paris 15ème', 'Marseille')",
      },
      code_postal: {
        type: "string",
        description: "Code postal du bien (ex: '69001', '75015'). Prioritaire sur la ville si fourni.",
      },
      surface_habitable: {
        type: "number",
        description: "Surface habitable en m² (ex: 85). Utilisé pour le scoring de concordance.",
      },
      conso_energie_kwh: {
        type: "number",
        description: "Consommation d'énergie primaire en kWh/m²/an (ex: 215). Valeur numérique du DPE, beaucoup plus précise que la lettre.",
      },
      emissions_ges: {
        type: "number",
        description: "Émissions de GES en kg CO₂/m²/an (ex: 32). Valeur numérique du GES.",
      },
      etiquette_dpe: {
        type: "string",
        enum: ["A", "B", "C", "D", "E", "F", "G"],
        description: "Étiquette DPE (lettre A à G). Moins précis que la valeur kWh mais utile si c'est la seule info disponible.",
      },
      etiquette_ges: {
        type: "string",
        enum: ["A", "B", "C", "D", "E", "F", "G"],
        description: "Étiquette GES (lettre A à G).",
      },
      date_dpe: {
        type: "string",
        description: "Date du DPE au format YYYY-MM-DD (ex: '2024-03-15'). Très discriminant si disponible.",
      },
      type_batiment: {
        type: "string",
        enum: ["maison", "appartement", "immeuble"],
        description: "Type de bien : maison, appartement, ou immeuble.",
      },
    },
    required: ["ville"],
  },
};

// ============================================================
// GEOCODAGE — Résout un nom de ville en code postal via la BAN
// ============================================================
async function geocoderVille(ville) {
  try {
    const params = new URLSearchParams({
      q: ville,
      limit: "1",
      type: "municipality",
    });

    const res = await fetch(`${GEOCODE_URL}?${params}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.features || data.features.length === 0) return null;

    const props = data.features[0].properties;
    return {
      code_postal: props.postcode || null,
      nom_commune: props.city || props.name || ville,
      code_insee: props.citycode || null,
      coords: data.features[0].geometry?.coordinates || null,
    };
  } catch (err) {
    console.error("[Géocodage] Erreur:", err.message);
    return null;
  }
}

// ============================================================
// SCORING — Calcule un score de concordance entre un DPE et les critères
// ============================================================
function scorerResultat(dpe, criteres) {
  let score = 0;
  let scoreMax = 0;
  const details = [];

  // --- Surface habitable (poids 3) ---
  if (criteres.surface_habitable && dpe.Surface_habitable_logement) {
    scoreMax += 3;
    const diff = Math.abs(dpe.Surface_habitable_logement - criteres.surface_habitable);
    const pct = diff / criteres.surface_habitable;

    if (pct <= 0.02) {
      score += 3;
      details.push(`✅ Surface exacte (${dpe.Surface_habitable_logement} m² vs ${criteres.surface_habitable} m²)`);
    } else if (pct <= 0.10) {
      score += 2;
      details.push(`⚠️ Surface proche ±${Math.round(pct * 100)}% (${dpe.Surface_habitable_logement} m²)`);
    } else if (pct <= 0.20) {
      score += 1;
      details.push(`⚠️ Surface approx. ±${Math.round(pct * 100)}% (${dpe.Surface_habitable_logement} m²)`);
    } else {
      details.push(`❌ Surface trop différente (${dpe.Surface_habitable_logement} m² vs ${criteres.surface_habitable} m²)`);
    }
  }

  // --- Consommation énergie kWh/m²/an (poids 3) ---
  if (criteres.conso_energie_kwh && dpe.Conso_5_usages_par_m__finale) {
    scoreMax += 3;
    const diff = Math.abs(dpe.Conso_5_usages_par_m__finale - criteres.conso_energie_kwh);

    if (diff <= 2) {
      score += 3;
      details.push(`✅ Conso énergie exacte (${Math.round(dpe.Conso_5_usages_par_m__finale)} kWh/m²/an)`);
    } else if (diff <= 15) {
      score += 2;
      details.push(`⚠️ Conso énergie proche (${Math.round(dpe.Conso_5_usages_par_m__finale)} vs ${criteres.conso_energie_kwh})`);
    } else if (diff <= 40) {
      score += 1;
      details.push(`⚠️ Conso énergie approx. (${Math.round(dpe.Conso_5_usages_par_m__finale)} vs ${criteres.conso_energie_kwh})`);
    } else {
      details.push(`❌ Conso énergie différente (${Math.round(dpe.Conso_5_usages_par_m__finale)} vs ${criteres.conso_energie_kwh})`);
    }
  }

  // --- Étiquette DPE (poids 2) ---
  if (criteres.etiquette_dpe && dpe.Etiquette_DPE) {
    scoreMax += 2;
    if (dpe.Etiquette_DPE === criteres.etiquette_dpe) {
      score += 2;
      details.push(`✅ Étiquette DPE ${dpe.Etiquette_DPE}`);
    } else {
      details.push(`❌ Étiquette DPE ${dpe.Etiquette_DPE} (attendu ${criteres.etiquette_dpe})`);
    }
  }

  // --- Émissions GES kg CO₂/m²/an (poids 2) ---
  if (criteres.emissions_ges && dpe.Emission_GES_5_usages_par_m_) {
    scoreMax += 2;
    const diff = Math.abs(dpe.Emission_GES_5_usages_par_m_ - criteres.emissions_ges);

    if (diff <= 1) {
      score += 2;
      details.push(`✅ GES exact (${Math.round(dpe.Emission_GES_5_usages_par_m_)} kg CO₂/m²/an)`);
    } else if (diff <= 5) {
      score += 1;
      details.push(`⚠️ GES proche (${Math.round(dpe.Emission_GES_5_usages_par_m_)} vs ${criteres.emissions_ges})`);
    } else {
      details.push(`❌ GES différent (${Math.round(dpe.Emission_GES_5_usages_par_m_)} vs ${criteres.emissions_ges})`);
    }
  }

  // --- Étiquette GES (poids 1) ---
  if (criteres.etiquette_ges && dpe.Etiquette_GES) {
    scoreMax += 1;
    if (dpe.Etiquette_GES === criteres.etiquette_ges) {
      score += 1;
      details.push(`✅ Étiquette GES ${dpe.Etiquette_GES}`);
    } else {
      details.push(`❌ Étiquette GES ${dpe.Etiquette_GES} (attendu ${criteres.etiquette_ges})`);
    }
  }

  // --- Date du DPE (poids 2) ---
  if (criteres.date_dpe && dpe["Date_établissement_DPE"]) {
    scoreMax += 2;
    const dateResultat = dpe["Date_établissement_DPE"].split("T")[0];

    if (dateResultat === criteres.date_dpe) {
      score += 2;
      details.push(`✅ Date DPE exacte (${dateResultat})`);
    } else {
      // Vérifier si mois/année correspondent
      const [aR, mR] = dateResultat.split("-");
      const [aC, mC] = criteres.date_dpe.split("-");
      if (aR === aC && mR === mC) {
        score += 1;
        details.push(`⚠️ Date DPE même mois (${dateResultat} vs ${criteres.date_dpe})`);
      } else {
        details.push(`❌ Date DPE différente (${dateResultat} vs ${criteres.date_dpe})`);
      }
    }
  }

  const pourcentage = scoreMax > 0 ? Math.round((score / scoreMax) * 100) : 0;

  return { score, scoreMax, pourcentage, details };
}

// ============================================================
// RECHERCHE PRINCIPALE — Appelle l'API ADEME et score les résultats
// ============================================================
async function rechercherBien(input) {
  // 1. Résoudre le code postal si pas fourni
  let codePostal = input.code_postal || null;
  let infoGeo = null;

  if (!codePostal && input.ville) {
    infoGeo = await geocoderVille(input.ville);
    if (infoGeo) {
      codePostal = infoGeo.code_postal;
    }
  }

  if (!codePostal) {
    return {
      succes: false,
      erreur: `Impossible de résoudre la ville "${input.ville}" en code postal. Essaye de fournir directement le code postal.`,
      resultats: [],
    };
  }

  // 2. Construire la requête ADEME
  const filtres = [];
  filtres.push(`Code_postal_(BAN):"${codePostal}"`);

  // Filtrer par étiquette DPE si fournie (réduit drastiquement les résultats)
  if (input.etiquette_dpe) {
    filtres.push(`Etiquette_DPE:"${input.etiquette_dpe}"`);
  }

  // Filtrer par étiquette GES si fournie
  if (input.etiquette_ges) {
    filtres.push(`Etiquette_GES:"${input.etiquette_ges}"`);
  }

  // Filtrer par type de bâtiment
  if (input.type_batiment) {
    const mapping = {
      maison: "Maison",
      appartement: "Appartement",
      immeuble: "Immeuble",
    };
    const typeBat = mapping[input.type_batiment];
    if (typeBat) {
      filtres.push(`Type_bâtiment:"${typeBat}"`);
    }
  }

  const params = new URLSearchParams({
    qs: filtres.join(" AND "),
    size: "200",
    select: SELECT_FIELDS,
  });

  const url = `${ADEME_BASE_URL}?${params}`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text();
      return {
        succes: false,
        erreur: `Erreur API ADEME (HTTP ${res.status}): ${text.substring(0, 200)}`,
        resultats: [],
        url_debug: url,
      };
    }

    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      return {
        succes: false,
        erreur: `Aucun DPE trouvé pour le code postal ${codePostal} avec les critères donnés. Essaye d'élargir (retire l'étiquette DPE/GES).`,
        resultats: [],
        code_postal_utilise: codePostal,
        url_debug: url,
      };
    }

    // 3. Scorer chaque résultat
    const resultatsScores = data.results.map((dpe) => {
      const scoring = scorerResultat(dpe, input);
      return {
        score_concordance: scoring.pourcentage,
        score_detail: `${scoring.score}/${scoring.scoreMax}`,
        criteres_matches: scoring.details,

        adresse: dpe["Adresse_(BAN)"] || "Non renseignée",
        code_postal: dpe["Code_postal_(BAN)"],
        commune: dpe["Nom__commune_(BAN)"],
        surface_m2: dpe.Surface_habitable_logement,
        etiquette_dpe: dpe.Etiquette_DPE,
        etiquette_ges: dpe.Etiquette_GES,
        conso_kwh_m2_an: dpe.Conso_5_usages_par_m__finale
          ? Math.round(dpe.Conso_5_usages_par_m__finale)
          : null,
        emissions_ges_kg_co2: dpe.Emission_GES_5_usages_par_m_
          ? Math.round(dpe.Emission_GES_5_usages_par_m_)
          : null,
        date_dpe: dpe["Date_établissement_DPE"]
          ? dpe["Date_établissement_DPE"].split("T")[0]
          : null,
        type_batiment: dpe.Type_bâtiment,
        annee_construction: dpe.Année_construction,
        numero_dpe: dpe["N°DPE"],

        coordonnees: {
          latitude: dpe["Coordonnée_cartographique_Y_(BAN)"] || null,
          longitude: dpe["Coordonnée_cartographique_X_(BAN)"] || null,
        },
        lien_google_maps:
          dpe["Coordonnée_cartographique_Y_(BAN)"] && dpe["Coordonnée_cartographique_X_(BAN)"]
            ? `https://www.google.com/maps?q=${dpe["Coordonnée_cartographique_Y_(BAN)"]},${dpe["Coordonnée_cartographique_X_(BAN)"]}`
            : null,
      };
    });

    // 4. Trier par score décroissant et garder le top 10
    resultatsScores.sort((a, b) => b.score_concordance - a.score_concordance);
    const top = resultatsScores.slice(0, 10);

    return {
      succes: true,
      nombre_total_dpe: data.total || data.results.length,
      nombre_resultats_retournes: top.length,
      code_postal_utilise: codePostal,
      commune: infoGeo?.nom_commune || input.ville,
      resultats: top,
    };
  } catch (err) {
    return {
      succes: false,
      erreur: `Erreur réseau: ${err.message}`,
      resultats: [],
      url_debug: url,
    };
  }
}

// ============================================================
// HANDLER — Fonction à appeler quand Claude invoque le tool
// ============================================================
async function handleToolCall(toolInput) {
  const result = await rechercherBien(toolInput);
  return JSON.stringify(result, null, 2);
}

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  TOOL_DEFINITION,
  handleToolCall,
  rechercherBien,
  geocoderVille,
  scorerResultat,
};

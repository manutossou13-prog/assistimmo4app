# 🏠 Agent Immobilier IA — Géolocalisation par DPE

Agent IA qui retrouve l'adresse exacte d'un bien immobilier à partir des informations d'une annonce, en interrogeant l'API ADEME DPE (29M+ diagnostics).

Reproduit la fonctionnalité de géolocalisation de [parcellai.re](https://parcellai.re).

## 📁 Structure

```
├── geolocalisateur-dpe.js   # Module principal : API ADEME + scoring
├── agent-immobilier.js       # Agent CLI avec Claude (function calling)
├── server-agent.js           # Serveur HTTP (pour n8n, Telegram, etc.)
├── test-recherche.js         # Test rapide (sans clé API Anthropic)
└── package.json
```

## 🚀 Installation

```bash
# Cloner ou copier les fichiers, puis :
npm install

# Configurer la clé API Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
```

## 🎯 3 modes d'utilisation

### 1. Test rapide (sans clé Anthropic)
```bash
node test-recherche.js
```
Vérifie que l'API ADEME répond correctement.

### 2. Agent CLI interactif
```bash
node agent-immobilier.js "Appartement Lyon 3ème, 72m², DPE D, 224 kWh/m²/an"
```

### 3. Serveur HTTP (pour intégration n8n / webhook)
```bash
node server-agent.js
# → http://localhost:3456
```

**Endpoint `/agent`** — Langage naturel (via Claude) :
```bash
curl -X POST http://localhost:3456/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"Appartement Lyon 3ème, 72m², DPE D, 224 kWh/m²/an"}'
```

**Endpoint `/recherche`** — Recherche directe (sans Claude, plus rapide) :
```bash
curl -X POST http://localhost:3456/recherche \
  -H "Content-Type: application/json" \
  -d '{
    "ville": "Lyon",
    "code_postal": "69003",
    "surface_habitable": 72,
    "etiquette_dpe": "D",
    "conso_energie_kwh": 224,
    "emissions_ges": 35
  }'
```

## 🔌 Intégration n8n

1. Déploie `server-agent.js` sur ton VPS Hostinger
2. Dans n8n, utilise un nœud **HTTP Request** :
   - URL : `http://localhost:3456/recherche`
   - Méthode : POST
   - Body : les critères extraits de l'annonce

## 📊 Algorithme de scoring

Chaque DPE trouvé est comparé aux critères de l'annonce :

| Critère              | Poids | Match exact | Match approx. |
|----------------------|-------|-------------|---------------|
| Surface habitable    | 3     | ±2%         | ±10% / ±20%   |
| Conso kWh/m²/an     | 3     | ±2 kWh      | ±15 / ±40     |
| Étiquette DPE        | 2     | Exacte      | —             |
| Émissions GES        | 2     | ±1 kg       | ±5 kg         |
| Date DPE             | 2     | Exacte      | Même mois     |
| Étiquette GES        | 1     | Exacte      | —             |

Score = (points obtenus / points max) × 100%

## 🔗 APIs utilisées

- **API ADEME DPE** : `https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines`
  - Open data, licence Etalab
  - ~600 req/min sans clé
  - 14,6M+ DPE logements existants (depuis juillet 2021)

- **API Géoplateforme BAN** : `https://data.geopf.fr/geocodage/search`
  - Géocodage d'adresses, résolution ville → code postal
  - 50 req/s/IP

## 💡 Conseils pour de meilleurs résultats

1. **Valeurs numériques > lettres** : `224 kWh/m²/an` est beaucoup plus discriminant que `D`
2. **Date du DPE** : quasi-unique, très efficace si disponible
3. **Surface exacte** : au m² près si possible
4. **Code postal** : plus fiable que le nom de ville (évite les ambiguïtés)

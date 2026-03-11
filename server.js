const express = require('express');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const app = express();

// URL de configuration pour récupérer l'URL du serveur cible
const DEFAULT_FALLBACK = "http://localhost:3000";
const CONFIG_URL = "https://gist.githubusercontent.com/vanscode-CM/0e27877494e5b503963ea7d38773e18f/raw/config.json";

// Cache pour stocker l'URL du serveur cible
let cachedBaseUrl = null;

async function getTargetBaseUrl() {
  // Si déjà en cache, retourner directement
  if (cachedBaseUrl) {
    return cachedBaseUrl;
  }

  try {
    console.log(`🔄 Récupération de la configuration depuis: ${CONFIG_URL}`);
    
    const configUrl = new URL(CONFIG_URL);
    const protocol = configUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      protocol.get(CONFIG_URL, (res) => {
        if (!res.ok && res.statusCode < 200 || res.statusCode >= 300) {
          throw new Error(`HTTP error! status: ${res.statusCode}`);
        }

        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const config = JSON.parse(data);
            cachedBaseUrl = config.baseUrl || DEFAULT_FALLBACK;
            console.log(`✅ URL du serveur cible: ${cachedBaseUrl}`);
            resolve(cachedBaseUrl || DEFAULT_FALLBACK);
          } catch (parseError) {
            console.error("❌ Erreur de parsing JSON:", parseError);
            resolve(DEFAULT_FALLBACK);
          }
        });
      }).on('error', (err) => {
        console.error("❌ Erreur lors de la récupération de la config:", err.message);
        resolve(DEFAULT_FALLBACK);
      });
    });
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    return DEFAULT_FALLBACK;
  }
}

// Middleware pour parser les requêtes JSON et corps
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: '*/*' }));

// Proxy toutes les requêtes vers le serveur cible
app.use(async (req, res) => {
  try {
    const targetBaseUrl = await getTargetBaseUrl();
    const targetUrl = targetBaseUrl + req.originalUrl;

    console.log(`📤 Proxy: ${req.method} ${req.originalUrl} → ${targetUrl}`);

    const options = {
      hostname: new URL(targetBaseUrl).hostname,
      port: new URL(targetBaseUrl).port || 80,
      path: req.originalUrl,
      method: req.method,
      headers: req.headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
      // Autoriser CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      
      res.status(proxyRes.statusCode);
      proxyRes.headers && Object.entries(proxyRes.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      proxyRes.on('data', (chunk) => res.write(chunk));
      proxyRes.on('end', () => res.end());
    });

    proxyReq.on('error', (error) => {
      console.error("❌ Erreur proxy:", error.message);
      res.status(500).json({ error: "Erreur de proxy", message: error.message });
    });

    if (req.body && Object.keys(req.body).length > 0) {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      proxyReq.write(body);
    }

    proxyReq.end();
  } catch (error) {
    console.error("❌ Erreur générale:", error.message);
    res.status(500).json({ error: "Erreur serveur", message: error.message });
  }
});

// Gestion des requêtes OPTIONS pour CORS
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.status(200).end();
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📋 URL de config: ${CONFIG_URL}`);
  
  // Précharger l'URL du serveur cible au démarrage
  await getTargetBaseUrl();
});


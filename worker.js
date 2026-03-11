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
    const response = await fetch(CONFIG_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const config = await response.json();
    cachedBaseUrl = config.baseUrl || DEFAULT_FALLBACK;

    return cachedBaseUrl || DEFAULT_FALLBACK;
  } catch (error) {
    console.error("Erreur lors de la récupération de la config:", error);
    return DEFAULT_FALLBACK;
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Récupérer l'URL du serveur cible (avec cache)
    const targetBaseUrl = await getTargetBaseUrl();
    const targetUrl = targetBaseUrl + url.pathname + url.search;

    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });

    const response = await fetch(newRequest);

    // Autoriser CORS si besoin
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });
  }
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // On remplace par ton API HTTP
    const targetUrl = "http://89.187.7.33:25576" + url.pathname + url.search;

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

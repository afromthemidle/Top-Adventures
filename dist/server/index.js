export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    for (const prefix of ["", "/static", "/client"]) {
      const candidate = new URL(url);
      candidate.pathname = `${prefix}${requested}`;
      const response = await env.ASSETS.fetch(new Request(candidate, request));
      if (response.status !== 404) return response;
    }
    return new Response("Not Found", { status: 404 });
  },
};

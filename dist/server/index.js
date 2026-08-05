export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const paths = [];
    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    for (const prefix of ["", "/static", "/client"]) {
      paths.push(`${prefix}${requested}`);
    }
    for (const path of paths) {
      const candidate = new URL(url);
      candidate.pathname = path;
      const response = await env.ASSETS.fetch(new Request(candidate, request));
      if (response.status !== 404) return response;
    }
    return new Response("Not Found", { status: 404 });
  },
};

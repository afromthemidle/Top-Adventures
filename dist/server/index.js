// worker.ts
async function sendEmail(request, env) {
  try {
    const { to, subject, html, attachments } = await request.json();
    if (!to || !subject || !html) return Response.json({ success: false, error: "Faltan datos del correo." }, { status: 400 });
    if (!env.RESEND_API_KEY) return Response.json({ success: false, error: "RESEND_API_KEY no est\xE1 configurada." }, { status: 503 });
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM || "Top Adventures <onboarding@resend.dev>", to: [to], subject, html, ...attachments?.length ? { attachments } : {} })
    });
    const data = await result.json();
    return Response.json({ success: result.ok, data, error: result.ok ? void 0 : data?.message }, { status: result.ok ? 200 : 502 });
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : "No se pudo enviar el correo." }, { status: 500 });
  }
}
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/send-email" && request.method === "POST") return sendEmail(request, env);
    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    for (const prefix of ["", "/static", "/client"]) {
      const candidate = new URL(url);
      candidate.pathname = `${prefix}${requested}`;
      const response = await env.ASSETS.fetch(new Request(candidate, request));
      if (response.status !== 404) return response;
    }
    return new Response("Not Found", { status: 404 });
  }
};
export {
  worker_default as default
};

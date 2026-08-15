type AssetFetcher = { fetch(request: Request): Promise<Response> };

type WorkerEnv = { ASSETS: AssetFetcher; RESEND_API_KEY?: string };

async function sendEmail(request: Request, env: WorkerEnv) {
  try {
    const { to, subject, html } = await request.json() as { to?: string; subject?: string; html?: string };
    if (!to || !subject || !html) return Response.json({ success: false, error: 'Faltan datos del correo.' }, { status: 400 });
    if (!env.RESEND_API_KEY) return Response.json({ success: false, error: 'RESEND_API_KEY no está configurada.' }, { status: 503 });
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Top Adventures <onboarding@resend.dev>', to: [to], subject, html }),
    });
    const data = await result.json();
    return Response.json({ success: result.ok, data, error: result.ok ? undefined : data?.message }, { status: result.ok ? 200 : 502 });
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : 'No se pudo enviar el correo.' }, { status: 500 });
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv) {
    const url = new URL(request.url);
    if (url.pathname === '/api/send-email' && request.method === 'POST') return sendEmail(request, env);
    const requested = url.pathname === '/' ? '/index.html' : url.pathname;

    for (const prefix of ['', '/static', '/client']) {
      const candidate = new URL(url);
      candidate.pathname = `${prefix}${requested}`;
      const response = await env.ASSETS.fetch(new Request(candidate, request));
      if (response.status !== 404) return response;
    }

    return new Response('Not Found', { status: 404 });
  },
};

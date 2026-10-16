function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
function token() {
  const a = new Uint8Array(18); crypto.getRandomValues(a);
  return [...a].map(x => x.toString(16).padStart(2, "0")).join("");
}
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_SECRET) return json({ error: "ADMIN_SECRET is not configured." }, 500);
  if (request.headers.get("Authorization") !== `Bearer ${env.ADMIN_SECRET}`) return json({ error: "Not authorized." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
  const count = Number(body.count);
  if (!Number.isInteger(count) || count < 1 || count > 200) return json({ error: "Choose a batch size from 1 to 200." }, 400);
  const baseUrl = new URL(request.url).origin;
  const created = [];
  for (let i = 0; i < count; i++) {
    const t = token();
    await env.DB.prepare("INSERT INTO claims (token, discount) VALUES (?, 5)").bind(t, 5).run();
    created.push({ token: t, url: `${baseUrl}/?claim=${t}` });
  }
  return json({ created, note: "Each URL is for one package. Keep the URLs private until printed." });
}

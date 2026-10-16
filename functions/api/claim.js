function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
function randomHex(bytes = 5) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase();
}
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const token = String(body.token || "");
  if (!/^[A-Fa-f0-9-]{16,80}$/.test(token)) return json({ error: "This gift link is not valid." }, 400);

  const existing = await env.DB.prepare(
    "SELECT discount, coupon_code FROM claims WHERE token = ? AND claimed_at IS NOT NULL"
  ).bind(token).first();
  if (existing) return json({ discount: existing.discount, code: existing.coupon_code, alreadyClaimed: true });

  const row = await env.DB.prepare("SELECT token FROM claims WHERE token = ?").bind(token).first();
  if (!row) return json({ error: "This gift link is not valid or has already expired." }, 404);

  // Random choice and code are generated server-side. Conditional UPDATE makes claiming atomic.
  const discount = Math.random() < 0.5 ? 5 : 10;
  const code = `AAB-${randomHex(3)}-${randomHex(3)}`;
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    "UPDATE claims SET discount = ?, coupon_code = ?, claimed_at = ? WHERE token = ? AND claimed_at IS NULL RETURNING discount, coupon_code"
  ).bind(discount, code, now, token).first();

  if (result) return json({ discount: result.discount, code: result.coupon_code, alreadyClaimed: false });

  // A concurrent request may have won the claim. Return that same result, never issue a second code.
  const winner = await env.DB.prepare(
    "SELECT discount, coupon_code FROM claims WHERE token = ? AND claimed_at IS NOT NULL"
  ).bind(token).first();
  if (winner) return json({ discount: winner.discount, code: winner.coupon_code, alreadyClaimed: true });
  return json({ error: "Please try again." }, 409);
}

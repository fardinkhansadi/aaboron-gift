function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_SECRET) return json({ error: "ADMIN_SECRET is not configured." }, 500);
  if (request.headers.get("Authorization") !== `Bearer ${env.ADMIN_SECRET}`) return json({ error: "Not authorized." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
  const code = String(body.code || "").trim().toUpperCase();
  if (!/^AAB-[A-F0-9]{6}-[A-F0-9]{6}$/.test(code)) return json({ error: "Invalid code format." }, 400);
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    "UPDATE claims SET redeemed_at = ? WHERE coupon_code = ? AND claimed_at IS NOT NULL AND redeemed_at IS NULL RETURNING discount, coupon_code"
  ).bind(now, code).first();
  if (!result) {
    const row = await env.DB.prepare("SELECT redeemed_at FROM claims WHERE coupon_code = ?").bind(code).first();
    if (!row) return json({ valid: false, message: "Code not found." }, 404);
    return json({ valid: false, message: row.redeemed_at ? "This code has already been used." : "This code is not active." }, 409);
  }
  return json({ valid: true, discount: result.discount, code: result.coupon_code, message: `${result.discount}% discount verified and marked used.` });
}

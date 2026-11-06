function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

function randomHex(bytes = 6) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function getCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  const item = cookies.split(";").map(v => v.trim())
    .find(v => v.startsWith(name + "="));
  return item ? item.substring(name.length + 1) : null;
}

async function hashSession(session) {
  const data = new TextEncoder().encode(session);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

function secureRandomDiscount() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] < 2147483648 ? 5 : 10;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "Database unavailable." }, 500);

  let session = getCookie(request, "aab_gift_session");
  let newSession = false;

  // Create a new browser-session identifier if one does not exist.
  if (!session || !/^[a-f0-9]{64}$/.test(session)) {
    session = randomHex(32).toLowerCase();
    newSession = true;
  }

  const sessionHash = await hashSession(session);

  // Return the existing reward if this browser session has already claimed.
  const existing = await env.DB.prepare(
    "SELECT discount, coupon_code FROM universal_claims WHERE session_hash = ?"
  ).bind(sessionHash).first();

  if (existing) {
    const headers = newSession
      ? { "Set-Cookie": `aab_gift_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax` }
      : {};

    return json({
      discount: existing.discount,
      code: existing.coupon_code,
      alreadyClaimed: true
    }, 200, headers);
  }

  // Create a unique coupon. Retry if a rare code collision occurs.
  for (let attempt = 0; attempt < 5; attempt++) {
    const discount = secureRandomDiscount();
    const code = `AAB-${randomHex(3)}-${randomHex(3)}`;

    try {
      await env.DB.prepare(`
        INSERT INTO universal_claims
          (session_hash, discount, coupon_code)
        VALUES (?, ?, ?)
      `).bind(sessionHash, discount, code).run();

      const headers = {
        "Set-Cookie": `aab_gift_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax`
      };

      return json({
        discount,
        code,
        alreadyClaimed: false
      }, 200, headers);

    } catch (error) {
      // Another simultaneous request may have claimed this session.
      const winner = await env.DB.prepare(
        "SELECT discount, coupon_code FROM universal_claims WHERE session_hash = ?"
      ).bind(sessionHash).first();

      if (winner) {
        const headers = newSession
          ? { "Set-Cookie": `aab_gift_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax` }
          : {};

        return json({
          discount: winner.discount,
          code: winner.coupon_code,
          alreadyClaimed: true
        }, 200, headers);
      }

      // If the code collided, retry with a new one.
      if (attempt === 4) {
        return json({ error: "Could not create your gift. Please try again." }, 500);
      }
    }
  }

  return json({ error: "Please try again." }, 500);
}

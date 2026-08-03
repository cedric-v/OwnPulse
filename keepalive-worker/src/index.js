// Supabase keep-alive Worker.
//
// The cron trigger (see wrangler.toml) keeps the free-tier Supabase project
// from being paused (7-day inactivity policy). Each run sends:
//   1. A real Postgres-backed query via PostgREST — the conservative,
//      unambiguous "activity" signal (API + database engine).
//   2. The health endpoint — fallback signal (publishable key header required
//      by Supabase), so the watcher stays green even if the table/view is
//      renamed or its grants change.
//
// Secrets (set with `wrangler secret put`): SUPABASE_URL, SUPABASE_ANON_KEY
// Manual verification: curl "https://<worker>.workers.dev/ping" → OK

const HEALTH_PATH = "/auth/v1/health";

export default {
  /**
   * Cron trigger — run the keep-alive and log the result (visible in the
   * Cloudflare dashboard > Workers > Logs).
   */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runKeepAlive(env));
  },

  /**
   * Manual trigger — GET /ping to verify from a browser or curl.
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/ping") {
      const { ok } = await runKeepAlive(env);
      return new Response(ok ? "OK\n" : "FAILED\n", {
        status: ok ? 200 : 502,
        headers: { "Content-Type": "text/plain" },
      });
    }
    return new Response("Not found", { status: 404 });
  },
};

async function runKeepAlive(env) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, KEEPALIVE_TABLE = "contact_urls" } = env;
  const results = { restStatus: null, healthStatus: null };

  if (!SUPABASE_URL) {
    console.error("SUPABASE_URL secret is not set. Run: wrangler secret put SUPABASE_URL");
    return { ok: false, ...results };
  }

  // 1) Real Postgres query through PostgREST.
  //    200 = query executed (RLS-filtered results still return 200 []).
  //    404 = table missing or not exposed to `anon` (missing GRANT on new
  //    Supabase projects) — logged here, not fatal thanks to the fallback.
  if (SUPABASE_ANON_KEY) {
    const path = `/rest/v1/${KEEPALIVE_TABLE}?select=id&limit=1`;
    try {
      const res = await fetch(`${SUPABASE_URL}${path}`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      results.restStatus = res.status;
      console.log(`PostgREST ping on "${KEEPALIVE_TABLE}" → HTTP ${res.status}`);
      await res.text(); // consume body so the connection is reusable
    } catch (err) {
      console.error("PostgREST ping failed:", err);
    }
  } else {
    console.warn("SUPABASE_ANON_KEY not set — skipping the PostgREST ping, health endpoint only.");
  }

  // 2) Health endpoint fallback.
  //    Supabase requires the publishable key even on /auth/v1/health (no key
  //    → 401), so send it when available. Still a useful second signal.
  try {
    const headers = SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {};
    const res = await fetch(`${SUPABASE_URL}${HEALTH_PATH}`, { headers });
    results.healthStatus = res.status;
    console.log(`Health ping → HTTP ${res.status}`);
    await res.text();
  } catch (err) {
    console.error("Health ping failed:", err);
  }

  return {
    ok: results.restStatus === 200 || results.healthStatus === 200,
    ...results,
  };
}

/**
 * Same-origin JSON-RPC proxy (Vercel serverless).
 *
 * The public Robinhood RPC sends a malformed CORS header
 * (`Access-Control-Allow-Origin: *,*`), so browsers block direct calls to it.
 * The frontend talks to this endpoint instead (same origin → no CORS), and we
 * forward server-side where CORS doesn't apply.
 *
 * Upstream defaults to the official Robinhood RPC — it works fine server-side
 * (the CORS bug is browser-only, which this proxy sidesteps). Override with
 * RPC_UPSTREAM on Vercel for a dedicated provider (Alchemy/dRPC key URL) to
 * raise limits. A short warm-instance cache absorbs duplicate read bursts so
 * many concurrent visitors don't each hit upstream for the same data.
 */
const UPSTREAM = process.env.RPC_UPSTREAM || "https://rpc.mainnet.chain.robinhood.com";
const CACHE_TTL_MS = 4000;

// Module scope persists across invocations on a warm Vercel instance.
const cache = new Map<string, { at: number; status: number; body: string }>();

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-methods", "POST, OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type");
    return res.status(204).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});

  // Cache only read-shaped payloads (no eth_sendRawTransaction etc.)
  const cacheable = !raw.includes("eth_send") && !raw.includes("eth_estimateGas");
  const key = raw;
  if (cacheable) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      res.setHeader("content-type", "application/json");
      res.setHeader("access-control-allow-origin", "*");
      res.setHeader("x-rig-cache", "hit");
      return res.status(hit.status).send(hit.body);
    }
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw,
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));
    const body = await upstream.text();
    if (cacheable && upstream.ok) {
      cache.set(key, { at: Date.now(), status: upstream.status, body });
      if (cache.size > 500) cache.clear(); // crude bound
    }
    res.setHeader("content-type", "application/json");
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("cache-control", "no-store");
    return res.status(upstream.status).send(body);
  } catch {
    return res.status(502).json({ error: "rpc proxy upstream failed" });
  }
}

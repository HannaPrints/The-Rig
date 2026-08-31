/**
 * Same-origin JSON-RPC proxy (Vercel serverless).
 *
 * The public Robinhood RPC sends a malformed CORS header
 * (`Access-Control-Allow-Origin: *,*`), so browsers block direct calls to it.
 * The frontend talks to this endpoint instead (same origin → no CORS), and we
 * forward to the real RPC server-side where CORS doesn't apply.
 *
 * Set RPC_UPSTREAM on Vercel to a dedicated provider (Alchemy/dRPC) for
 * production throughput; defaults to the public endpoint.
 */
const UPSTREAM = process.env.RPC_UPSTREAM || "https://rpc.mainnet.chain.robinhood.com";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-methods", "POST, OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type");
    return res.status(204).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const text = await upstream.text();
    res.setHeader("content-type", "application/json");
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("cache-control", "no-store");
    return res.status(upstream.status).send(text);
  } catch (e) {
    return res.status(502).json({ error: "rpc proxy upstream failed" });
  }
}

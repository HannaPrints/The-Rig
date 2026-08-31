/**
 * The Rig — mint-permit signer.
 *
 * Issues the EIP-712 MintPermit the Shop requires. Two jobs in one signature:
 *   1. Bot gate: permits are only handed out from behind this service (add your
 *      CAPTCHA / Turnstile / proof-of-humanity check in `passesBotCheck`).
 *   2. Committed randomness: the `seed` in the permit is generated here BEFORE
 *      the mint executes; tiers derive on-chain from keccak(seed, minter, serial),
 *      so neither the site nor the miner can steer the roll after the fact.
 *
 * Never reuse the shop owner key here — SIGNER_PK should be a dedicated hot key
 * that can be rotated on-chain via Shop.setSigner if it ever leaks.
 */
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { randomBytes } from "node:crypto";
import { isAddress, bytesToHex, bytesToBigInt } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { env, robinhoodChain } from "./config.js";

const account = privateKeyToAccount(env.signerPk());
const shop = env.shopAddress();

const MAX_PER_TX = 8;
const COOLDOWN_MS = 30_000; // mirror the on-chain wallet cooldown

const lastIssued = new Map<string, number>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const last = lastIssued.get(key) ?? 0;
  if (now - last < COOLDOWN_MS) return true;
  lastIssued.set(key, now);
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function passesBotCheck(_req: Request): Promise<boolean> {
  // TODO: wire Cloudflare Turnstile / hCaptcha token verification here before mint.
  return true;
}

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true, signer: account.address, shop }));

app.post("/permit", async (c) => {
  const body = await c.req.json<{ to?: string; qty?: number }>().catch(() => null);
  const to = body?.to;
  const qty = body?.qty ?? 1;

  if (!to || !isAddress(to)) return c.json({ error: "invalid address" }, 400);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_PER_TX) {
    return c.json({ error: `qty must be 1..${MAX_PER_TX}` }, 400);
  }
  if (!(await passesBotCheck(c.req.raw))) return c.json({ error: "bot check failed" }, 403);

  const ip = c.req.header("x-forwarded-for") ?? "local";
  if (rateLimited(to.toLowerCase()) || rateLimited(`ip:${ip}`)) {
    return c.json({ error: "cooldown, try again shortly" }, 429);
  }

  const seed = bytesToHex(randomBytes(32)); // the committed randomness
  const nonce = bytesToBigInt(randomBytes(32)); // burned on-chain on use
  const deadline = BigInt(Math.floor(Date.now() / 1000) + env.permitTtlSeconds);

  const signature = await account.signTypedData({
    domain: {
      name: "TheRigShop",
      version: "1",
      chainId: robinhoodChain.id,
      verifyingContract: shop,
    },
    types: {
      MintPermit: [
        { name: "to", type: "address" },
        { name: "qty", type: "uint256" },
        { name: "seed", type: "bytes32" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "MintPermit",
    message: { to, qty: BigInt(qty), seed: seed as `0x${string}`, nonce, deadline },
  });

  return c.json({
    to,
    qty,
    seed,
    nonce: nonce.toString(),
    deadline: deadline.toString(),
    signature,
  });
});

serve({ fetch: app.fetch, port: env.signerPort }, (info) => {
  console.log(`[signer] ${account.address} issuing permits for shop ${shop} on :${info.port}`);
});

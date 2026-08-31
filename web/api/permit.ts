/**
 * Mint-permit signer as a Vercel serverless function — deploys with the site,
 * served same-origin at /api/permit. One env var required on Vercel: SIGNER_PK
 * (the dedicated permit hot key; rotate on-chain via Shop.setSigner if it leaks).
 *
 * The permit is the bot gate AND the committed tier randomness: the seed is
 * generated here before the mint executes, tiers derive on-chain from
 * keccak(seed, minter, serial), and the on-chain nonce burn prevents replay.
 */
import { randomBytes } from "node:crypto";
import { isAddress, bytesToHex, bytesToBigInt } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const SHOP = (process.env.SHOP_ADDRESS ?? "0x7aa6c2a24834d86E153155ac12C99FA622A41Cd6") as `0x${string}`;
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 4663);
const MAX_PER_TX = 50; // the Shop's gas bound — not a rate limit
const PERMIT_TTL_SECONDS = 300;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const pk = process.env.SIGNER_PK as `0x${string}` | undefined;
  if (!pk) return res.status(500).json({ error: "signer not configured" });

  const to = req.body?.to as string | undefined;
  const qty = Number(req.body?.qty ?? 1);
  if (!to || !isAddress(to)) return res.status(400).json({ error: "invalid address" });
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_PER_TX) {
    return res.status(400).json({ error: `qty must be 1..${MAX_PER_TX}` });
  }
  // TODO: wire Cloudflare Turnstile / hCaptcha verification here.

  const account = privateKeyToAccount(pk);
  const seed = bytesToHex(randomBytes(32)); // committed randomness
  const nonce = bytesToBigInt(randomBytes(32)); // burned on-chain on use
  const deadline = BigInt(Math.floor(Date.now() / 1000) + PERMIT_TTL_SECONDS);

  const signature = await account.signTypedData({
    domain: { name: "TheRigShop", version: "1", chainId: CHAIN_ID, verifyingContract: SHOP },
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

  return res.status(200).json({
    to,
    qty,
    seed,
    nonce: nonce.toString(),
    deadline: deadline.toString(),
    signature,
  });
}

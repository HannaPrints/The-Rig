const addr = (v: string | undefined, fallback: `0x${string}`) =>
  v && /^0x[0-9a-fA-F]{40}$/.test(v) ? (v as `0x${string}`) : fallback;

/** LIVE on Robinhood Chain mainnet since 2026-08-31 — these addresses are
 *  immutable, so they're baked in as defaults (env can still override). */
export const addresses = {
  shop: addr(import.meta.env.VITE_SHOP_ADDRESS, "0x7aa6c2a24834d86E153155ac12C99FA622A41Cd6"),
  rig: addr(import.meta.env.VITE_RIG_ADDRESS, "0x95C29bC5b83b662b335094E468911192DbBa0088"),
  card: addr(import.meta.env.VITE_CARD_ADDRESS, "0xA35eC0E14fB2b325CcA9EB0Caf3E9CBDB1A8ACB6"),
  gpu: addr(import.meta.env.VITE_GPU_ADDRESS, "0x3Da22F970a0a048d3830fDE22b94017B83a3802E"),
};

/** Empty = same-origin serverless function at /api/permit (ships with the site). */
export const signerUrl: string = import.meta.env.VITE_SIGNER_URL ?? "";
export const permitEndpoint = signerUrl ? `${signerUrl}/permit` : "/api/permit";

export const deployed = true;

export const openSeaUrl = `https://opensea.io/assets/robinhood/${addresses.card.toLowerCase()}`;

export const links = {
  openSea: openSeaUrl,
  github: "https://github.com/HannaPrints/The-Rig",
  docs: "https://github.com/HannaPrints/The-Rig/blob/main/docs/DEEPDIVE.md",
  explorer: "https://robinhoodchain.blockscout.com",
  x: "https://x.com/TheRigRH",
  site: "https://www.therig.sh",
};

export const TIERS = [
  { name: "Spud GT 210", rarity: "Common", mh: 10, odds: "52%", color: "#9fb4a6" },
  { name: "Miner MX 450", rarity: "Uncommon", mh: 25, odds: "26%", color: "#3ce97e" },
  { name: "Volt VX 3060", rarity: "Rare", mh: 60, odds: "13%", color: "#5db2ff" },
  { name: "Blaze BZ 4080", rarity: "Epic", mh: 150, odds: "7%", color: "#c77dff" },
  { name: "Quantum QX 9090", rarity: "Legendary", mh: 400, odds: "2%", color: "#f0a850" },
  { name: "Singularity ∞", rarity: "Mythic", mh: 1000, odds: "fusion only", color: "#ff6b6b" },
  { name: "???", rarity: "Forged", mh: 2500, odds: "fusion only", color: "#ffffff" },
] as const;

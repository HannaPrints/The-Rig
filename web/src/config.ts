const addr = (v: string | undefined) =>
  v && /^0x[0-9a-fA-F]{40}$/.test(v) ? (v as `0x${string}`) : undefined;

/** Contract addresses land here after the Robinhood Chain deployment. Until then the
 *  site runs in pre-launch mode: every counter reads zero, exactly like day zero. */
export const addresses = {
  shop: addr(import.meta.env.VITE_SHOP_ADDRESS),
  rig: addr(import.meta.env.VITE_RIG_ADDRESS),
  card: addr(import.meta.env.VITE_CARD_ADDRESS),
  gpu: addr(import.meta.env.VITE_GPU_ADDRESS),
};

export const signerUrl: string = import.meta.env.VITE_SIGNER_URL ?? "";

export const deployed = Boolean(addresses.shop && addresses.rig);

export const TIERS = [
  { name: "Spud GT 210", rarity: "Common", mh: 10, odds: "52%", color: "#9fb4a6" },
  { name: "Miner MX 450", rarity: "Uncommon", mh: 25, odds: "26%", color: "#3dff88" },
  { name: "Volt VX 3060", rarity: "Rare", mh: 60, odds: "13%", color: "#5db2ff" },
  { name: "Blaze BZ 4080", rarity: "Epic", mh: 150, odds: "7%", color: "#c77dff" },
  { name: "Quantum QX 9090", rarity: "Legendary", mh: 400, odds: "2%", color: "#ffb454" },
  { name: "Singularity ∞", rarity: "Mythic", mh: 1000, odds: "fusion only", color: "#ff5d5d" },
  { name: "???", rarity: "Forged", mh: 2500, odds: "fusion only", color: "#ffffff" },
] as const;

const ITEMS = [
  "70% OF EVERY MINT AND UPGRADE BUYS $GPU FOR MINERS",
  "ONE STREAM · EVERY SECOND · PRO-RATA BY HASHRATE",
  "12,500 $GPU BURNED PER MINT",
  "NO COOLDOWNS · NO CAPS · MINT AS MANY AS YOU WANT",
  "FUSION ONLY SHRINKS THE SUPPLY",
  "THE RIG HAS NO OWNER",
  "30% OF TRADING FEES → MINER BUYBACKS",
];

export function Ticker() {
  const line = ITEMS.join("   ·   ") + "   ·   ";
  return (
    <div className="overflow-hidden border-y border-line bg-panel py-2.5">
      <div className="ticker-track num flex w-max whitespace-nowrap text-[11px] tracking-[0.18em] text-amber/80">
        <span>{line}</span>
        <span>{line}</span>
      </div>
    </div>
  );
}

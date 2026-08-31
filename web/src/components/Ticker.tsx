const ITEMS = [
  "70% OF EVERY MINT BUYS $GPU FOR MINERS",
  "ONE STREAM · EVERY SECOND · PRO-RATA BY HASHRATE",
  "12,500 $GPU BURNED PER MINT",
  "FUSION ONLY SHRINKS THE SUPPLY",
  "THE RIG HAS NO OWNER",
  "70% OF POOL FEES → BUYBACKS · FOREVER",
  "A SELLOUT TAKES 25+ HOURS · MATHEMATICALLY",
];

export function Ticker() {
  const line = ITEMS.join("  ▸  ") + "  ▸  ";
  return (
    <div className="overflow-hidden border-y border-grid py-2">
      <div className="ticker-track flex w-max whitespace-nowrap text-xs tracking-widest text-amber">
        <span className="glow-amber">{line}</span>
        <span className="glow-amber">{line}</span>
      </div>
    </div>
  );
}

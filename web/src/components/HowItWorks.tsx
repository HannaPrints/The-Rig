const STEPS = [
  {
    n: "01",
    title: "MINT",
    body: "A card costs $5 and burns 12,500 $GPU from your wallet. Tier odds are fixed; the roll is committed before your transaction lands.",
  },
  {
    n: "02",
    title: "PLUG IN",
    body: "Slot cards into your rig — 4 slots free, up to 52 with racks. Staked cards earn every second, pro-rata by hashrate.",
  },
  {
    n: "03",
    title: "MINE",
    body: "70% of every mint and fee — and 70% of $GPU's own trading fees — buys $GPU on the open market and streams it to miners over 12-hour windows.",
  },
  {
    n: "04",
    title: "CLIMB",
    body: "Claim any time. Overclock for +20% per level. Fuse two identical cards into the next tier and concentrate power as supply shrinks.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-12">
      <h2 className="panel-title mb-6 text-sm">▚ HOW IT WORKS</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="panel p-4">
            <div className="glow-amber text-xs text-amber">{s.n}</div>
            <div className="mt-2 text-sm font-bold tracking-widest text-phosphor">{s.title}</div>
            <p className="mt-3 text-xs leading-6 text-ink">{s.body}</p>
          </div>
        ))}
      </div>
      <div className="panel mt-6 p-4 text-center text-xs tracking-wider text-phosphor-dim">
        burn $GPU → mint → slot in → mine $GPU → claim → spend into upgrades → mine harder
      </div>
    </section>
  );
}

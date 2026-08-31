const STEPS = [
  {
    n: "01",
    title: "Mint",
    body: "A card costs $5 and burns 12,500 $GPU from your wallet. No cooldowns, no hourly caps — mint as many as you want. Tier odds are fixed and the roll is committed before your transaction lands.",
  },
  {
    n: "02",
    title: "Plug in",
    body: "Slot cards into your rig — 4 slots free, up to 52 with racks. Staked cards earn every second, pro-rata by hashrate, and the stream pauses when the rig is empty.",
  },
  {
    n: "03",
    title: "Mine",
    body: "70% of every mint and upgrade — plus 30% of $GPU's own trading fees — buys $GPU on the open market and streams it to miners over rolling 12-hour windows.",
  },
  {
    n: "04",
    title: "Climb",
    body: "Claim any time. Overclock for +20% hashrate per level. Fuse two identical cards into the next tier — the collection only ever shrinks, and power concentrates.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <h2 className="mb-10 text-xl font-bold tracking-tight">How it works</h2>
      <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n}>
            <div className="ghost-num">{s.n}</div>
            <h3 className="mt-3 text-[15px] font-semibold text-accent">{s.title}</h3>
            <p className="mt-2.5 text-[13px] leading-6 text-muted">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="panel mt-14 overflow-x-auto">
        <div className="flex min-w-[720px] items-stretch">
          <div className="flex-1 border-r border-line p-5">
            <div className="label mb-3 text-ink">money in</div>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted">mints · overclocks · fusions · racks</span>
                <span className="num text-accent">70% ↓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">$GPU trading fees (Pons)</span>
                <span className="num text-accent">30% ↓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">secondary royalties</span>
                <span className="num text-accent">70% ↓</span>
              </div>
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-center border-r border-line p-5">
            <div className="label mb-2 text-ink">the vault</div>
            <p className="text-[13px] leading-6 text-muted">
              Everything lands in the BuybackVault. Its keeper has exactly one privilege: buy $GPU on
              the open market. No withdraw function exists.
            </p>
          </div>
          <div className="flex flex-1 flex-col justify-center p-5">
            <div className="label mb-2 text-ink">the stream</div>
            <p className="text-[13px] leading-6 text-muted">
              Bought $GPU drips to every staked card over 12-hour windows —{" "}
              <span className="text-ink">your rate = stream × your MH ÷ network MH</span>. Claim
              whenever you like.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

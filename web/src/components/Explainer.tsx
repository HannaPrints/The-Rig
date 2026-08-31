const FLOWS = [
  { source: "Card mints ($5 each)", miners: "70%", treasury: "30%", note: "buys $GPU on the open market" },
  { source: "Overclocks · fusions · racks", miners: "70%", treasury: "30%", note: "same split, every fee" },
  { source: "$GPU trading fees (creator share)", miners: "30%", treasury: "70%", note: "harvested from escrow" },
  { source: "Secondary royalties (5% of sales)", miners: "70%", treasury: "30%", note: "ownerless router, hardcoded" },
  { source: "Burn gate (12,500 $GPU per mint)", miners: "—", treasury: "—", note: "burned forever, benefits every holder" },
];

export function Explainer() {
  return (
    <section id="explainer" className="mx-auto max-w-6xl px-5 py-16">
      <h2 className="text-xl font-bold tracking-tight">Where the money actually goes</h2>
      <p className="mt-2 max-w-xl text-[13px] leading-6 text-muted">
        No hidden emissions, no team allocation, no unlock schedule. Every flow is on-chain and most
        of them are hardcoded into contracts nobody owns.
      </p>

      <div className="panel mt-8 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line">
              <th className="label px-5 py-3.5 font-normal">flow</th>
              <th className="label px-5 py-3.5 text-right font-normal">miners' pot</th>
              <th className="label px-5 py-3.5 text-right font-normal">treasury</th>
              <th className="label hidden px-5 py-3.5 font-normal sm:table-cell">what happens</th>
            </tr>
          </thead>
          <tbody>
            {FLOWS.map((f) => (
              <tr key={f.source} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-3.5 text-ink">{f.source}</td>
                <td className="num px-5 py-3.5 text-right text-accent">{f.miners}</td>
                <td className="num px-5 py-3.5 text-right text-amber">{f.treasury}</td>
                <td className="hidden px-5 py-3.5 text-muted sm:table-cell">{f.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <div className="label mb-3 text-accent">why the yield is real</div>
          <p className="text-[13px] leading-6 text-muted">
            Miners aren't paid from an emissions schedule — there isn't one. The pot buys $GPU on the
            open market with ETH that other players actually spent, then streams it to staked cards.
            Payouts are <span className="text-ink">purchases, not promises</span>: the rig never owes
            anyone a fixed return, which is exactly why it can never go insolvent.
          </p>
        </div>
        <div className="panel p-5">
          <div className="label mb-3 text-accent">and when it isn't</div>
          <p className="text-[13px] leading-6 text-muted">
            The same math cuts both ways: if minting, upgrading, and trading slow down, the stream
            thins. Nobody can print tokens to fake a yield — earnings float with real activity, up
            and down. <span className="text-ink">Never treat any of it as guaranteed.</span>
          </p>
        </div>
        <div className="panel p-5">
          <div className="label mb-3 text-accent">the deflation engine</div>
          <p className="text-[13px] leading-6 text-muted">
            Every mint burns 12,500 $GPU — a full mint torches{" "}
            <span className="num text-ink">125,000,000</span>, 12.5% of everything that will ever
            exist. And fusion retires two cards to forge one, so the collection itself only ever
            shrinks while power concentrates.
          </p>
        </div>
      </div>
    </section>
  );
}

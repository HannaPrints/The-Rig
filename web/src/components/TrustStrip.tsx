const ITEMS = [
  {
    title: "The rig has no owner",
    body: "No pause switch, no parameter changes, no withdraw function. Once cards are staked, no key on earth can touch them.",
  },
  {
    title: "The keeper can only buy",
    body: "One privilege: convert the pot into $GPU on the open market, bounded by a minimum output and verified by balance delta. It cannot pay itself.",
  },
  {
    title: "Randomness is committed",
    body: "Your tier roll is sealed inside the signed mint permit before your transaction exists. Reproducible by anyone, riggable by no one.",
  },
];

export function TrustStrip() {
  return (
    <section className="border-y border-line bg-panel">
      <div className="mx-auto grid max-w-6xl gap-x-10 gap-y-8 px-5 py-12 md:grid-cols-3">
        {ITEMS.map((it) => (
          <div key={it.title}>
            <h3 className="text-[15px] font-semibold text-ink">{it.title}</h3>
            <p className="mt-2.5 text-[13px] leading-6 text-muted">{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

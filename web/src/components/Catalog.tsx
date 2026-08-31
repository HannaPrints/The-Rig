import { TIERS } from "../config";

export function Catalog() {
  return (
    <section id="cards" className="py-12">
      <h2 className="panel-title mb-2 text-sm">▚ THE CARDS</h2>
      <p className="mb-6 text-xs text-ink">
        every mint rolls a tier from randomness committed before your transaction. fuse two
        identical cards into the next tier — the collection only ever shrinks.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((t) => (
          <div key={t.name} className="panel group p-4 transition hover:border-phosphor">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] tracking-widest" style={{ color: t.color }}>
                {t.rarity.toUpperCase()}
              </span>
              <span className="text-[10px] text-phosphor-dim">{t.odds}</span>
            </div>
            <div className="mt-3 text-sm font-bold text-ink group-hover:text-phosphor">{t.name}</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="glow text-xl text-phosphor">{t.mh.toLocaleString()}</span>
              <span className="text-[10px] text-phosphor-dim">MH/s</span>
            </div>
            <div className="mt-3 h-1 w-full bg-grid">
              <div
                className="h-1"
                style={{ width: `${Math.min(100, (t.mh / 2500) * 100)}%`, background: t.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
